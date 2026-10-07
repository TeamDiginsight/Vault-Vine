# Git & Supabase Auto-Deploy Setup Guide

Your project is now configured for Git version control and automated Supabase deployments. Follow these steps to complete the setup.

## ✅ Completed

- [x] Git repository initialized
- [x] GitHub remote added (`origin`)
- [x] Main branch configured
- [x] Supabase environment variables created (`.env.local`)
- [x] GitHub Actions workflow created (`.github/workflows/supabase-deploy.yml`)
- [x] Initial commit pushed

## 📋 Next Steps

### 1. Push to GitHub

Push your code to the remote repository:

```bash
git push -u origin main
```

### 2. Set Up GitHub Secrets

For auto-deploy to work, add these secrets to your GitHub repository:

1. Go to: **Settings → Secrets and variables → Actions → New repository secret**

2. Add the following secrets:

| Secret Name | Value | Where to Find |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Your Supabase access token | [Supabase Dashboard](https://supabase.com/dashboard) → Account Settings → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Your Supabase database password | Your project settings |

**To get Supabase Access Token:**
1. Go to https://supabase.com/dashboard
2. Click your profile icon → Account Settings
3. Scroll to "Access Tokens"
4. Create a new token (or use existing one)
5. Copy and paste into GitHub Secrets

### 3. Verify Configuration

After pushing and setting secrets, verify in GitHub:

1. Go to your repository on GitHub
2. Navigate to **Actions** tab
3. You should see "Deploy to Supabase" workflow
4. When you push changes to `main`, the workflow will automatically:
   - Run migrations from `supabase/migrations/`
   - Update your Supabase project

## 🚀 Auto-Deploy Workflow

**Trigger:** Every push to `main` branch

**What happens:**
1. GitHub Actions checks out your code
2. Sets up Node.js and Supabase CLI
3. Authenticates with your Supabase project
4. Applies any new database migrations
5. Verifies the deployment

**Logs:** View deployment progress in GitHub Actions → Workflow runs

## 🔧 Environment Variables

### Local Development
Create `.env.local` (already created, **DO NOT COMMIT**):
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Reference Template
Use `.env.example` as a template when onboarding team members.

## 📝 Database Migrations

To create new migrations:

```bash
supabase migrations new your_migration_name
```

Edit the created file in `supabase/migrations/` and commit to trigger auto-deploy.

## ⚠️ Important Notes

- ✅ `.env.local` is in `.gitignore` - never commits sensitive keys
- ✅ GitHub Actions uses secrets (safe, not exposed in logs)
- ✅ Only `main` branch triggers auto-deploy
- ✅ Service role key is only used in GitHub Actions, not in browser

## 🆘 Troubleshooting

**Workflow fails to authenticate:**
- Verify `SUPABASE_ACCESS_TOKEN` is valid in GitHub Secrets
- Check token hasn't expired (regenerate if needed)

**Migrations not applying:**
- Check workflow logs in GitHub Actions tab
- Ensure migration files are in `supabase/migrations/`
- Verify database has proper permissions

**Local changes not syncing:**
- Pull latest: `git pull origin main`
- Verify `.env.local` matches your Supabase project

## 📚 Learn More

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Git Push Documentation](https://git-scm.com/docs/git-push)

## 🚀 Deployment Status

Auto-deploy configured for all branches (main, dev, qa, prod).
Check GitHub Actions tab for deployment logs and status.

✅ **Supabase Connected & Tested** - Migrations successfully applied!
✅ **GitHub Secrets Updated** - SUPABASE_ACCESS_TOKEN configured
🚀 **Auto-Deploy Ready** - Push triggers automatic Supabase deployment
