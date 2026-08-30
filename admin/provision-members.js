/**
 * PROVISION MEMBERS — server-side admin script (Zenvar TOA-01 auth)
 * ---------------------------------------------------------------
 * Creates the 8 toa auth accounts in Supabase using the service_role key.
 * This script is an ADMIN tool. It is NOT part of the deployed static site and
 * must NEVER be run in a browser. It only runs locally with your service key.
 *
 * PREREQUISITES
 *   1. npm install @supabase/supabase-js   (in the admin/ folder)
 *   2. Create a `.env` file in this folder:  (copy from .env.example)
 *        SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *   3. Fill in the real member emails below (marked [SET REAL EMAIL]).
 *
 * SECURITY
 *   The service_role key is a SECRET. Never commit it. It is git-ignored via
 *   the root .gitignore. Anyone with this key can read/write your whole DB.
 *
 * RUN
 *   node provision-members.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: `${__dirname}/.env` });

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in admin/.env');
  process.exit(1);
}

// Service-role admin client (server-side only — never shipped to the browser).
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// ---- MEMBERS ---------------------------------------------------------------
// Fill in each real Zenvar member email. The name matches the member SOP page
// and the TOA-01 roster. Every account is created with email_confirm:true so it
// can sign in immediately without a confirmation email.
const MEMBERS = [
  { name: 'Lalith',       email: 'lalith@zenvar.co' },
  { name: 'Darmigan',     email: 'darmigan@zenvar.co' },
  { name: 'Charvesh',     email: 'charvesh@zenvar.co' },
  { name: 'Hari',         email: 'hari@zenvar.co' },
  { name: 'Noel',         email: 'noel@zenvar.co' },
  { name: 'Shanjay',      email: 'shanjay@zenvar.co' },
  { name: 'Hemanathan',   email: 'hemanathan@zenvar.co' },
  { name: 'Sheryan',      email: 'sheryan@zenvar.co' },
];

// Simple readable initial password. Replace before running, or better, have each
// member change it after first sign-in. Choose something 12+ chars.
const INITIAL_PASSWORD = 'Zenvar-TOA-2026!';

(async () => {
  console.log(`Provisioning ${MEMBERS.length} Zenvar member accounts...`);
  let ok = 0, failed = 0;
  for (const m of MEMBERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: m.email,
      password: INITIAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: m.name },
    });
    if (error) {
      failed++;
      console.log(`  ✗ ${m.name} (${m.email}): ${error.message}`);
    } else {
      ok++;
      console.log(`  ✓ ${m.name} (${m.email}) created — id ${data.user.id}`);
    }
  }
  console.log(`\nDone. ${ok} created, ${failed} failed.`);
  console.log(`Initial password for all accounts: ${INITIAL_PASSWORD}`);
  console.log('Tell each member to sign in once, then they can change their password in Supabase Auth > Manage users, or you reset per-user there.');
  process.exit(failed ? 1 : 0);
})();
