import type { DeepString } from "../../types";
import type { pub as en } from "../en/public";

export const pub: DeepString<typeof en> = {
  layout: { makeLink: "יוצרים קישור משלכם" },
  profile: {
    defaultPrompt: "שלחו לי הודעות אנונימיות!",
    whatsapp: "דברו איתי בוואטסאפ",
    roundClosed: "הסבב נסגר",
    round: "סבב אנונימי",
    answers: "תשובות",
    emptyTitle: "עוד אין תשובות פומביות",
    emptyBody: "תשובות פומביות של {name} יופיעו כאן."
  },
  meta: {
    sendTitle: "שלחו הודעה אנונימית אל {name}",
    roundDescription: "כל מה שתמיד רציתם להגיד אל {name}.",
    userDescription: "כל מה שתמיד רציתם להגיד אל {name}. אנונימי, אדיב ובטוח.",
    answerTitle: "התשובה של {name} על: “{question}”"
  },
  answer: {
    open: "פתיחה ושיתוף",
    more: "טעינת תשובות נוספות",
    shareTitle: "שיתוף התשובה",
    shareText: "{name} ב-EAR: “{question}”",
    askPrompt: "רוצים לשאול את {name} משהו?",
    sendButton: "שליחת הודעה אנונימית",
    note: "השאלות אנונימיות. <link>איך אנחנו שומרים על אווירה אדיבה</link>. לצורך בטיחות, מפעיל האתר יכול לראות פרטים טכניים מוגבלים (לא את שמך) של הודעות שדווחו למשך 14 יום."
  },
  send: {
    ideasLabel: "צריכים רעיון?",
    ideasShuffle: "עוד רעיונות",
    ideas: "מה תמיד רציתם לשאול אותי?|איזה שיר מזכיר לכם אותי?|תגידו לי משהו טוב שלא אמרתם בקול|מה היה הרושם הראשוני האמיתי שלכם ממני?|איזה כישרון שלי אתם מעריכים?|מה כדאי לי לעשות בסוף השבוע?|מה הדבר האחד שהייתם משנים בי? (בעדינות)|תשאלו אותי כל דבר, אענה בכנות",
    closedTitle: "הסבב הזה נסגר",
    closedBody: "כאן כבר לא אוספים הודעות עבור {name}. תודה שקפצתם!",
    startRound: "פותחים סבב משלכם",
    pausedTitle: "קבלת ההודעות של {name} מושהית",
    pausedBody: "הקישור הזה לא מקבל כלום כרגע. כדאי לחזור מאוחר יותר.",
    missingTitle: "הקישור הזה כבר לא קיים",
    missingBody: "יכול להיות שהוא שונה או הוסר.",
    sentTitle: "נשלח באופן אנונימי",
    sentBody: "ההודעה שלכם תגיע אל {name} בלי שום פרטי שולח. אם היא מפרה את הכללים, ייתכן שהיא תגיע לתיקיית המסוננות.",
    sendAnother: "שליחת הודעה נוספת",
    getLink: "לקבלת קישור משלכם",
    label: "הודעה אנונימית אל {name}",
    placeholder: "כתבו משהו...",
    verifying: "בדיקה קצרה שאתם לא בוט…",
    submit: "שליחה אנונימית",
    kind: "תהיו אדיבים. הטרדה מסוננת וניתנת לדיווח. הזהות שלכם נשארת חסויה בפני {name}, ו<link>כאן מוסבר בדיוק איך זה עובד</link>.",
    tooShort: "כתבו עוד קצת",
    tooLong: "עד {max} תווים"
  },
  errors: {
    generic: "משהו השתבש. נסו שוב.",
    rateLimitedWait: "אתם שולחים הרבה הודעות. קחו נשימה ונסו שוב בעוד {wait} בערך.",
    rateLimited: "אתם שולחים הרבה הודעות. קחו נשימה ונסו שוב בעוד קצת.",
    rejected: "ההודעה הזאת לא עברה. נסו לנסח אותה בעדינות.",
    check: "בדקו את ההודעה ונסו שוב.",
    seconds_one: "שנייה", seconds_two: "שתי שניות", seconds_other: "{count} שניות",
    minutes_one: "דקה", minutes_two: "שתי דקות", minutes_other: "{count} דקות"
  },
  share: {
    linkCopied: "הקישור הועתק",
    copyFailed: "ההעתקה לא הצליחה. סמנו את הקישור והעתיקו אותו ידנית.",
    share: "שיתוף…",
    download: "הורדת הכרטיס",
    shareTo: "שיתוף באמצעות",
    newTab: " (נפתח בלשונית חדשה)",
    email: "מייל"
  }
};
