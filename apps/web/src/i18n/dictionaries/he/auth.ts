import type { DeepString } from "../../types";
import type { auth as en } from "../en/auth";

export const auth: DeepString<typeof en> = {
  openApp: "פתיחת אפליקציית EAR",
  verify: {
    metaTitle: "אימות מייל",
    title: "אימות כתובת מייל",
    loading: "מאמתים את המייל שלכם…",
    okTitle: "המייל אומת",
    okBody: "עכשיו אפשר לפרסם תשובות פומביות.",
    missing: "קישור האימות הזה חלקי",
    invalid: "הקישור הזה לא תקין או שפג תוקפו",
    badBody: "התחברו ובחרו ב“שליחה מחדש של מייל אימות” בבאנר שבראש תיבת ההודעות."
  },
  reset: {
    title: "בחירת סיסמה חדשה",
    incompleteTitle: "קישור האיפוס הזה חלקי.",
    incompleteBody: "בקשו קישור חדש והשתמשו בקישור מהמייל האחרון.",
    newPassword: "סיסמה חדשה",
    confirmPassword: "אימות הסיסמה החדשה",
    submit: "קביעת סיסמה חדשה",
    mismatch: "הסיסמאות לא תואמות",
    invalidPassword: "הסיסמה לא תקינה",
    invalidLink: "קישור האיפוס הזה לא תקין או שפג תוקפו. בקשו קישור חדש.",
    requestNew: "לבקשת קישור חדש באפליקציה",
    doneTitle: "הסיסמה עודכנה",
    doneBody: "התנתקתם מכל המכשירים. התחברו עם הסיסמה החדשה."
  },
  password: {
    show: "הצגת הסיסמה",
    hide: "הסתרת הסיסמה",
    rules: "כללי הסיסמה",
    ruleLen: "לפחות {min} תווים",
    ruleMax: "לכל היותר {max} תווים",
    ruleMix: "שילוב של אותיות ומספרים או סימנים (מומלץ)",
    met: " (מתקיים)",
    notMet: " (עוד לא מתקיים)",
    tooShort: "הסיסמה חייבת להכיל לפחות {min} תווים"
  }
};
