/*
 * ZENVAR · TOA-01 · SUPABASE CLIENT (browser)
 *
 * Loads the Supabase JS library from CDN and builds the single auth client
 * used by every page. The anon key is publishable by design (safe in the
 * browser); access to rows/data is enforced server-side by RLS policies.
 *
 * Order matters — on every protected page load in this order:
 *   1. supabase-config.js   (window.ZENVAR_SUPABASE)
 *   2. supabase-client.js   (this file → window.ZENVAR_SUPABASE_CLIENT)
 *   3. auth.js              (session gate + sign-out)
 *
 * The Supabase JS v2 UMD bundle is loaded via CDN in every page <head>:
 *   https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
 *   (exposes window.supabase.createClient)
 *
 * IMPORTANT: if the URL/key are still blank placeholders this file must
 * not throw — it emits a console warning and authors the pages to render
 * in an open (no login) state so the site keeps working until auth is
 * activated.
 */
(function () {
  "use strict";

  var cfg = window.ZENVAR_SUPABASE || {};
  var url = (cfg.SUPABASE_URL || "").trim();
  var key = (cfg.SUPABASE_ANON_KEY || "").trim();

  var AUTH_CONFIGURED = !!(url && key);

  if (!window.ZENVAR_SUPABASE_CLIENT) {
    if (AUTH_CONFIGURED) {
      // Supabase JS v2 loaded via CDN (see deploy instructions).
      var client = window.supabase
        ? window.supabase.createClient(url, key, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          })
        : null;

      if (!client) {
        console.warn("Zenvar auth: supabase-js library not loaded. Pages stay open.");
        AUTH_CONFIGURED = false;
      } else {
        window.ZENVAR_SUPABASE_CLIENT = client;
      }
    } else {
      console.warn("Zenvar auth: SUPABASE_URL / SUPABASE_ANON_KEY not configured. Pages stay open.");
    }
  }

  window.ZENVAR_AUTH_CONFIGURED = AUTH_CONFIGURED;
})();
