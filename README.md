# Spelling Bee Buzz 🐝

A kid-friendly spelling bee app for Android and iOS (Expo / React Native).
Buzzy the bee says a word, your child spells it **out loud**, and the app checks it.

## Features
- **Voice spelling**: understands letter names ("bee ee ay ess…", "double L") using the phone's own speech recognizer.
- **Offline and private**: speech recognition runs on the device by default; nothing is sent anywhere. No ads, accounts or tracking.
- **Tap letters instead**: an on-screen letter keyboard when the mic isn't available.
- **Help buttons**: hear the word again, hear it slowly, or hear it in a sentence.
- **Rewards**: stars, streak bonuses, confetti, and six unlockable badges.
- **Parent area** (behind a grown-ups check): progress, accuracy, tricky words, custom word lists, settings.
- **Built-in lists**: Scripps 2026–27 study words for 3rd grade (One Bee) and 4th grade (Two Bee).

## Getting the Android app
Every push to `main` builds an installable APK in GitHub Actions
(**Actions → Build Android APK → latest run → Artifacts**). Unzip it and open the `.apk` on the phone
(allow "install unknown apps" when asked).

For offline voice, the phone needs Google's offline English speech pack
(Settings → search "offline speech recognition" / "Speech" → download English). The app asks Android to download it automatically.

## Developing
```bash
npm install
npm test          # letter-recognition tests
npx expo start    # run in a dev build (speech recognition needs a dev build, not Expo Go)
```

## Project layout
- `src/speech/letters.ts`: turns spoken letter names into letters and checks the spelling
- `src/speech/useSpellListener.ts`: on-device speech recognition hook
- `src/screens/`: Home, Play, Results, Parent gate, Parent area
- `src/data/wordlists.ts`: built-in word lists with example sentences
