# EAR mobile (Expo)

React Native app for EAR (Eliya's Anonymous Replies): Expo SDK 57, React Native 0.86, expo-router. It talks to the same API as the web app
and authenticates with a bearer token kept in the platform keystore (`expo-secure-store`).

## Run it

From the repo root, `npm install`, then start the API (`:4000`) and:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://<api-host>:4000 npx expo start
```

`EXPO_PUBLIC_API_URL` must be reachable from the device:

| Where the app runs | Value |
|---|---|
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` (the default) |
| Physical device on the same Wi-Fi | `http://<your computer's LAN IP>:4000` (the API must listen on all interfaces) |
| Deployed API | `https://api.your-domain.example` |

Optional: `EXPO_PUBLIC_WEB_URL` is the public web origin. It is used for the "Download the app" invite link (`<web>/install`), answer links and the
Android/iOS universal-link config in `app.config.js` (`https://<host>/u/<name>` and `/l/<slug>` open the app). `EXPO_PUBLIC_EAS_PROJECT_ID`
is needed for push tokens in EAS builds.

- **Expo Go**: scan the QR code. Works for everything except push notifications (not available in Expo Go on Android) and universal links.
- **Development build** (full native features, push, deep links): `npx expo run:android` / `npx expo run:ios` (needs Android Studio / Xcode), or
  `eas build --profile development --platform android` and install the result.

Deep links use the `ear://` scheme, e.g. `ear://u/<username>` and `ear://l/<slug>`:
`npx uri-scheme open "ear://u/eliya" --android`.

## Languages (English / עברית) and RTL

The app is fully translated into English and Hebrew; Hebrew is right-to-left.

- **Dictionaries** live in `src/i18n/en.ts` and `src/i18n/he.ts`. `he.ts` is typed as the shape of `en.ts`, so a missing, extra or misspelled Hebrew key fails
  `npm run typecheck`; `t("some.key")` only accepts real dotted keys. Plural groups (`{ one, two, other }`) use `Intl.PluralRules` (Hebrew: one / two / other).
  Use `useT()` in components (`t`, `locale`, `isRTL`, `setLocale`, `formatDate`, `formatNumber`, `formatRelative`) and `translate()` from `src/i18n/core.ts` outside React.
  User-supplied strings passed to `t()` are wrapped in Unicode isolates in Hebrew so `@names`, emails and URLs cannot reorder a sentence (`isolate()`; strip them with
  `stripIsolates()` before handing text to the system share sheet or clipboard).
- **Which language**: the stored choice, else the device language (`expo-localization`: Hebrew -> עברית, anything else -> English). The choice is kept in
  SecureStore and, when signed in, saved to the account (`PATCH /settings { locale }`, which also drives emails and push text). If the user never picked a language
  on this device, the account's saved language wins after sign-in. `register` sends the current locale.
- **Picker**: welcome screen (top corner, before signing in) and a "Language / שפה" card in the Me tab.
- **API errors** come back already translated because the client sends `x-lang` (`getLang` in `src/lib/api.ts`); they are shown as-is. Only client-generated errors
  (offline, bare status codes) and the form validators are translated locally. `src/lib/api.integration.test.ts` checks a Hebrew `x-lang` against the real API.
- **Fonts**: Bricolage Grotesque and Inter have no Hebrew glyphs, so Hebrew text uses Heebo (same weights, loaded in `app/_layout.tsx`).
- iOS permission text and the Android/iOS supported-locale lists are configured in `app.json` (`locales/*.json`, `expo-localization` plugin).

### RTL needs a restart (honest limitation)

React Native fixes the layout direction at app start. When the language switch changes direction (English <-> Hebrew) the app calls
`I18nManager.allowRTL(true)` / `forceRTL(...)` (saved for the next launch) and shows a "Restart to finish switching" sheet:

- in development (Expo Go / dev client) the sheet's **Restart now** button reloads the bundle with `DevSettings.reload()`;
- in a release build the sheet asks the user to **close the app completely and open it again**. An in-process restart needs `expo-updates`
  (`Updates.reloadAsync()`), which this app does not bundle. If you add it, call it from `reloadApp()` in `src/i18n/index.tsx`.

Until the restart the text is already in the new language but the layout keeps the old direction (the layout-dependent helpers read the real native direction, so
arrows and swipe actions stay consistent with what is on screen). On a Hebrew device the first launch also asks for one restart. All layout code uses
`start`/`end` style props (`marginStart`, `paddingEnd`, `start: 0`, ...), `flexDirection: "row"` flips by itself, chevron/send/reply icons mirror, MessageCard
swipe actions open from the opposite edge in RTL, and email/username/password/URL fields are forced left-to-right.

## Tests

```bash
npm run typecheck -w @unsaid/mobile
npm test -w @unsaid/mobile                                   # unit tests
API_URL=http://localhost:4000 npm test -w @unsaid/mobile     # also runs src/lib/api.integration.test.ts against a live API
```

The integration test registers a user, checks Hebrew (`x-lang: he`) error messages from the live API, creates a round, sends public messages (including the proof-of-work solver from `src/lib/pow.ts`),
filters the inbox by round, replies, and logs out. It is skipped when `API_URL` is not set. Run `npx expo export --platform android` (and `ios`)
to check that the JS bundle compiles.

## Build an installable APK / IPA with EAS

`eas.json` defines `development`, `preview` (APK, internal distribution) and `production` profiles. Set the real URLs in the `preview` profile's `env`.

```bash
npm i -g eas-cli && eas login
cd apps/mobile
eas build:configure                      # links the project, writes the EAS project id into the dashboard
eas build --profile preview --platform android   # produces an installable .apk
eas build --profile preview --platform ios       # needs an Apple Developer account ($99/yr) and device registration
```

Free-tier limits (queue times, monthly build counts) are unverified here; check expo.dev/pricing. iOS builds always require a paid Apple Developer
account, so an iPhone cannot get a native build at zero cost. Android APKs can be sideloaded for free.

## Zero-cost alternative: install the PWA

The web app is installable without any store or build: open `<web-url>/install` on the phone (Safari: Share > Add to Home Screen; Chrome: Install app).
It shares the same API and works for owners and anonymous senders.

## Notes

- Brand: ink `#0b0a14`, ember `#ff7440`, Bricolage Grotesque + Inter. Assets live in `assets/` (icon, adaptive icon, splash, notification icon).
- Internal storage keys (`unsaid.session`, `unsaid.push`) keep the old project name on purpose, so existing sessions survive.
- Contract questions for the API are tracked in `CONTRACT_REQUESTS.md`.
