# How to Push to GitHub and Build APK

## Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "APK Build Token"
4. Select scopes:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (update GitHub Action workflows)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)

## Step 2: Push Your Code

### Option A: Use Token in URL (One-time)
```bash
cd tifto-customer-app
git remote set-url origin https://YOUR_TOKEN@github.com/Herookie7/tifto-customer-app.git
git push -u origin main
```

### Option B: Use Git Credential Helper (Recommended)
```bash
cd tifto-customer-app

# Set up credential helper
git config --global credential.helper store

# Push (will prompt for username and password)
git push -u origin main
# Username: Herookie7
# Password: YOUR_PERSONAL_ACCESS_TOKEN (paste the token, not your GitHub password)
```

### Option C: Use GitHub CLI (Easiest)
```bash
# Install GitHub CLI if not installed
# Ubuntu/Debian: sudo apt install gh
# Or download from: https://cli.github.com/

# Login
gh auth login

# Push
git push -u origin main
```

## Step 3: Build APK via GitHub Actions

After pushing:

1. Go to: https://github.com/Herookie7/tifto-customer-app
2. Click "Actions" tab
3. Click "Build Android APK" workflow
4. Click "Run workflow" → "Run workflow"
5. Wait 10-15 minutes
6. Download APK from "Artifacts" section

## Quick Commands

```bash
# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Add GitHub Actions workflow for APK build"

# Push
git push -u origin main
```

