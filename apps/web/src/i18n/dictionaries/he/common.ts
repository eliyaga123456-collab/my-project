import type { DeepString } from "../../types";
import type { common as en } from "../en/common";

export const common: DeepString<typeof en> = {
  brand: { name: "EAR", full: "Eliya's Anonymous Replies", tagline: "תגידו מה אתם באמת חושבים.", dedication: "* ללירון 💛", dedicationSr: "מוקדש ללירון" },
  language: { label: "שפה", switchTo: "החלפת שפה", english: "English", hebrew: "עברית" },
  nav: { skip: "דלגו לתוכן", home: "דף הבית של EAR", logIn: "התחברות", getYourLink: "לקבלת הקישור שלי", getTheApp: "הורדת האפליקציה" },
  state: { loading: "טוען…", retry: "לנסות שוב", close: "סגירה", cancel: "ביטול", save: "שמירה", delete: "מחיקה", copy: "העתקת קישור", copied: "הועתק", error: "משהו השתבש", closeDialog: "סגירת החלון", dismiss: "סגירת ההודעה" },
  theme: { label: "ערכת נושא: {mode}. החלפת ערכת נושא", system: "אוטומטית", light: "בהירה", dark: "כהה" },
  time: {
    justNow: "הרגע",
    minutesAgo_one: "לפני דקה", minutesAgo_two: "לפני שתי דקות", minutesAgo_other: "לפני {count} דקות",
    hoursAgo_one: "לפני שעה", hoursAgo_two: "לפני שעתיים", hoursAgo_other: "לפני {count} שעות",
    daysAgo_one: "לפני יום", daysAgo_two: "לפני יומיים", daysAgo_other: "לפני {count} ימים"
  }
};
