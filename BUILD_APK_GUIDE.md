# How to Build APK Without Android Studio or Expo Dev

## Option 1: GitHub Actions (Recommended - FREE)

### Steps:

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **The workflow file is already created** at `.github/workflows/build-apk.yml`

3. **Trigger the build**:
   - Go to your GitHub repository
   - Click on "Actions" tab
   - Click "Build Android APK" workflow
   - Click "Run workflow" button
   - Select your branch and click "Run workflow"

4. **Download the APK**:
   - After build completes (takes ~10-15 minutes)
   - Go to "Actions" tab
   - Click on the completed workflow run
   - Scroll down to "Artifacts"
   - Download "app-debug" - this is your APK file!

### Benefits:
- ✅ Completely FREE
- ✅ No Android Studio needed
- ✅ No local resources used
- ✅ Works on any computer
- ✅ Can be automated

---

## Option 2: Use a Cloud VM (Alternative)

If GitHub Actions doesn't work, you can use:

### Google Cloud Shell (FREE tier):
1. Go to https://shell.cloud.google.com
2. Clone your repo
3. Install Node.js and setup Android SDK
4. Run: `cd tifto-customer-app/android && ./gradlew assembleDebug`

### AWS Cloud9 (FREE tier):
Similar process to Google Cloud Shell

---

## Option 3: Use a Friend's Computer

If someone has Android Studio installed:
1. Clone your repo
2. Open Android Studio
3. Open `tifto-customer-app/android` folder
4. Build > Build Bundle(s) / APK(s) > Build APK(s)

---

## Option 4: Minimal Local Build (If you have 4GB+ free)

You can try building with minimal Android SDK (no full Android Studio):

```bash
cd tifto-customer-app

# Install Android SDK command line tools only
# Download from: https://developer.android.com/studio#command-tools

# Set environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Build
cd android
./gradlew assembleDebug
```

**Note**: This still requires ~2-3GB for SDK, so might not work with only 2GB free.

---

## Recommended: GitHub Actions

**GitHub Actions is the best solution** because:
- ✅ No local resources needed
- ✅ Completely free
- ✅ Works from any device
- ✅ Can be triggered manually or automatically
- ✅ APK is downloadable as artifact

Just push your code and trigger the workflow!

