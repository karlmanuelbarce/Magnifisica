# MagnifisicaApp 🏃‍♂️

A comprehensive fitness tracking application built with React Native, Expo, and Firebase that helps users track their workouts, record running routes, and participate in fitness challenges.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Development](#development)
- [Testing](#testing)

## ✨ Features

### 🏠 Home & Workouts

- Track daily workout progress with circular progress indicator
- Add exercises from comprehensive library
- Mark exercises as complete
- Real-time synchronization across devices

### 🗺️ Route Recording

- GPS-based route tracking with MapLibre
- Real-time distance and time tracking
- Visual route display on interactive maps
- Save and view route history

### 🏆 Challenges

- Join community fitness challenges
- Track progress towards challenge goals
- Real-time notifications for new challenges
- View challenge history and completion status

### 👤 Profile

- Weekly activity charts
- Personal statistics dashboard
- Challenge progress overview
- Account management

### 🔐 Authentication

- Email/password authentication via Firebase
- Secure JWT token management
- Auto-refresh tokens (50-minute intervals)
- Admin role support

## 🛠️ Tech Stack

### Frontend

- **React Native** (0.81.5) - Mobile framework
- **Expo** (SDK 54) - Development platform
- **TypeScript** (~5.9.2) - Type safety
- **Zustand** (^5.0.8) - State management
- **React Navigation** - Navigation
- **React Query** (@tanstack/react-query ^5.90.10) - Data fetching & caching

### Backend & Services

- **Firebase Authentication** - User management
- **Firebase Firestore** - Real-time database
- **Firebase Crashlytics** - Crash reporting
- **Notifee** (^9.1.8) - Push notifications

### Maps & Location

- **MapLibre GL** (^10.2.1) - Map rendering
- **react-native-geolocation-service** (^5.3.1) - GPS tracking

### UI & Visualization

- **react-native-chart-kit** (^6.12.0) - Charts
- **react-native-circular-progress** (^1.4.1) - Progress indicators
- **react-native-vector-icons** (^10.3.0) - Icons
- **react-native-svg** (^15.14.0) - SVG support

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (18.x or 20.x recommended)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Firebase Project** with Firestore, Authentication, and Crashlytics enabled

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/MagnifisicaApp.git
   cd MagnifisicaApp
   ```

2. **Install dependencies**

   ```bash
   npm install --legacy-peer-deps
   ```

   > Note: `--legacy-peer-deps` is required due to React version constraints

3. **Set up environment variables**
   Create necessary configuration files (see [Configuration](#configuration))

4. **Run the app**

   ```bash
   # Start Metro bundler
   npm start

   # Run on Android
   npm run android

   # Run on iOS
   npm run ios
   ```

## ⚙️ Configuration

### Firebase Setup

1. **Create Firebase Project**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Crashlytics

2. **Android Configuration**

   - Download `google-services.json` from Firebase Console
   - Place it in `android/app/google-services.json`

3. **iOS Configuration**

   - Download `GoogleService-Info.plist` from Firebase Console
   - Place it in `ios/` directory

4. **Firestore Collections**
   Required collections:
   - `users` - User profiles and roles
   - `Challenge` - Fitness challenges
   - `exercises` - Exercise library
   - `exercises_taken_by_user` - User's exercise list
   - `routes` - Recorded running routes
   - `participants` - Challenge participation data

### MapTiler API Key

1. Get API key from [MapTiler](https://www.maptiler.com/)
2. Update in `src/screens/RecordScreen.tsx`:
   ```typescript
   const MAPTILER_API_KEY = "YOUR_API_KEY_HERE";
   ```

### Build Configuration

**android/build.gradle**

```gradle
buildscript {
    dependencies {
        classpath("com.google.gms:google-services:4.4.2")
        classpath("com.google.firebase:firebase-crashlytics-gradle:3.0.2")
    }
}
```

**android/app/build.gradle**

```gradle
apply plugin: "com.google.gms.google-services"
apply plugin: "com.google.firebase.crashlytics"
```

## 📁 Project Structure

```
MagnifisicaApp/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ChallengeCard.tsx
│   │   ├── ExerciseCard.tsx
│   │   └── ExerciseTodoCard.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useChallenges.ts
│   │   ├── useExercise.ts
│   │   ├── useExerciseLibrary.ts
│   │   ├── useRoute.ts
│   │   └── userProfile.ts
│   ├── navigations/         # Navigation configuration
│   │   ├── MainStackNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   └── RootStackNavigator.tsx
│   ├── screens/             # Screen components
│   │   ├── AddExercise.tsx
│   │   ├── AdminChallengeScreen.tsx
│   │   ├── ChallengeScreen.tsx
│   │   ├── ExerciseDetailScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── RecordScreen.tsx
│   ├── services/            # Firebase & API services
│   │   ├── challengeService.ts
│   │   ├── ExerciseLibraryService.ts
│   │   ├── ExerciseService.ts
│   │   ├── ProfileService.ts
│   │   ├── RouteService.ts
│   │   └── tokenRefreshService.ts
│   ├── store/               # Zustand state management
│   │   └── authstore.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── Exercise.ts
│   │   └── ExerciseTodo.ts
│   └── utils/               # Utility functions
│       └── logger.ts        # Centralized logging with Crashlytics
├── android/                 # Android native code
├── ios/                     # iOS native code
├── App.tsx                  # App entry point
├── package.json
└── tsconfig.json
```

## 🎯 Key Features

### 1. Centralized Logging System

All services, hooks, and screens use a centralized logger that:

- Provides structured logging with context
- Integrates with Firebase Crashlytics
- Supports different log levels (debug, info, warn, error, success)
- Automatically tracks user IDs and custom attributes
- Environment-aware (verbose in dev, production-ready in prod)

**Usage:**

```typescript
import { logger } from "../utils/logger";

logger.info("User logged in", { userId: user.uid }, "AuthStore");
logger.error("Failed to save route", error, "RouteService");
logger.success("Challenge created", { challengeId: id }, "ChallengeService");
```

### 2. Real-time Data Synchronization

- Uses Firestore's `onSnapshot` for real-time updates
- React Query manages caching and synchronization
- Optimistic updates for better UX
- Automatic cache invalidation

### 3. Route Recording

- GPS tracking with high accuracy
- Haversine distance calculation
- Real-time route visualization
- Route persistence in Firestore

### 4. Challenge System

- Admin panel for creating challenges
- Real-time progress tracking
- Push notifications for new challenges
- Automatic progress calculation

### 5. Token Management

- Automatic token refresh every 50 minutes
- Secure JWT storage
- Admin role verification
- Session persistence

## 🔧 Development

### Running in Development

```bash
# Clear cache and start fresh
npm start --clear

# Run on specific device
npx expo run:android --device "device-name"
npx expo run:ios --device "device-name"

# Run with verbose logging
npx expo run:android -- --verbose
```

### Debugging

1. **React Native Debugger**

   ```bash
   # Install
   brew install --cask react-native-debugger

   # Use Chrome DevTools
   npm start
   # Press 'j' to open debugger
   ```

2. **Crashlytics Dashboard**

   - View crashes: Firebase Console → Crashlytics
   - Filter by user, version, or device
   - Review stack traces and logs

3. **Logger Output**

   ```bash
   # Android
   adb logcat | grep -i "magnifisica"

   # iOS
   npx react-native log-ios
   ```

### Testing Libraries

- **Jest** (^30.2.0) - Test runner
- **@testing-library/react-native** (^13.3.3) - Component testing
- **@testing-library/jest-native** (^5.4.3) - Native matchers

## 📱 Deployment

### Android

1. **Generate Release APK**

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Build AAB for Play Store**

   ```bash
   ./gradlew bundleRelease
   ```

3. **Find output**
   - APK: `android/app/build/outputs/apk/release/`
   - AAB: `android/app/build/outputs/bundle/release/`

### iOS

1. **Archive for App Store**

   ```bash
   cd ios
   xcodebuild archive
   ```

2. **Export IPA**
   - Open Xcode
   - Product → Archive
   - Distribute App

### Environment Variables

For production builds, ensure:

- Firebase configuration files are up to date
- MapTiler API key is set
- Crashlytics is enabled
- Proper signing certificates are configured

## 📊 Monitoring

### Firebase Crashlytics

- Real-time crash reporting
- Custom logs with user context
- Performance monitoring
- User segmentation by role

### Analytics Events

Track key user actions:

- Exercise completion
- Route recording
- Challenge participation
- App opens/closes

### Coding Standards

- Use TypeScript for all new code
- Follow the existing logger pattern
- Add proper error handling
- Include JSDoc comments for functions
- Update tests when adding features

## 👥 Authors

- Karl Manuel Barce

## 🙏 Acknowledgments

- Firebase for backend services
- MapLibre for mapping functionality
- Expo team for amazing developer experience
- React Native community
