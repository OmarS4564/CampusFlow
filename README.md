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
