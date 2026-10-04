import type { DeepString } from "../../types";
import type { auth as en } from "../en/auth";

export const auth: DeepString<typeof en> = {
  androidNote: "באנדרואיד, אפליקציית EAR המקורית היא הדרך המומלצת להשתמש בחשבון. <link>להורדת אפליקציית האנדרואיד</link>. גרסת הווב הזאת מיועדת בעיקר לאייפון.",
  login: {
    metaTitle: "התחברות",
    title: "ברוכים השבים",
    subtitle: "מתחברים כדי לקרוא מה אנשים השאירו לכם.",
    newHere: "חדשים כאן?",
    createProfile: "יוצרים פרופיל",
    email: "מייל",
    password: "סיסמה",
    emailInvalid: "הזינו כתובת מייל תקינה",
    passwordRequired: "הזינו את הסיסמה",
    forgot: "שכחתם סיסמה?",
    submit: "התחברות",
    badCredentials: "המייל או הסיסמה שגויים."
  },
  signup: {
    metaTitle: "יצירת פרופיל",
    title: "מקבלים קישור משלכם",
    subtitle: "יוצרים פרופיל ומתחילים לקבל הודעות אנונימיות.",
    haveAccount: "כבר יש לכם חשבון?",
    logIn: "התחברות",
    email: "מייל",
    username: "שם משתמש",
    displayName: "שם תצוגה (לא חובה)",
    password: "סיסמה",
    checking: "בודקים…",
    available: "‏@{name} פנוי",
    usernameHint: "{min}-{max} אותיות באנגלית, ספרות או קו תחתון. זה הקישור שלכם: {link}",
    taken: "שם המשתמש הזה תפוס.",
    usernameInvalid: "יש להשתמש ב-{min} עד {max} אותיות באנגלית, ספרות או קו תחתון.",
    emailInvalid: "הזינו כתובת מייל תקינה",
    passwordInvalid: "בחרו סיסמה באורך {min} עד {max} תווים",
    displayNameInvalid: "שם התצוגה ארוך מדי",
    submit: "יצירת הפרופיל שלי",
    terms: "בהמשך אתם מסכימים ל<terms>תנאי השימוש</terms> ול<privacy>מדיניות הפרטיות</privacy> שלנו."
  },
  forgot: {
    metaTitle: "שכחתי סיסמה",
    title: "איפוס הסיסמה",
    subtitle: "נשלח לכם קישור במייל כדי לבחור סיסמה חדשה.",
    back: "חזרה להתחברות",
    email: "מייל",
    emailInvalid: "הזינו כתובת מייל תקינה",
    submit: "שליחת קישור לאיפוס",
    sentTitle: "בדקו את תיבת הדואר",
    sentBody: "אם קיים חשבון עבור <b>{email}</b>, קישור לאיפוס בדרך אליו. תוקפו קצר, אז כדאי להשתמש בו מיד."
  },
  verify: {
    metaTitle: "אימות מייל",
    title: "אימות כתובת מייל",
    loading: "מאמתים את המייל שלכם…",
    okTitle: "המייל אומת",
    okBody: "עכשיו אפשר לפרסם תשובות פומביות.",
    goInbox: "לתיבת ההודעות שלי",
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
    requestNew: "לבקשת קישור חדש",
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
