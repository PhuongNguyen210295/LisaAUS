# Lisa Shifts

A phone app (Android and iPhone) that keeps your Allied Universal **Lisa** schedule
(lisa.aus.com → My Schedule) on your phone, with reminders before every shift.

## What it does

- **My Shifts tab**: your upcoming shifts grouped by week, with hours per week and a
  "Next shift in 3h 20m" card at the top. It works offline.
- **Lisa tab**: the real Lisa website. Sign in once (your normal login, including
  any 2-step check). Open **My Schedule**. Each week you look at is saved
  to the app. Tap Lisa's `>` arrow to save the weeks ahead as well.
- **Reminders**: a notification 15m, 30m, 1h or 2h before each shift, plus an
  optional 8 PM "working tomorrow" heads-up. These are stored on the phone, so they
  go off even when the app is closed or you have no signal.
- **Phone calendar (optional)**: copies shifts into a "Lisa Shifts" calendar so they
  show in Google Calendar / Apple Calendar and on home-screen widgets.
- **Auto-refresh**: when you open the app and the last sync was more than 3 hours
  ago, it quietly re-reads your schedule page in the background. If Lisa has signed
  you out, a banner asks you to sign in again. You can also pull down on My Shifts
  to refresh.

## How it connects to Lisa

Lisa has no public API. The app shows the real Lisa site, and a small script reads
the text of the My Schedule page (day, site, times) on your phone. Your password
goes only to Lisa. Your schedule is stored only on your phone and is never sent
anywhere else.

The reader is in `src/lib/parser.ts` and the tests are in `tests/parser.test.mjs`. If Lisa
changes its page layout and shifts stop showing up, that is the file to update.

## Install it on your phone

You need a free [Expo](https://expo.dev) account. You don't need a Mac or Android Studio.

```bash
npm install
npx eas-cli@latest login
# Android: makes an .apk you can download and install directly
npx eas-cli@latest build --platform android --profile preview
# iPhone: needs an Apple Developer account ($99/yr) for internal/TestFlight installs
npx eas-cli@latest build --platform ios --profile preview
```

When the build finishes, open the link on your phone and install the app.

> Expo Go can't run this app, because it uses native WebView, notification and calendar
> modules that Expo Go doesn't include. Use the EAS build above, or `npx expo run:android`
> if Android Studio is installed.

## Development

```bash
npm test           # schedule parser tests
npm run typecheck
npx expo start     # with a development build installed on your phone
```

This project is not made by, endorsed by or affiliated with Allied Universal.
