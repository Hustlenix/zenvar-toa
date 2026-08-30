/*
 * ZENVAR · TOA-01 · MODEL PROVIDER (browser side of the model relay)
 *
 * Activates the GENERAL assistant through a free-tier chat model hosted in a
 * Supabase Edge Function. The model's API key lives ONLY in the Edge Function
 * secrets — nothing here ever contains or ships a model key to the browser.
 *
 * HOW IT WORKS (a thin decorator over the grounded engine):
 *   - TOA Q&A and REPORT DRAFT pass straight through to the deterministic
 *     grounded engine (fast, honest, no model needed).
 *   - GENERAL mode returns an instant "model_pending" answer so the page never
 *     hangs, then asynchronously POSTs {text, mode, myName, email, corpus} to
 *     the assist-model Edge Function. On success it dispatches a
 *     "zenvar-model-answer" event; assistant-page.js listens for that event and
 *     swaps the model's answer into the last message in place.
 *
 * Only the publishable Supabase anon key is referenced here — the model key
 * is server-side only.
 *
 * Load order: corpus.js → assist.js → supabase-config.js → supabase-client.js
 *            → assistant-page.js → this file.
 */
(function () {
  "use strict";

  var A = window.ZENVAR_ASSIST;
  var supabase = window.ZENVAR_SUPABASE || {};
  var authConfigured = !!(supabase.SUPABASE_URL && supabase.SUPABASE_ANON_KEY);

  if (!A || !authConfigured) return; // keep the deterministic provider

  var URL = String(supabase.SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1/assist-model";
  var ANON = (supabase.SUPABASE_ANON_KEY || "").trim();
  var inFlight = false;

  function ModelProvider() {}
  ModelProvider.prototype.respond = function (ctx) {
    // TOA + REPORT → grounded engine, unchanged.
    if (ctx.mode !== "general") {
      return A.deterministicRespond(ctx);
    }

    // GENERAL → instant pending, then async model swap.
    fire(ctx);

    return {
      ok: true,
      answer: {
        kind: "model_pending",
        slot: true,
        source: "MODEL · THINKING",
        text: "Thinking… tapping the model brain. This answer will appear right here when it's ready (TOA, role, and report answers are instant)."
      }
    };
  };

  function fire(ctx) {
    if (inFlight) return;
    inFlight = true;

    var body = {
      text: ctx.text || "",
      mode: ctx.mode,
      myName: ctx.myName || null,
      corpus: window.ZENVAR_CORPUS || null
    };

    var sb = window.ZENVAR_SUPABASE_CLIENT;
    if (sb && typeof sb.auth.getUser === "function") {
      Promise.resolve(sb.auth.getUser()).then(function (up) {
        if (up && up.data && up.data.user && up.data.user.email) body.email = up.data.user.email;
        doFetch(body);
      }).catch(function () { doFetch(body); });
    } else {
      doFetch(body);
    }
  }

  function doFetch(body) {
    fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON,
        "Authorization": "Bearer " + ANON
      },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok && res.answer) {
          window.dispatchEvent(new CustomEvent("zenvar-model-answer", { detail: { answer: res.answer } }));
        }
      })
      .catch(function () {
        window.dispatchEvent(new CustomEvent("zenvar-model-answer", {
          detail: {
            answer: { kind: "uncovered", source: "MODEL ERROR", text: "The model relay couldn't be reached. The grounded TOA answers still work (\u201Cwhat are the operating checks?\u201D)." }
          }
        }));
      })
      .finally(function () { inFlight = false; });
  }

  A.setProvider(new ModelProvider());
})();
