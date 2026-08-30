/*
 * ZENVAR · TOA-01 · AUTH GATE
 *
 * Runs on every PROTECTED page (index.html, the 8 member pages, prd.html).
 *
 * What it does:
 *   1. Blocks rendering until it knows the visitor is a signed-in member.
 *      A synchronous localStorage check fires first so the page does not
 *      flash its contents to strangers; then getSession() confirms the
 *      token against Supabase and refreshes it if needed.
 *   2. Redirects visitors who are not signed in to login.html, carrying
 *      the page they wanted as ?redirect_to=... so they land back there.
 *   3. Wires any [data-auth-signout] control and signs the member out.
 *   4. Listens for auth state changes (e.g. signed out in another tab).
 *
 * When auth has not been activated (placeholder keys), the site renders
 * open so development/DEMO work is not blocked — see ZENVAR_AUTH_CONFIGURED.
 */
(function () {
  "use strict";

  var CONFIGURED = window.ZENVAR_AUTH_CONFIGURED;
  var supabase = window.ZENVAR_SUPABASE_CLIENT;

  var LOGIN_PAGE = "login.html";
  var HERE = location.pathname.split("/").pop();

  function stripParams(u) {
    return u.split("?")[0];
  }

  // Sessions that are already active are completed in place. When the token
  // has simply expired or no valid token exists, send to login.
  function requireLogin() {
    if (HERE === LOGIN_PAGE) return; // login page must render
    var target = stripParams(HERE);
    var q = "";
    if (target && target !== "index.html") q = "?redirect_to=" + encodeURIComponent(target);
    location.replace(LOGIN_PAGE + q);
  }

  // ── 1. Synchronous guard ──
  // Block first paint until the async check below completes, so content
  // never flashes before the auth decision.
  var hide = document.documentElement.style;
  hide.visibility = "hidden";

  // ── 2. If auth is not configured, reveal immediately (open site) ──
  if (!CONFIGURED || !supabase) {
    hide.visibility = "";
    return;
  }

  // ── 3. Fast first-paint guard ──
  // Supabase stores its session JSON in localStorage under a key ending in
  // "-auth-token". If no token exists the getSession() promise below has
  // nothing to resolve with, so we can redirect before paint. When a token
  // is present we still let getSession() confirm/refresh it server-side.
  var hasToken = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("-auth-token") !== -1) {
        var raw = localStorage.getItem(k);
        if (raw && raw.indexOf("access_token") !== -1) { hasToken = true; break; }
      }
    }
  } catch (e) {}
  if (!hasToken) {
    hide.visibility = "";
    requireLogin();
    return;
  }

  // ── 4. Async confirm + refresh ──
  supabase.auth.getSession().then(function (res) {
    var session = res && res.data && res.data.session;
    if (session) {
      // Signed in → reveal and wire the session behaviour.
      hide.visibility = "";
      wireSessionUI();
    } else {
      hide.visibility = "";
      requireLogin();
    }
  });

  // ── 5. Session behaviour ──
  function wireSessionUI() {
    var signOutBtns = document.querySelectorAll("[data-auth-signout]");
    signOutBtns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        supabase.auth.signOut().then(function () {
          requireLogin();
        });
      });
    });

    supabase.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_OUT") requireLogin();
    });
  }
})();
