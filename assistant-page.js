/*
 * ZENVAR · TOA-01 · ASSISTANT PAGE CONTROLLER
 *
 * Binds the assistant.html UI to the ZENVAR_ASSIST core. Handles:
 *   - render of user/assistant messages (escaped — XSS-safe)
 *   - mode switching (TOA Q&A / REPORT DRAFT / GENERAL)
 *   - identity so REPORT DRAFT can auto-fill the member's role
 *   - minimal markdown-ish rendering (**bold**, line breaks)
 *
 * Identity: reads the Supabase session email if auth is live; also accepts
 * "I'm <name>" in chat so report drafting works even before auth activates.
 * Loading order on the page: corpus.js → assist.js → this file.
 */
(function () {
  "use strict";

  var A = window.ZENVAR_ASSIST;
  if (!A) { console.warn("Zenvar assist: core not loaded."); return; }

  var logEl = document.getElementById("assist-log");
  var formEl = document.getElementById("assist-form");
  var textEl = document.getElementById("assist-text");
  var sendBtn = document.getElementById("assist-send");
  var sourceTag = document.getElementById("assist-source-tag");
  var modeEls = Array.prototype.slice.call(document.querySelectorAll(".assist-mode"));

  var mode = "toa";
  var memberName = null; // resolved identity

  // ── Markdown-ish renderer (safe: escapes all input first) ──
  function renderInline(s) {
    // escape, then bold **...**
    var esc = A.esc(s);
    esc = esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return esc;
  }

  function addMessage(role, text, source) {
    var wrap = document.createElement("div");
    wrap.className = "assist-msg " + (role === "user" ? "u" : "a");

    var meta = document.createElement("div");
    meta.className = "m-meta";
    meta.textContent = (role === "user" ? "YOU" : "ASSISTANT") +
      (source ? " · " + source : "");

    var body = document.createElement("div");
    body.className = "m-body";
    // split on newlines to preserve line breaks while keeping inline render safe
    var rawLines = String(text || "").split("\n");
    var block = document.createElement("div");
    rawLines.forEach(function (line, i) {
      if (i > 0) block.appendChild(document.createElement("br"));
      block.insertAdjacentHTML("beforeend", renderInline(line));
    });
    body.appendChild(block);

    wrap.appendChild(meta);
    wrap.appendChild(body);
    logEl.appendChild(wrap);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setSource(label) {
    if (sourceTag) sourceTag.textContent = label || "STANDBY";
  }

  // Swap the body + source of the LAST assistant message in place. Used to
  // upgrade a "Thinking…" model_pending message once the model relay answers.
  function updateLastAssistant(text, source) {
    var msgs = logEl.querySelectorAll(".assist-msg.a");
    if (!msgs.length) return false;
    var last = msgs[msgs.length - 1];
    var body = last.querySelector(".m-body");
    var meta = last.querySelector(".m-meta");
    if (body) {
      body.innerHTML = "";
      var rawLines = String(text || "").split("\n");
      var block = document.createElement("div");
      rawLines.forEach(function (line, i) {
        if (i > 0) block.appendChild(document.createElement("br"));
        block.insertAdjacentHTML("beforeend", renderInline(line));
      });
      body.appendChild(block);
    }
    if (meta && source) meta.textContent = "ASSISTANT" + " · " + source;
    setSource(source || "STANDBY");
    logEl.scrollTop = logEl.scrollHeight;
    return true;
  }

  function setModes(m) {
    mode = m;
    modeEls.forEach(function (el) {
      var on = el.getAttribute("data-mode") === m;
      el.setAttribute("aria-selected", on ? "true" : "false");
      el.classList.toggle("active", on);
    });
    var labels = { toa: "TOA Q&A", report: "REPORT DRAFT", general: "GENERAL" };
    setSource(labels[m] || "STANDBY");
  }

  function pushUser(text) {
    addMessage("user", text);
    textEl.value = "";
  }

  function handle(text) {
    if (!text || !text.trim()) return;

    // Inline identity capture regardless of mode.
    // Tolerant: strips surrounding quotes (straight + curly), accepts
    // "I'm <name>" / "I am <name>", and doesn't demand the message be exact.
    var idText = String(text || "").replace(/^[\s"“”‘’']+|[\s"“”‘’']+$/g, "");
    var m = idText.match(/^I['’]?m\s+([A-Za-z]+)/i) || idText.match(/^I\s+am\s+([A-Za-z]+)/i);
    if (m) {
      var cand = A.findRole(m[1]);
      memberName = cand ? cand.member : null;
      if (memberName) {
        pushUser(text);
        addMessage("a", "Got it — working with your role as **" + memberName + "** (" + cand.title + ").", "IDENTITY");
        return;
      }
    }
    if (/who am i/i.test(text)) {
      pushUser(text);
      if (memberName) addMessage("a", "You're **" + memberName + "** in the TOA-01 roster.", "IDENTITY");
      else addMessage("a", "I don't yet know which member you are (auth isn't active on the live site). Say \u201CI'm Lalith\u201D (any member name) so I can personalize report drafting.", "IDENTITY");
      return;
    }

    pushUser(text);

    var answer;
    try {
      answer = A.respond({ text: text, mode: mode, myName: memberName, email: emailIdent });
    } catch (e) {
      answer = { kind: "uncovered", text: "The assistant hit an internal error. Try rephrasing." };
    }

    addMessage("a", answer.text || "", answer.source || "");
    if (answer.kind === "model_pending") setSource("MODEL NOT WIRED · DETERMINISTIC");
    else if (answer.kind === "uncovered") setSource("NOT IN CORPUS");
    else setSource(answer.source || modeLabel(mode));
  }

  function modeLabel(m) {
    return { toa: "TOA Q&A", report: "REPORT DRAFT", general: "GENERAL" }[m] || m;
  }

  // ── Identity from Supabase session (auth live) ──
  // Resolved lazily so the member's email (when auth is active) feeds
  // REPORT DRAFT. Explicit inline "I'm <name>" capture wins over email.
  var emailIdent = null;

  function tryResolveEmail() {
    var sb = window.ZENVAR_SUPABASE_CLIENT;
    if (!sb || typeof sb.auth.getUser !== "function") return;
    sb.auth.getUser().then(function (res) {
      if (res && res.data && res.data.user && res.data.user.email) {
        emailIdent = res.data.user.email;
      }
    }).catch(function () { /* auth not configured / not signed in — fine */ });
  }

  // ── Wiring ──
  modeEls.forEach(function (el) {
    el.addEventListener("click", function () {
      setModes(el.getAttribute("data-mode"));
      textEl.focus();
    });
  });

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    handle(textEl.value);
    textEl.focus();
  });

  // Model relay answers land here and upgrade the last "Thinking…" message.
  window.addEventListener("zenvar-model-answer", function (ev) {
    var d = ev.detail;
    if (d && d.answer && d.answer.text) {
      updateLastAssistant(d.answer.text, d.answer.source || "MODEL");
    }
  });

  // Welcome message
  setModes("toa");
  tryResolveEmail();
  addMessage("a",
    "Grounded on TOA-01 and all 8 roles. Try:\n\n" +
    "• \u201CWhat are the operating checks?\u201D\n" +
    "• \u201CWhat does Noel do?\u201D\n" +
    "• \u201CDraft my report\u201D (then \u201CI'm Lalith\u201D if not personalising yet)",
    "ASSIST-01");
})();
