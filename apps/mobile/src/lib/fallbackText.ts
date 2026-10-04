/** Provider-independent bilingual strings for the crash screen and the boot screen (which render when i18n may be unavailable). */
export interface FallbackStrings { title: string; body: string; retry: string; connecting: string; connectingSlow: string; rtl: boolean }

const EN: FallbackStrings = {
  title: "Something went wrong",
  body: "EAR hit an unexpected problem. Your data is safe. Try again, and if it keeps happening, restart the app.",
  retry: "Try again",
  connecting: "Connecting to EAR…",
  connectingSlow: "The server is waking up. This can take up to a minute on the first launch.",
  rtl: false
};
const HE: FallbackStrings = {
  title: "משהו השתבש",
  body: "ב-EAR אירעה תקלה בלתי צפויה. המידע שלך שמור. נסו שוב, ואם זה חוזר, הפעילו את האפליקציה מחדש.",
  retry: "נסו שוב",
  connecting: "מתחבר ל-EAR…",
  connectingSlow: "השרת מתעורר. בהפעלה הראשונה זה יכול לקחת עד דקה.",
  rtl: true
};

export function fallbackStrings(languageCode: string | null | undefined): FallbackStrings {
  const base = (languageCode ?? "").toLowerCase().split(/[-_]/)[0];
  return base === "he" || base === "iw" ? HE : EN;
}
