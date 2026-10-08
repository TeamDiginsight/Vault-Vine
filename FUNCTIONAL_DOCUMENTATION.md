# Vault & Vine - Functional Documentation

**Your family's wealth, guarded and growing.**

A modern, privacy-first portfolio management application that helps you track stocks, retirement accounts, deposits, property, and precious metals across the US and India.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Quick Start](#quick-start)
4. [Project Structure](#project-structure)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [Using the Application](#using-the-application)
8. [Database Schema](#database-schema)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Support](#support)

---

## 🎯 Overview

Vault & Vine is a personal wealth management dashboard built with modern web technologies:

- **Frontend**: Vanilla JavaScript + HTML/CSS (no frameworks)
- **Backend**: Supabase (PostgreSQL database + authentication)
- **Deployment**: GitHub Actions (auto-deploy on push)
- **Privacy**: Row-level security, encrypted data

The application is designed to be lightweight, fast, and completely private - your financial data never leaves your Supabase project.

**Key Stats:**
- 42+ asset holdings tracked
- 11+ liability accounts
- Multi-currency support (USD, INR)
- Real-time exchange rates & precious metals pricing
- Monthly net-worth snapshots for trend analysis

---

## ✨ Features

### Asset Tracking
- **Investment types**: Stocks, Retirement (401k, IRA, EPF), Crypto, Fixed deposits, Property, Precious metals
- **Currencies**: USD and INR with live conversion rates
- **Ownership**: Track holdings per person (household members)
- **Search & filter**: By type, currency, owner, or name

### Dashboard Analytics
- **Net worth tracking**: Visual trend over months via snapshots
- **Asset allocation**: See breakdown by investment type (pie chart)
- **Geographic split**: US vs India holdings
- **Top 10 holdings**: Bar chart of largest assets
- **Owner breakdown**: Holdings per household member
- **Liquidity ladder**: How quickly each asset can become cash
- **Precious metals**: Gold, silver, platinum with live pricing

### Liabilities Management
- **Loan tracking**: Personal loans, mortgages, auto loans
- **Credit cards**: Balance and limits
- **Notes**: Add context for each liability
- **Quick removal**: Delete when paid off

### Currency & Rates
- **Live USD/INR exchange rates**: Updates via API
- **Precious metals pricing**: Gold, silver, platinum in both currencies
- **Manual override**: Set custom rates if needed
- **API integration**: Fetch from external services

### Snapshots & History
- **Monthly snapshots**: Freeze your net worth at a point in time
- **Trend analysis**: See progress month-to-month
- **Historical data**: All snapshots stored and displayed

### Settings
- **Profile**: Display name and household members
- **Primary currency**: Default display currency
- **Household members**: Add people to track holdings per person
- **Backup & import**: Export JSON/CSV, import from backup
- **Data management**: Wipe all data if needed

---

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account (free tier works)
- GitHub account (for auto-deployment)
- Node.js 18+ (for local development)

### 1. Clone or Download
```bash
git clone https://github.com/TeamDiginsight/Vault-Vine.git
cd Vault-Vine
```

### 2. Configure Supabase
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Copy your project URL and anonymous API key
3. Create `.env.local` file in project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database
1. Go to Supabase dashboard → SQL Editor
2. Create a new query
3. Copy contents of `supabase/migrations/20261007000000_vault_vine_init.sql`
4. Run the migration
5. Your tables are now ready!

### 4. Run Locally
```bash
# Start a local web server
python3 -m http.server 8000

# Visit http://localhost:8000
```

### 5. Deploy to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/Vault-Vine.git
git push -u origin main
```

---

## 📁 Project Structure

```
Vault-Vine/
├── index.html                          # Main app structure
├── assets/
│   ├── styles.css                      # All styling (light/dark themes)
│   ├── app.js                          # Main application logic
│   └── config.js                       # Supabase configuration
├── supabase/
│   └── migrations/
│       └── 20261007000000_vault_vine_init.sql  # Database schema
├── .github/
│   └── workflows/
│       └── supabase-deploy.yml         # CI/CD automation
├── .gitignore                          # Git ignore rules
├── README.md                           # Quick reference
├── SETUP_GUIDE.md                      # Detailed setup instructions
└── FUNCTIONAL_DOCUMENTATION.md         # This file
```

---

## 🔧 Installation & Setup

### Step 1: Supabase Project Setup

1. **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New project"
   - Choose region closest to you
   - Wait for project to initialize

2. **Get Your Credentials**
   - Go to Settings → API
   - Copy **Project URL** (e.g., `https://abc123.supabase.co`)
   - Copy **Anon Public Key** (starts with `eyJ...`)

3. **Create .env.local File**
   ```bash
   # In project root directory
   cat > .env.local << 'EOF'
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   EOF
   ```

### Step 2: Initialize Database

1. **Access SQL Editor**
   - In Supabase dashboard, go to SQL Editor
   - Click "New query"

2. **Create Schema**
   - Open `supabase/migrations/20261007000000_vault_vine_init.sql`
   - Copy all contents
   - Paste into SQL editor
   - Click "Run"
   - Verify: You should see 4 new tables: `profiles`, `holdings`, `liabilities`, `rate_settings`, `snapshots`

### Step 3: Configure Authentication

1. **Enable Google OAuth (Optional)**
   - Go to Supabase → Authentication → Providers
   - Click Google
   - Add your Google OAuth credentials
   - Users can now sign in with Google

2. **Email Signup**
   - Email authentication is enabled by default
   - Users can sign in with email link

### Step 4: Local Development

1. **Start Web Server**
   ```bash
   cd Vault-Vine
   python3 -m http.server 8000
   ```

2. **Open Browser**
   - Visit http://localhost:8000
   - Sign in with email or Google
   - You'll be prompted to set up database (if running first time)
   - Click "Reload" after setup

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` with:

```env
# Required - From Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Optional - For GitHub Actions auto-deployment
SUPABASE_ACCESS_TOKEN=sbp_v0_...
SUPABASE_DB_PASSWORD=your-secure-password
```

**Important**: `.env.local` is in `.gitignore` - never commit secrets!

### GitHub Secrets (for CI/CD)

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add repository secrets:
   - `SUPABASE_ACCESS_TOKEN`: From Supabase → Settings → Access Tokens
   - `SUPABASE_DB_PASSWORD`: Your Supabase project password

### Theme Settings

Users can toggle between light and dark themes:
- Click theme button (☀️/🌙) in top navigation
- Preference is stored in browser

### Household Members

Add people to track holdings separately:
1. Go to Settings → Profile & household
2. Enter a name (e.g., "Thyagu", "Priya")
3. Click "Add"
4. When adding holdings, select the person

---

## 📱 Using the Application

### Authentication

**First Time?**
1. Click "Email me a sign-in link" or "Continue with Google"
2. Verify email or authenticate with Google
3. You're logged in! Database setup happens automatically

**Returning Users?**
1. Sign in with same method
2. Your data persists in Supabase

### Dashboard

Shows your wealth overview:
- **KPIs**: Total assets, total liabilities, net worth, target savings
- **Net worth trend**: Line chart of monthly snapshots (click + Snapshot to record today)
- **Assets vs liabilities**: Pie chart showing balance
- **Allocation by type**: See which investments dominate
- **US vs India**: Geographic split
- **Top 10 holdings**: Your largest assets
- **By owner**: Holdings per person
- **Precious metals**: Live pricing for gold/silver/platinum
- **Liquidity ladder**: Quick/medium/slow liquidity assets

**How to Take Snapshot?**
1. Update all holdings to current value
2. Click "+ Snapshot"
3. This freezes today's total for trend tracking
4. Take snapshots monthly for best trends

### Holdings Management

**Add a Holding**
1. Click "+ Add holding" on Dashboard or Holdings tab
2. Fill in details:
   - **Name**: Description (e.g., "Apple Stock", "SBI FD")
   - **Type**: Select investment type
   - **Owner**: Person who owns it
   - **Amount**: Current value
   - **Currency**: USD or INR
3. For precious metals:
   - Select metal (Gold, Silver, Platinum)
   - Enter quantity and unit (grams, ounces, tola)
   - Enter purity (24k, 22k, etc.)
4. Click "Save"

**Edit/Delete Holdings**
1. Go to Holdings tab
2. Click on a holding to edit
3. Update values
4. Click "Save" or "Delete"

**Search & Filter**
- Search by name
- Filter by type (Stock, Retirement, etc.)
- Filter by currency
- Filter by owner

### Liabilities Management

**Add a Loan or Credit Card**
1. Click "+ Add loan / card" on Liabilities tab
2. Fill in:
   - **Name**: Loan name
   - **Type**: Loan, Credit card, Mortgage, Auto loan
   - **Amount**: Outstanding balance
   - **Interest rate**: Annual percentage
   - **Due date**: When is it due (if applicable)
   - **Currency**: USD or INR
3. Add notes (optional)
4. Click "Save"

**Track Payoff Progress**
- Amount updates as you pay down
- Delete when fully paid
- Interest rates help show total cost

### Settings

**Profile & Household**
- Update display name
- Set primary currency for display
- Add/remove household members
- View all members

**Market Rates**
- View current USD/INR rates
- Update precious metals prices
- Rates auto-update or set manually
- Used for currency conversions

**Backup & Import**
- **Export JSON**: Download your complete data as backup
- **Export CSV**: Get holdings/liabilities as spreadsheet
- **Import**: Upload a previous backup to restore data

**Danger Zone**
- "Delete all my data": Permanently removes everything
- Cannot be undone - use with caution!

---

## 🗄️ Database Schema

### Tables Overview

#### `profiles` Table
Stores user profile information.
```sql
- id (UUID, Primary Key) - User's Supabase auth ID
- created_at (Timestamp) - Account creation time
- display_name (Text) - User's display name
- primary_currency (Text) - Default currency (USD/INR)
- display_currency (Text) - Currently displayed currency
```

#### `holdings` Table
Tracks individual investments and assets.
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key) - Links to profile
- entity (Text) - Investment name
- type (Text) - Stock, Retirement, FD, Property, Precious Metal, Crypto
- owner (Text) - Person in household who owns it
- amount (Decimal) - Current value
- currency (Text) - USD or INR
- qty (Decimal) - For metals only
- unit (Text) - For metals (grams, oz, tola, etc.)
- purity (Text) - For metals (24k, 22k, etc.)
- notes (Text) - Custom notes
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `liabilities` Table
Tracks loans and credit cards.
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- entity (Text) - Loan name
- type (Text) - Loan, Credit Card, Mortgage, Auto Loan
- amount (Decimal) - Outstanding balance
- interest_rate (Decimal) - Annual percentage
- due_date (Date) - When due (optional)
- currency (Text) - USD or INR
- notes (Text)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `snapshots` Table
Monthly net worth snapshots for trend tracking.
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- snapshot_date (Date) - When snapshot was taken
- total_assets (Decimal) - Sum of all holdings
- total_liabilities (Decimal) - Sum of all liabilities
- net_worth (Decimal) - Assets minus liabilities
- currency (Text) - What currency used
- created_at (Timestamp)
```

#### `rate_settings` Table
Stores exchange rates and precious metal prices.
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- rate_name (Text) - USD/INR, Gold/USD, etc.
- rate_value (Decimal) - Current rate
- last_updated (Timestamp)
- api_source (Text) - Where rate came from
```

### Row Level Security

All tables have RLS policies:
- Users can only see their own data
- Users cannot see other users' holdings/liabilities
- Policies enforced at database level

---

## 🚀 Deployment

### GitHub Actions Auto-Deploy

The project includes CI/CD that automatically deploys to Supabase:

**How It Works:**
1. You push code to GitHub (any branch)
2. GitHub Actions workflow runs
3. Workflow applies database migrations
4. Your Supabase project updates automatically

**Setup Steps:**

1. **Push Code to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/Vault-Vine.git
   git branch -M main
   git push -u origin main
   ```

2. **Add GitHub Secrets**
   - Go to GitHub Repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add `SUPABASE_ACCESS_TOKEN`:
     - Go to Supabase → Settings → Access Tokens
     - Create new token (or use existing)
     - Copy and paste into GitHub secret
   - Add `SUPABASE_DB_PASSWORD`:
     - Found in Supabase → Settings → Database

3. **Create Migrations**
   ```bash
   # After setup, any database changes go in migrations
   supabase migrations new your_migration_name
   # Edit the file in supabase/migrations/
   git add supabase/migrations/
   git commit -m "Add migration"
   git push
   # GitHub Actions will automatically apply it!
   ```

**View Deployment Status:**
- Go to GitHub Repo → Actions tab
- Click "Deploy to Supabase" workflow
- See logs and status of each deployment

### Manual Deployment

If CI/CD fails, deploy manually:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref abc123

# Authenticate
supabase login

# Apply migrations
supabase db push

# Deploy edge functions (if any)
supabase functions deploy
```

---

## 🐛 Troubleshooting

### "No holdings data showing"

**Problem**: Dashboard is empty after login.

**Solution**:
1. Check browser console (F12 → Console) for errors
2. Verify `.env.local` has correct Supabase URL and key
3. Ensure database migration was run
4. Try reloading page (Ctrl+R)
5. Check Supabase → Auth → Users to confirm you're logged in

### "Exchange rates not updating"

**Problem**: USD/INR or metal prices are stale.

**Solution**:
1. Go to Settings → Market rates
2. Click "Refresh all"
3. If rates still don't update, check:
   - Browser network tab for API errors
   - Supabase rate_settings table to see last update
4. Can manually set rates if API fails

### "Error: 'No project found'"

**Problem**: Supabase connection fails.

**Solution**:
1. Verify `.env.local` has correct project URL
2. Check Supabase → Settings → API for correct URL format
3. Ensure Supabase project is active (not paused)
4. Check if org/project was deleted

### "Holdings disappeared after refresh"

**Problem**: Data saved but doesn't persist.

**Solution**:
1. Check browser console for errors
2. Verify user is still authenticated (check Auth tab in Supabase)
3. Check Supabase → SQL Editor → inspect holdings table directly
4. Try exporting data to backup (Settings → Export JSON)
5. Contact support with Supabase project details

### "GitHub Actions deployment failed"

**Problem**: CI/CD workflow shows error.

**Solution**:
1. Go to GitHub → Actions tab
2. Click failed workflow to see logs
3. Common issues:
   - Missing `SUPABASE_ACCESS_TOKEN` secret
   - Wrong token format (should start with `sbp_v0_`)
   - `SUPABASE_DB_PASSWORD` incorrect
4. Verify secrets in Settings → Secrets and variables
5. Re-run workflow after fixing secrets

### "Cannot edit or delete holdings"

**Problem**: Buttons don't respond.

**Solution**:
1. Ensure you're logged in (check if name shows in top banner)
2. Check browser console for JavaScript errors
3. Try hard-refresh (Ctrl+Shift+R)
4. Verify user has edit permissions (RLS policies)
5. Check if table data is corrupted in Supabase

### "Dark mode toggle not working"

**Problem**: Theme button doesn't change colors.

**Solution**:
1. Open browser DevTools (F12)
2. Go to Application → Storage → Local Storage
3. Look for `vault-vine-theme` key
4. Delete it and refresh
5. Try clicking theme button again
6. Check browser supports CSS custom properties

---

## 📞 Support

### Getting Help

1. **Check Documentation**
   - Read this document thoroughly
   - Check README.md for quick reference
   - Review SETUP_GUIDE.md for deployment help

2. **Debug Locally**
   - Open Browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab to see API calls
   - Check Application → Local Storage for saved preferences

3. **Inspect Database**
   - Go to Supabase → SQL Editor
   - Query your tables directly to verify data
   - Check RLS policies in Supabase → Authentication → Policies

4. **Contact Developer**
   - Email: prathiyagu1984@gmail.com
   - Include:
     - What you were trying to do
     - Error message (if any)
     - Browser and OS you're using
     - Steps to reproduce the issue

### Reporting Bugs

Include:
- Browser and version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Error messages from console

### Feature Requests

Have an idea? Share what would help your portfolio management:
- New asset types
- Additional reports
- Mobile app
- API for third-party integrations
- Real-time portfolio notifications

---

## 📚 Additional Resources

### Supabase Documentation
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Basics](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### GitHub
- [GitHub Actions](https://docs.github.com/en/actions)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Financial Concepts
- **Asset Classes**: Stocks, bonds, property, commodities
- **Liabilities**: Debts that reduce net worth
- **Net Worth**: Total assets minus total liabilities
- **Liquidity**: How quickly an asset can become cash

### Currency Resources
- USD/INR rates: [OANDA API](https://www.oanda.com/)
- Metal prices: [Metals API](https://metals-api.com/)

---

## 📄 Version History

**v1.0.0** (Current)
- Core portfolio tracking (holdings, liabilities)
- Multi-currency support (USD, INR)
- Asset allocation analytics
- Monthly net worth snapshots
- Precious metals tracking with live pricing
- GitHub Actions CI/CD integration
- Row-level security
- Dark/light theme support
- Household member tracking

---

## 📋 Checklist for First-Time Users

- [ ] Created Supabase account
- [ ] Set up Supabase project
- [ ] Added `.env.local` with credentials
- [ ] Ran database migration (SQL)
- [ ] Verified database tables exist
- [ ] Started local web server
- [ ] Signed in to app
- [ ] Added first holding
- [ ] Added household members (optional)
- [ ] Checked exchange rates are updating
- [ ] Took first snapshot
- [ ] Set up GitHub deployment (optional)
- [ ] Exported data backup

---

## 🎉 You're All Set!

Your Vault & Vine instance is ready. Start tracking your wealth and watch your portfolio grow!

**Next Steps:**
1. Add your current holdings
2. Add any liabilities (loans, credit cards)
3. Set household members
4. Review rates and prices
5. Take a snapshot
6. Check the dashboard
7. Export a backup for safety

Happy investing! 🌱💰

---

**Last Updated**: October 7, 2026  
**Version**: 1.0.0  
**Maintainer**: Vault & Vine Team

For questions or support, refer to troubleshooting section or contact the development team.
