# Firebase Authentication Fixes

## Fix #1: Update `useEmailOtp.js` to use authService

**File**: `src/screens/Otp/Email/useEmailOtp.js`

### Current Code (Lines 18-19):
```javascript
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { firebaseAuth } from '../../../services/firebase'
```

### Replace With:
```javascript
import { signUpWithEmail, signInWithEmail } from '../../../services/authService'
```

### Current Code (Lines 96-99):
```javascript
try {
  await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, userPassword)
} catch (firebaseError) {
  if (firebaseError?.code === 'auth/email-already-in-use') {
    await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, userPassword)
  } else {
    throw firebaseError
  }
}
```

### Replace With:
```javascript
try {
  const result = await signUpWithEmail(normalizedEmail, userPassword)
  if (!result.success) {
    // If sign-up fails due to email already in use, try sign-in
    if (result.error?.includes('already exists') || result.error?.includes('email-already-in-use')) {
      const signInResult = await signInWithEmail(normalizedEmail, userPassword)
      if (signInResult.success && signInResult.idToken) {
        await setFirebaseTokenAsync(signInResult.idToken)
      }
    } else {
      throw new Error(result.error)
    }
  } else if (result.success && result.idToken) {
    await setFirebaseTokenAsync(result.idToken)
  }
} catch (firebaseError) {
  console.log('Firebase user creation error', firebaseError)
}
```

### Remove (Line 104-108):
```javascript
const currentUser = firebaseAuth.currentUser
if (currentUser) {
  const idToken = await currentUser.getIdToken()
  await setFirebaseTokenAsync(idToken)
}
```
*(This is now handled in the authService functions)*

---

## Fix #2: Update `User.js` to use authService

**File**: `src/context/User.js`

### Current Code (Line 9):
```javascript
import { signOut } from 'firebase/auth'
import { firebaseAuth } from '../services/firebase'
```

### Replace With:
```javascript
import { signOutUser } from '../services/authService'
```

### Current Code (Lines 91-95):
```javascript
try {
  await signOut(firebaseAuth)
} catch (firebaseError) {
  console.log('Firebase sign-out error', firebaseError)
}
```

### Replace With:
```javascript
try {
  const result = await signOutUser()
  if (!result.success) {
    console.log('Firebase sign-out error', result.error)
  }
} catch (firebaseError) {
  console.log('Firebase sign-out error', firebaseError)
}
```

---

## Fix #3: Add Optional Chaining in `useLogin.js`

**File**: `src/screens/Login/useLogin.js`

### Current Code (Line 181):
```javascript
projectId: Constants.expoConfig.extra.eas.projectId
```

### Replace With:
```javascript
projectId: Constants.expoConfig?.extra?.eas?.projectId
```

---

## Summary

After applying these fixes:
- ✅ All Firebase auth operations will go through `authService.js`
- ✅ Consistent error handling across the app
- ✅ Better maintainability
- ✅ No direct Firebase imports in screens/contexts

