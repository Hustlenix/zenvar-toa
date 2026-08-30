/*
 * ZENVAR · TOA-01 · LOGIN HANDLER
 *
 * Drives the login.html form against Supabase Auth (email + password).
 *
 * Flow:
 *   1. If the visitor already has a live session, skip straight through.
 *   2. Otherwise take email + password → signInWithPassword().
 *   3. On success, send them back to the page they were trying to reach
 *      (?redirect_to=...) or to index.html.
 *
 * When auth is not activated yet (placeholder keys) the form is replaced
 * with a notice so the page never appears "broken".
 */
(function () {
  "use strict";

  var CONFIGURED = window.ZENVAR_AUTH_CONFIGURED;
  var supabase = window.ZENVAR_SUPABASE_CLIENT;

  var form = document.getElementById("login-form");
  var emailEl = document.getElementById("email");
  var passEl = document.getElementById("password");
  var errorEl = document.getElementById("auth-error");
  var statusEl = document.getElementById("auth-status");
  var submitBtn = document.getElementById("login-submit");

  function redirectTarget() {
    var q = location.search.match(/[?&]redirect_to=([^&]+)/);
    if (q && q[1]) return decodeURIComponent(q[1]);
    return "index.html";
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
  }

  // ── 1. Auth not configured: leave a clear notice, don't fake a login ──
  if (!CONFIGURED || !supabase) {
    if (form) {
      var notice = document.createElement("p");
      notice.className = "auth-notice";
      notice.textContent =
        "Authentication is not yet activated on this site. The owner must paste the Supabase connection details (see SUPABASE_SETUP.md) to enable the member login.";
      form.parentNode.replaceChild(notice, form);
    }
    if (statusEl) statusEl.textContent = "SIGN-IN DISABLED — AUTH NOT ACTIVATED";
    return;
  }

  // ── 2. Already signed in → skip the form ──
  supabase.auth.getSession().then(function (res) {
    if (res && res.data && res.data.session) {
      location.replace(redirectTarget());
    }
  });

  // ── 3. Handle submit ──
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var email = emailEl.value.trim();
    var password = passEl.value;
    if (!email || !password) {
      showError("Enter both your member email and password.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "SIGNING IN …";
    if (statusEl) statusEl.textContent = "VERIFYING CREDENTIALS";

    supabase.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) {
          throw res.error;
        }
        // Success — session is active, go where they were headed.
        location.replace(redirectTarget());
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "SIGN IN <span aria-hidden=\"true\">&#8594;</span>";
        if (statusEl) statusEl.textContent = "IDENTIFY YOURSELF TO CONTINUE";
        // Level the message: don't leak whether the account exists.
        showError(
          "Sign-in failed. Check the member email and password, then try again."
        );
        passEl.select();
      });
  });
})();
