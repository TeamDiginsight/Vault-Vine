# Vault & Vine

*Your family's wealth, guarded and growing.*

A private net-worth dashboard for families with money in the US and India. It tracks stocks, SIPs and retirement accounts, savings, fixed deposits, property, gold, silver and loans. Live USD ⇄ INR rates and metal prices are built in.

- **Sign-in:** Google, or a passwordless email link (Supabase Auth).
- **Privacy:** every row belongs to one user. Postgres Row Level Security means a signed-in user can only read and change their own data, and signed-out visitors get nothing.
- **Stack:** plain HTML/CSS/JS, [supabase-js](https://supabase.com/docs/reference/javascript) and Chart.js from CDNs. There's no build step, so it can be hosted anywhere static.

```
index.html                 app shell, sign-in screen
assets/styles.css          design (light + dark)
assets/config.js           Supabase URL + publishable key
assets/app.js              app logic, data layer, charts
supabase/migrations/       database schema + security policies
```

---

## 1. Create the database (once)

1. Supabase Dashboard → your project → **SQL Editor** → **New query**.
2. Paste the whole of `supabase/migrations/20261007000000_vault_vine_init.sql` and click **Run**.

The script creates four tables, all with Row Level Security turned on:

| table | what it holds |
|---|---|
| `profiles` | display name, preferred currency, household members (one row per user) |
| `holdings` | assets and liabilities: name, type, owner, currency, amount, plus weight/unit/purity for metals |
| `rate_settings` | FX and metal price sources (API URL, path, key, premium) and the last price |
| `snapshots` | monthly net-worth history |

The script is safe to run again. You can check the result under **Advisors → Security Advisor**, which should show no RLS warnings for these tables.

## 2. Turn on sign-in

**Email link** works out of the box: Authentication → Sign In / Providers → **Email** should be enabled.

**Google:**

1. Go to [Google Cloud Console → Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients) → **Create client** → **Web application**.
2. Under **Authorized JavaScript origins**, add `http://localhost:5173` and, later, your live domain.
3. Under **Authorized redirect URIs**, add `https://rwxernfvmhfosymlblek.supabase.co/auth/v1/callback`.
4. Copy the Client ID and Client Secret into Supabase → Authentication → Sign In / Providers → **Google**, then save.

**Redirect URLs:** in Supabase → Authentication → **URL Configuration**:

- Set **Site URL** to your live address (or `http://localhost:5173` while testing).
- Add `http://localhost:5173/**` and your live URL to **Redirect URLs**.

## 3. Run it locally

Sign-in can't return to a file you double-clicked, so serve the folder:

```bash
cd "Vault-Vine"
python3 -m http.server 5173      # or: npx serve -l 5173
```

Then open <http://localhost:5173>.

## 4. Move your data from the prototype

1. Open the old `portfolio-dashboard.html` → **Settings → Export JSON**.
2. Sign in to Vault & Vine → **Import backup (JSON)**. This is on the empty dashboard, or under Settings.

Personal backups are git-ignored. Never commit them.

## 5. Deploy

Any static host works: Netlify, Vercel, Cloudflare Pages or GitHub Pages. Point it at this folder with no build command, then add the live URL to Google's origins and Supabase's Redirect URLs (step 2).

## Security notes

- `assets/config.js` contains the **publishable** key, which is designed to be public. **Never** put the `service_role` or secret key in this repo.
- All access control lives in the database policies. Each table has select/insert/update/delete policies of the form `auth.uid() = user_id`, and the `anon` role has no table access at all.
- Metal-price API keys you enter in Settings are stored in your own `rate_settings` row, so only you can read them.
- The app keeps no financial data in browser storage. Only the Supabase session, theme and last-opened tab are stored there.

## Roadmap ideas

- Household sharing (invite a spouse with read or write access).
- Scheduled server-side price refresh (Supabase Edge Function + cron).
- Mobile app wrapper (Capacitor) using the same Supabase backend.
