# CampusFlow

A polished, local-first college planner built with Expo and React Native. It combines a Canvas-style assignment view with a calendar, agenda, and course dashboard.

## What is included

- Today dashboard with weekly workload and completion progress
- Month calendar with course-colored event indicators
- Assignments, exams, classes, study blocks, and personal events
- Daily or weekly repeating items with selectable weekdays and an end date
- Native calendar and 12-hour spinning time pickers—no typed dates or times
- Add, edit, complete, and delete planner items
- Add, edit, and delete courses
- On-device SQLite database that persists across app restarts
- Clean first launch with no sample courses or assignments
- iOS, Android, and experimental web support through Expo

## Run it

1. Install Node.js 22.13 or newer.
2. Install the Expo Go app on your phone.
3. In this folder, run:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code with Expo Go (Android) or the Camera app (iPhone).

For an Android emulator, run `npm run android`. For iOS Simulator on macOS, run `npm run ios`.

## iOS 27 and TestFlight builds

This SDK 57 project enables `ios.enableSceneSupport` through `expo-build-properties`.
Apps built with Xcode 27 require the UIKit scene lifecycle to launch on iOS 27.
Keep this plugin enabled while using SDK 57; it generates both the scene manifest
and the AppDelegate changes needed to start React Native in the scene's window.
See [Expo's SDK 57 scene lifecycle guide](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md#staying-on-sdk-57-with-xcode-27).

This is a native change, so install dependencies with `npm ci`, create a new iOS
build with a higher build number than the current TestFlight build, and upload it
to the same App Store Connect app. EAS Build generates the native iOS project
from `app.json` because this repository does not track an `ios` directory.
For a local Xcode build on macOS, run `npx expo prebuild --platform ios`
first (SDK 57 regenerates native projects by default). A JavaScript update or
restarting the existing TestFlight build cannot apply this fix.

Before distributing the replacement build, verify a cold launch, background and
resume, date/time pickers, and local reminders on both iOS 27 and the previous
supported iOS version. Also verify that an existing planner survives the update.

## Project structure

- `App.tsx` — app shell, navigation, and modal coordination
- `src/db/database.ts` — SQLite schema, queries, and starter data
- `src/context/PlannerContext.tsx` — shared planner state and actions
- `src/screens/` — Today, Calendar, Courses, and Settings views
- `src/components/` — reusable cards, navigation, and editors

## Data model

The app creates three SQLite tables:

- `courses`
- `events`
- `settings`

No sign-in or external server is required. App data stays in `campusflow.db` on the device unless the app is removed or its storage is cleared.
