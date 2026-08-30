# Zenvar TOA-01 — Private Member Sign-In Setup

This is the **one-time setup** that turns the Zenvar site into a private, members-only area. Once this is done, the 8 Zenvar members sign in with an email + password, and everyone else is stopped at a "RESTRICTED / AUTHENTICATION REQUIRED" gate.

The whole thing runs on **Supabase's free plan** — that's the same company that makes the database engine under the hood. It's free up to 50,000 monthly users, and we have 8. It'll never cost anything here.

There are **4 short steps**. You can do steps 1 and 2 in about 5 minutes; step 3 is a 1-liner I'll run for you; step 4 is a click to publish.

---

## Step 1 — Create the Supabase project (you do this, ~3 min)

1. Go to **https://supabase.com** and click **Sign in** (top-right). Sign in with your Google or GitHub account. If you have no account yet, it's free to create one — a password + a Google/GitHub login.
2. You'll land on a dashboard. Click **New project** (green button, top-right).
3. Fill in:
   - **Name:** `zenvar-toa` (any name is fine)
   - **Database password:** click **Generate a password** and **copy it somewhere safe** (Notes app is fine). You won't need it often.
   - **Region:** pick the one nearest your team.
   - Click **Create new project**.
4. Wait ~1–2 minutes for it to finish setting up. When the green banner appears you're ready.

> **Note:** pick the **Free** tier when it asks. There is no cost, no card needed.

## Step 2 — Copy the two keys into the site (you do this, ~2 min)

1. In the Supabase dashboard, on the left menu click **Project Settings** (gear icon, bottom-left).
2. Click **API** in that menu.
3. You'll see two values. Copy each one exactly:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - `anon` **public** key — the row labeled `anon` / `public`, a long string.
4. Open the file **`supabase-config.js`** in this project (in the top folder). It currently looks like this:

   ```js
   window.ZENVAR_SUPABASE = {
     SUPABASE_URL: "",
     SUPABASE_ANON_KEY: ""
   };
   ```

5. Paste the **Project URL** between the quotes on `SUPABASE_URL`, and the **anon key** between the quotes on `SUPABASE_ANON_KEY`. Save the file.

> **On security:** the `anon` key is *meant* to be public — it's safe to have in the website's code. It does **not** count as a secret. So no worries when you paste it in. (The *secret* service key is handled separately in Step 3 and never goes into the website.)

## Step 3 — Create the 8 member accounts (I run this for you)

1. Tell me the two keys from Step 2 (the Project URL and the **service role** key — the `service_role` one on that same API page).
2. Give me the **8 real member email addresses** (Lalith, Darmigan, Charvesh, Hari, Noel, Shanjay, Hemanathan, Sheryan). Right now the script has a guessed address for each (like `lalith@zenvar.co`) that we'll swap for the real ones.
3. I'll run the provisioning script, which creates all 8 accounts with `email_confirm` turned on, so each member can sign in immediately.
4. I'll then give each member their **sign-in email + a starter password** to hand out (and they can change it after first sign-in).

## Step 4 — Publish the site (push to GitHub)

After the keys are in `supabase-config.js`, I commit and push to the `main` branch. The site's automatic GitHub Pages publishing kicks in, and within a minute or two the live site is behind the new sign-in gate.

---

## How to verify it worked

- Open the live site URL in a **private/incognito** window. You should see the **"AUTHENTICATION REQUIRED"** gate instead of the site.
- Type a member email + the starter password. You should land back on the site.
- Open the site normally when signed in — you stay logged in. Use the **SIGN OUT** button in the top navigation to test the reverse.
- Anyone without an account (try a random email) sees the "Unable to sign in" error and never reaches the content.

---

## Something not working?

- **Sign-in says "unable to sign in"**: the email might be wrong, the member might not be provisioned yet (Step 3), or the password is wrong. I can reset any member's password in the Supabase dashboard under **Authentication → Users**.
- **Page still open / no gate**: the `anon` key might be missing from `supabase-config.js`. The site deliberately falls back to "open" if auth isn't configured, so you always keep your site working while setting up. Check Step 2.
- If you get stuck anywhere, just paste me the exact red error text and I'll sort it.

---

## One honest caveat you should know

This gates the site with a **sign-in screen**, which keeps casual visitors out. But because the pages are served as plain files by GitHub Pages, the **content is "hidden behind a login," not fully locked down** — a technically savvy person who knew the exact file URLs could still reach the raw pages. For a small cooperative team that all want inside, that's perfectly fine — it stops the public, it just isn't a hard security boundary. If you ever need true *guaranteed* protection (e.g. for investor-confidential documents), we can switch the hosting to Cloudflare Access, which enforces the login at the network level. Happy to do that whenever you want.
