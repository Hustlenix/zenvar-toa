/*
 * ZENVAR · TOA-01 · MEMBER ASSISTANT CORE
 *
 * The brain behind the member assistant panel (assistant.html).
 *
 * Three working modes, all served out of the box by a deterministic provider
 * grounded in corpus.js — no model required to run:
 *
 *   1. TOA Q&A        — answer questions from the actual agreement + roles.
 *   2. Report Draft   — walk the signed-in member through their role's
 *                       weekly gauges and draft the update in the
 *                       "numbers over feelings" format.
 *   3. General        — a clearly-labeled assistant for anything else.
 *
 * PROVIDER SEAM
 *   All reasoning goes through window.ZENVAR_ASSIST.provider. The default
 *   DeterministicProvider needs no network and always reports whether it
 *   answered from the grounded corpus or honestly said "not covered".
 *
 *   To wire a real LLM LATER (Supabase Edge Function → 9Router, or any
 *   OpenAI-compatible endpoint), call:
 *       ZENVAR_ASSIST.setProvider({ respond: async function(ctx){ ... } })
 *   and the whole UI upgrades. The corpus becomes the retrieval context
 *   passed to the model. No page markup changes needed.
 *
 * Security: this file runs only on member-gated pages (auth.js). It never
 * holds a model/API key — any future provider must keep its key server-side.
 */
(function () {
  "use strict";

  var CORPUS = window.ZENVAR_CORPUS || {};

  // ─────────────────────────────────────────────
  // ESCAPE (XSS-safe rendering of user + corpus text)
  // ─────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ─────────────────────────────────────────────
  // IDENTITY — map a signed-in email to a corpus member.
  // Auth is not activated on the live site yet; when it is, the email used
  // by the provision script matches these. Unknown email → nobody.
  // ─────────────────────────────────────────────
  var EMAIL_TO_MEMBER = {
    "lalith@zenvar.co": "Lalith",
    "darmigan@zenvar.co": "Darmigan",
    "charvesh@zenvar.co": "Charvesh",
    "hari@zenvar.co": "Hari",
    "noel@zenvar.co": "Noel",
    "shanjay@zenvar.co": "Shanjay",
    "hemanathan@zenvar.co": "Hemanathan",
    "sheryan@zenvar.co": "Sheryan"
  };

  function memberForEmail(email) {
    if (!email) return null;
    var e = String(email).trim().toLowerCase();
    return EMAIL_TO_MEMBER[e] || null;
  }

  // ─────────────────────────────────────────────
  // TOKENISER + similarity — naive but reliable prefix/word matching.
  // Enough for deterministic search over a small curated corpus.
  // ─────────────────────────────────────────────
  var STOP = new Set([
    "a","an","the","of","to","for","and","or","is","are","was","were","do","does",
    "did","what","what's","whats","how","i","my","me","we","our","it","its","in",
    "on","at","that","this","these","those","with","from","by","about","can","cant",
    "should","tell","me","who","why","when","where","which","have","has","be","m","s","re"
  ]);

  function tokens(text) {
    var t = String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ");
    var out = [];
    for (var i = 0; i < t.length; i++) {
      var w = t[i];
      if (w && !STOP.has(w)) out.push(w);
    }
    return out;
  }

  function scoreTokens(qt, target) {
    var tt = tokens(target);
    if (!tt.length) return 0;
    var hit = 0;
    for (var i = 0; i < qt.length; i++) {
      for (var j = 0; j < tt.length; j++) {
        if (tt[j].indexOf(qt[i]) === 0 || qt[i].indexOf(tt[j]) === 0) { hit++; break; }
      }
    }
    return hit;
  }

  // ─────────────────────────────────────────────
  // GROUNDED ANSWER HELPERS
  // ─────────────────────────────────────────────
  function sectionAnswers() {
    // Build a flat list of (keywords-joined text, section label) for matching.
    var items = [];
    function add(label, text) {
      items.push({ label: label, text: text });
    }
    add("SCOPE / LINES OF SUPPLY", CORPUS.company.framing);
    (CORPUS.checks || []).forEach(function (c) {
      add("OPERATING CHECK " + c.id + " · " + c.title, c.id + ". " + c.title + ". " + c.text);
    });
    (CORPUS.procedure || []).forEach(function (p) {
      add("PROCEDURE · " + p.id, p.id + ". " + p.text);
    });
    add("INSPECTION · WEEKLY REVIEW", CORPUS.inspection ? CORPUS.inspection.cycle : "");
    (CORPUS.approvals || []).forEach(function (a) {
      add("APPROVALS · " + a.ref, a.ref + ". " + a.text);
    });
    (CORPUS.culture || []).forEach(function (line, i) {
      add("CULTURE · LINE " + (i + 1),  "CULTURE · " + line);
    });
    return items;
  }

  function findRole(nameOrQuery) {
    var q = String(nameOrQuery || "").toLowerCase();
    var roles = CORPUS.roles || [];
    for (var i = 0; i < roles.length; i++) {
      if (roles[i].member.toLowerCase() === q) return roles[i];
    }
    // fuzzy: match by first name inside query, or by title keyword
    var best = null, bestScore = 0;
    for (var j = 0; j < roles.length; j++) {
      var hay = roles[j].member.toLowerCase() + " " + roles[j].title.toLowerCase();
      var sc = 0;
      var qt = tokens(q);
      for (var k = 0; k < qt.length; k++) if (hay.indexOf(qt[k]) !== -1) sc++;
      if (sc > bestScore) { bestScore = sc; best = roles[j]; }
    }
    return bestScore > 0 ? best : null;
  }

  function roleSummary(role) {
    var parts = [
      "Item " + role.item + " · " + role.member + " · " + role.title,
      "Weekly owner metric: " + role.metric
    ];
    if (role.reportsTo && role.reportsTo !== "—") parts.push("Reports to: " + role.reportsTo);
    if (role.coLead) parts.push("Co-lead: " + role.coLead);
    if (role.duties && role.duties.length) {
      parts.push("Primary duties:");
      role.duties.forEach(function (d) {
        parts.push("  " + d.name + " — " + d.text);
      });
    } else {
      parts.push("Role detail is on the live page (item " + role.item + "). Should I read it for you?");
    }
    if (role.gauges && role.gauges.length) {
      parts.push("Weekly review gauges:");
      role.gauges.forEach(function (g, i) { parts.push("  GAUGE " + (i + 1) + " — " + g); });
    }
    return parts.join("\n");
  }

  // ─────────────────────────────────────────────
  // MODE 1 — GROUNDED TOA Q&A
  // ─────────────────────────────────────────────
  function answerTOA(question, myName) {
    var ql = String(question || "").toLowerCase();
    var qt = tokens(ql);

    // Role questions first (most specific).
    var role = findRole(ql);
    if (role) {
      var myTag = myName && myName === role.member ? " (that's you!)" : "";
      return {
        kind: "grounded",
        source: "CORPUS · ROLE ITEM " + role.item + " · " + role.member.toUpperCase(),
        text: "Here's the spec for **" + role.member + "**" + myTag + ":\n\n" + roleSummary(role)
      };
    }

    // Section / concept matching over the rest of the corpus.
    var items = sectionAnswers();
    var bestItem = null, bestScore = 0;
    for (var i = 0; i < items.length; i++) {
      var s = scoreTokens(qt, items[i].label + " " + items[i].text);
      if (s > bestScore) { bestScore = s; bestItem = items[i]; }
    }
    if (bestItem && bestScore >= 2) {
      return {
        kind: "grounded",
        source: "CORPUS · " + bestItem.label,
        text: bestItem.text
      };
    }

    // "who is the CEO" / pipeline / handoff niceties
    if (/who.{0,12}(founder|ceo|boss)/.test(ql)) {
      var hema = findRole("hemanathan");
      return { kind: "grounded", source: "CORPUS · PARTS LIST · ITEM 07", text: hema ? roleSummary(hema) : "Hemanathan is the Founder / CEO." };
    }

    // Not covered — honest refusal, don't invent.
    return {
      kind: "uncovered",
      source: "CORPUS",
      text: "That's not in the TOA-01 corpus I'm grounded on, so I won't guess. I can answer from the signed agreement (checks, procedure, inspection gauges, culture, approvals) and the 8 member roles. Ask me about a member by name, a role, or a section — or use REPORT DRAFT to build your weekly update."
    };
  }

  // ─────────────────────────────────────────────
  // MODE 2 — REPORT DRAFT (numbers over feelings)
  // ─────────────────────────────────────────────
  function draftReport(myName) {
    if (!myName) {
      return {
        kind: "notice",
        source: "REPORT DRAFT",
        text: "I can't detect which member you are yet — auth isn't activated on the live site, so I don't know who's signed in. Once the member sign-in is on, I'll auto-fill your role. For now, tell me your name (e.g. \u201CI'm Lalith\u201D) or ask \u201Cwho am I\u201D and I'll draft it for that role."
      };
    }
    var role = findRole(myName);
    if (!role) {
      return { kind: "notice", source: "REPORT DRAFT", text: "I couldn't find " + myName + " in the member list. Ask me to list the members." };
    }

    var lines = [];
    lines.push("WEEKLY UPDATE DRAFT — " + role.member.toUpperCase() + " (" + role.title + ")");
    lines.push("Weekly metric: " + role.metric);
    lines.push("");
    lines.push("Answer these three to fill the draft (numbers over feelings — bring the count, not the vibe):");
    lines.push("");
    if (role.gauges && role.gauges.length) {
      role.gauges.forEach(function (g, i) {
        lines.push((i + 1) + ". " + g + " → [your number / outcome this week]");
        if (i === 1) lines.push("   e.g. value delivered, and the % toward target.");
      });
    } else {
      lines.push("1. Work completed against what was assigned → [what shipped]");
      lines.push("2. Weekly metric: " + role.metric + " → [the number]");
    }
    lines.push("3. One blocker or bottleneck that slowed the work → [name it]");
    lines.push("");
    lines.push("Then change the system: what will you adjust so next week ships faster?");
    lines.push("");
    lines.push("Reminder (TOA-01 §05): \u201CI worked on it\u201D is not an update. Bring the exact count and the verified outcome.");

    return { kind: "grounded", source: "REPORT DRAFT · ITEM " + role.item + " · " + role.member.toUpperCase(), text: lines.join("\n") };
  }

  // ─────────────────────────────────────────────
  // MODE 3 — GENERAL
  // ─────────────────────────────────────────────
  function answerGeneral(q) {
    var ql = String(q || "").toLowerCase();

    // Small deterministic pockets of real value before falling back to "model not wired".
    if (/list.{0,10}(members|roles|team)/.test(ql) || (ql.indexOf("members") !== -1 && ql.indexOf("who") !== -1)) {
      var members = (CORPUS.roles || []).map(function (r) {
        return "Item " + r.item + " · " + r.member + " · " + r.title + " · metric: " + r.metric;
      }).join("\n");
      return { kind: "grounded", source: "CORPUS · PARTS LIST", text: "The eight members of Zenvar TOA-01:\n\n" + members };
    }
    if (/how.{0,15}report/.test(ql) || ql.indexOf("report") !== -1) {
      return {
        kind: "grounded",
        source: "REPORT DRAFT",
        text: "I can draft your weekly report. Switch to mode REPORT DRAFT and tell me your role, and I'll walk you through the gauges. Short version (TOA-01): ship → bring the exact numbers → name the blocker → change the system."
      };
    }

    return {
      kind: "model_pending",
      source: "MODEL PROVIDER NOT WIRED",
      text: "This is the GENERAL assistant — anything you like. Right now it runs on the built-in grounded engine (no model key needed), so it answers from the TOA and roles. The model-backed brain is the next step: it slots in behind the same interface without changing this page. Until then, I'm happy to help with TOA questions (\u201Cwhat are the operating checks?\u201D), role specs (\u201Cwhat does Noel do?\u201D), or your weekly report (\u201Cdraft my report\u201D)."
    };
  }

  // ─────────────────────────────────────────────
  // PROVIDER INTERFACE + DEFAULT (deterministic)
  // ─────────────────────────────────────────────
  function DeterministicProvider() {}

  // ctx: { text, mode, myName }
  DeterministicProvider.prototype.respond = function (ctx) {
    var mode = ctx.mode;
    if (mode === "report") {
      return { ok: true, answer: draftReport(ctx.myName) };
    }
    if (mode === "general") {
      return { ok: true, answer: answerGeneral(ctx.text) };
    }
    // default & "toa" → grounded Q&A; also funnel report-ish prompts.
    if (/draft|weekly (update|report)|report card/i.test(ctx.text)) {
      return { ok: true, answer: draftReport(ctx.myName) };
    }
    return { ok: true, answer: answerTOA(ctx.text, ctx.myName) };
  };

  var registered = new DeterministicProvider();

  function setProvider(p) {
    if (p && typeof p.respond === "function") registered = p;
  }

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────
  window.ZENVAR_ASSIST = {
    esc: esc,
    memberForEmail: memberForEmail,
    findRole: findRole,
    roleSummary: roleSummary,
    setProvider: setProvider,
    respond: function (ctx) {
      var c = ctx || {};
      var mode = c.mode || "toa";
      var myName = c.myName || memberForEmail(c.email) || null;
      var res = registered.respond({ text: c.text || "", mode: mode, myName: myName });
      // Ensure a safe shape → [ {role, text, source, kind} ] rendering list
      var answer = (res && res.ok) ? res.answer : { kind: "uncovered", text: "The assistant could not respond right now. Try again." };
      return answer;
    }
  };
})();
