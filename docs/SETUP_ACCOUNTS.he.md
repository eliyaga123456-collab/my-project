# חיבורים שדורשים חשבון משלך (כולם חינמיים)

הקוד כבר תומך בכל אלה. חסרים רק הפרטים שלך, שמוסיפים ב-Render כמשתני סביבה (Dashboard ← השירות `ear` ← Environment). **אל תשלח אותם בצ'אט.** כל שינוי ב-Render מפעיל פריסה מחדש.

> המחירים והמכסות החינמיות שאני מציין הם לפי מה שאני זוכר ולא נבדקו עכשיו. כדאי לאמת בכל אתר.

## 1. מיילים אמיתיים (אימות מייל ואיפוס סיסמה)
בלי זה אי אפשר לאפס סיסמה. רק משתמש שזוכר אותה יכול להיכנס.
1. פותחים חשבון אצל ספק שליחה עם תוכנית חינמית, למשל **Brevo** או **Resend**.
2. מאמתים כתובת שולח (או דומיין). בלי דומיין משלך אפשר להתחיל מכתובת מייל אישית שהספק מאמת.
3. מעתיקים את פרטי ה-SMTP מהספק ובונים כתובת בצורה `smtp://משתמש:סיסמה@שרת:587`.
4. ב-Render מגדירים:
   - `EMAIL_TRANSPORT` = `smtp`
   - `SMTP_URL` = הכתובת מצעד 3
   - `EMAIL_FROM` = `EAR <הכתובת שאימתת>`

## 2. תמונות פרופיל שלא נמחקות
כרגע התמונות נשמרות על דיסק זמני ונעלמות כשהשרת מתחדש.
1. פותחים חשבון **Cloudflare** ויוצרים R2 bucket (יש תוכנית חינמית, ייתכן שיבקשו אמצעי תשלום לאימות, כדאי לבדוק).
2. יוצרים API token עם הרשאת קריאה וכתיבה ל-bucket.
3. ב-Render מגדירים:
   - `STORAGE_DRIVER` = `s3`
   - `S3_BUCKET` = שם ה-bucket
   - `S3_ENDPOINT` = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `S3_REGION` = `auto`
   - `AWS_ACCESS_KEY_ID` ו-`AWS_SECRET_ACCESS_KEY` = מה-token
   לא צריך להפוך את ה-bucket לציבורי: השרת מגיש את התמונות בעצמו.

## 3. התראות פוש באנדרואיד
בלי זה האפליקציה עובדת אבל לא תקבלו התראה כשמגיעה הודעה.
1. פותחים חשבון **Expo** חינמי ויוצרים פרויקט (EAS). שומרים את ה-Project ID.
2. פותחים פרויקט **Firebase** חינמי ומוסיפים אפליקציית Android עם המזהה `app.ear.mobile`. מורידים את `google-services.json`.
3. ב-Expo ← Credentials ← Android, מעלים מפתח חשבון שירות של FCM (Firebase ← Project settings ← Service accounts).
4. ב-GitHub ← Settings ← Secrets ← Actions, מוסיפים:
   - `GOOGLE_SERVICES_JSON_BASE64` = תוצאת `base64 -w0 google-services.json`
   ובנוסף משתנה (Variables) `EXPO_PUBLIC_EAS_PROJECT_ID` = ה-Project ID. אני אחבר אותו לבנייה כשתשלח לי שזה מוכן.
5. ב-Render משנים `EXPO_PUSH_ENABLED` ל-`true`.
6. מריצים בנייה חדשה של ה-APK.

## 4. שה-keep-alive יפעל (השרת לא יירדם)
הוא רץ רק מהענף הראשי. צריך למזג את הענף `claude/elegant-volta-5foywr` ל-`main` (Pull Request ב-GitHub). אחרי המיזוג כדאי לשנות ב-Render את `branch` ל-`main`.

## 5. דברים שאחרי כן
- מפתח חתימה, חשבון מפתח בגוגל פליי וחשבון Apple Developer: ראה `docs/PLAY_STORE.he.md`.
- לוח ניהול (אדמין): כרגע לא פרוס ב-Render. אם צריך אותו באינטרנט, תגיד לי.
