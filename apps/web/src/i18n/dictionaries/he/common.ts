import type { DeepString } from "../../types";
import type { common as en } from "../en/common";

export const common: DeepString<typeof en> = {
  brand: { name: "EAR", full: "Eliya's Anonymous Replies", tagline: "תגידו מה אתם באמת חושבים.", dedication: "* ללירון 💛", dedicationSr: "מוקדש ללירון" },
  language: { label: "שפה", switchTo: "החלפת שפה", english: "English", hebrew: "עברית" },
  nav: { skip: "דלגו לתוכן", home: "דף הבית של EAR", logIn: "התחברות", getYourLink: "לקבלת הקישור שלי", getTheApp: "הורדת האפליקציה" },
  state: { loading: "טוען…", retry: "לנסות שוב", close: "סגירה", cancel: "ביטול", save: "שמירה", delete: "מחיקה", copy: "העתקת קישור", copied: "הועתק" }
};
