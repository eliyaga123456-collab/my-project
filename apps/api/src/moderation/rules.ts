import type { ModerationCategory } from "@unsaid/shared";

export interface Rule {
  category: ModerationCategory;
  /** Contribution to the score. 100 = reject on its own in standard mode, 50 = hold. */
  weight: number;
  pattern: RegExp;
  /** Skip the match when it is preceded by a negation within a few words ("you're not ugly"). */
  negatable?: boolean;
  reason: string;
}

const dec = (b64: string) => Buffer.from(b64, "base64").toString("utf8");
// Slurs are stored encoded so the source tree does not contain them in plain text. Matched on folded text.
const SLURS = [
  "bmlnZ2Vy", "bmlnZ2E=", "ZmFnZ290", "ZmFn", "dHJhbm55", "cmV0YXJk", "a2lrZQ==", "Y2hpbms=", "c3BpYw==", "d2V0YmFjaw=="
].map(dec);
export const slurPattern = new RegExp(`\\b(?:${SLURS.join("|")})s?\\b`);

const you = String.raw`(?:you|u|ur|youre|you re|your|ya)`;
const be = String.raw`(?:are|r|is|re|am|be)`;
const neg = String.raw`(?:not|never|no|dont|don t|isn t|isnt|aren t|arent|nt)`;

const INSULTS = [
  "idiot", "stupid", "dumb", "ugly", "loser", "fat", "disgusting", "worthless", "pathetic", "trash", "garbage", "moron",
  "retarded", "creep", "freak", "annoying", "fake", "clown", "waste of space", "waste of oxygen", "hideous", "gross"
];
const PROFANE_INSULTS = ["slut", "whore", "bitch", "cunt", "bastard", "asshole", "dickhead", "scumbag", "piece of shit", "shit"];

export const RULES: Rule[] = [
  // ---- threats ----
  { category: "threat", weight: 100, reason: "violent threat", pattern: /\b(?:i|we)(?: will| ll| m going to| am going to| m gonna| am gonna| gonna| wanna| want to|ll)? (?:kill|murder|stab|shoot|strangle|hurt|beat up|beat|rape|burn|destroy|end) (?:you|u|ya)\b/ },
  { category: "threat", weight: 100, reason: "violent threat", pattern: /\b(?:you|u) (?:will|re going to|are going to|gonna|better) (?:die|be dead|get hurt|get killed|regret)\b/ },
  { category: "threat", weight: 100, reason: "implied surveillance threat", pattern: /\bi know where (?:you|u) (?:live|sleep|work|go to school)\b/ },
  { category: "threat", weight: 100, reason: "violent threat", pattern: /\b(?:watch your back|sleep with one eye open|coming for you|find you and)\b/ },
  { category: "threat", weight: 100, reason: "mass violence", pattern: /\b(?:shoot up|bomb|blow up) (?:the |your |our )?(?:school|class|mall|office|party|concert)\b/ },
  { category: "threat", weight: 100, reason: "hebrew threat", pattern: /(?:אני )?(?:אהרוג|ארצח|אשבור|אדקור|אירה) (?:אותך|אתכם)|אני יודע (?:איפה )?(?:אתה|את) גר|תמות|תמותי|שתמות/ },
  // ---- harassment aimed at self-harm ----
  { category: "self_harm", weight: 100, reason: "encouraging self-harm", pattern: /\b(?:kill yourself|kys|go die|hang yourself|slit your|end yourself|off yourself|jump off|unalive yourself|drink bleach)\b/ },
  { category: "self_harm", weight: 100, reason: "encouraging self-harm", pattern: /\b(?:you should|should|just|please|hope you) (?:die|disappear|not exist|kill yourself)\b/ },
  { category: "self_harm", weight: 100, reason: "encouraging self-harm", pattern: /\bnobody (?:would |will )?(?:miss|care about) (?:you|u)\b|\bworld (?:would be|is) better without (?:you|u)\b/ },
  { category: "self_harm", weight: 100, reason: "hebrew self-harm encouragement", pattern: /תתאבד|לך תמות|כדאי שתמות|העולם יהיה טוב יותר בלעדיך/ },
  // sender expressing own distress -> hold (supportive, not punitive)
  { category: "self_harm", weight: 55, reason: "possible distress", pattern: /\b(?:i|im|i m|i am)(?: really| so)? (?:want to|wanna|going to|gonna) (?:die|kill myself|end it|end my life|disappear)\b|\bsuicid(?:e|al)\b|\bhurt(?:ing)? myself\b|\bself harm\b/ },
  // ---- hate ----
  { category: "hate", weight: 100, reason: "slur", pattern: slurPattern },
  { category: "hate", weight: 100, reason: "hate speech", pattern: /\b(?:all|every|those|these) (?:jews|muslims|christians|blacks|whites|gays|lesbians|trans(?:gender)? people|immigrants|refugees|arabs|asians|women|men|disabled people) (?:should|must|need to|deserve to) (?:die|burn|be killed|be gassed|disappear|go back)\b/ },
  { category: "hate", weight: 55, reason: "hateful generalisation", pattern: /\bi hate (?:all )?(?:jews|muslims|christians|blacks|gays|lesbians|trans(?:gender)? people|immigrants|refugees|arabs|asians|disabled people)\b/ },
  { category: "hate", weight: 100, reason: "hebrew hate speech", pattern: /(?:כל ה|צריך להרוג את ה|מוות ל)(?:ערבים|יהודים|מוסלמים|הומואים|להט״ב|אתיופים)/ },
  // ---- harassment ----
  { category: "harassment", weight: 55, negatable: true, reason: "insult", pattern: new RegExp(String.raw`\b${you} ${be} (?:such |so |really |a |an |the |just )*(?:${INSULTS.join("|")})\b`) },
  { category: "harassment", weight: 100, negatable: true, reason: "abusive insult", pattern: new RegExp(String.raw`\b${you} ${be} (?:such |so |really |a |an |the |just )*(?:${PROFANE_INSULTS.join("|")})\b`) },
  { category: "harassment", weight: 100, reason: "abusive insult", pattern: /\b(?:fuck|screw|eat shit|go to hell|shut the fuck up)(?: off| you| yourself| u)?\b.*\b(?:you|u|yourself)\b|\bfuck (?:you|u|off)\b|\bstfu\b/ },
  { category: "harassment", weight: 55, reason: "targeted harassment", pattern: /\b(?:everyone|nobody|no one) (?:hates|can t stand|is laughing at|thinks you re)\b|\bno one likes (?:you|u)\b|\bnobody likes (?:you|u)\b|\bkill (?:your ?self)\b/ },
  { category: "harassment", weight: 55, reason: "hebrew insult", pattern: /(?:אתה|את|אתם) (?:כזה |כזאת )?(?:מכוער|מכוערת|מטומטם|מטומטמת|דפוק|דפוקה|חרא|דוחה|מגעיל|מגעילה|אפס|לוזר|שמן|שמנה|פתטי|פתטית)|בן זונה|בת זונה|זונה|שרמוטה|כוס אמק|יא חרא/ },
  // ---- sexual ----
  { category: "sexual", weight: 100, reason: "solicitation of explicit images", pattern: /\b(?:send|show|snap|dm|give) (?:me )?(?:ur |your |some |a few )?(?:nudes?|nude pics?|nsfw|dick pics?|tits|boobs|pussy|feet pics?)\b|\bnudes?\b.*\b(?:send|pls|please)\b/ },
  { category: "sexual", weight: 100, reason: "sexual harassment", pattern: /\b(?:suck my|lick my|i want to (?:fuck|sleep with|bang)|wanna (?:fuck|bang|hook up)|let s (?:fuck|have sex|hook up)|fuck you hard|have sex with you|sleep with me)\b/ },
  { category: "sexual", weight: 55, reason: "sexual content", pattern: /\b(?:horny|sexy af|so hot|turn(?:ed)? me on|porn|onlyfans|erotic|sex tape|blowjob|handjob|orgasm|masturbat\w*|cum|dick|cock|pussy|boobs|tits)\b/ },
  { category: "sexual", weight: 70, reason: "hebrew sexual content", pattern: /תשלח(?:י)? (?:לי )?(?:תמונות עירום|נודז|עירום)|לזיין אותך|אני רוצה לזיין|מצץ|מוצצת/ },
  // ---- personal info ----
  { category: "personal_info", weight: 60, reason: "email address", pattern: /[a-z0-9._%+\-]{2,}\s?(?:@|at)\s?[a-z0-9\-]{2,}\s?(?:\.|dot)\s?(?:com|net|org|io|co|il|me|edu|gov|de|uk)\b/ },
  { category: "personal_info", weight: 60, reason: "address", pattern: /\b(?:i live at|you live at|your address is|home address|lives at)\b|\b\d{1,5} [a-z]+ (?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/ },
  { category: "personal_info", weight: 60, reason: "doxxing language", pattern: /\b(?:i (?:found|have|got) your (?:address|number|phone|school|location|ip)|dox(?:x)?ed?|leak(?:ing|ed)? your (?:address|number|nudes|photos|pics))\b/ },
  { category: "personal_info", weight: 60, reason: "hebrew personal info", pattern: /הכתובת שלך|אני יודע איפה אתה גר|פרסמתי את הטלפון שלך/ },
  // ---- dangerous ----
  { category: "dangerous", weight: 100, reason: "weapon / explosive instructions", pattern: /\bhow to (?:make|build|cook|assemble) (?:a |an )?(?:bomb|explosive|pipe bomb|meth|molotov|silencer|ghost gun|nerve agent|poison)\b/ },
  { category: "dangerous", weight: 55, reason: "drug sale / solicitation", pattern: /\b(?:buy|sell|selling|cheap|hmu for|plug for) (?:weed|coke|cocaine|meth|molly|mdma|xanax|percs?|pills|lsd|heroin|fentanyl|guns?|ammo)\b/ },
  { category: "dangerous", weight: 55, reason: "dangerous challenge", pattern: /\b(?:try the )?(?:blackout challenge|choking game|tide pod challenge)\b/ },
  // ---- spam ----
  { category: "spam", weight: 55, reason: "link", pattern: /(?:https?:\/\/|www\.)\S+|\b[a-z0-9\-]{2,}\.(?:com|net|org|io|co|ru|xyz|top|ly|gg|me|tv|link|click|shop|site|online)\b\S*/ },
  { category: "spam", weight: 55, reason: "promotion", pattern: /\b(?:follow me|follow for follow|f4f|sub4sub|check out my|click (?:here|the link|my bio)|link in (?:bio|my profile)|free (?:followers|robux|vbucks|v bucks|giveaway|gift ?card)|dm me|add me on (?:snap|snapchat|insta|instagram|telegram|whatsapp|discord)|promo code|crypto (?:giveaway|signal)|earn \$?\d+|make money fast|casino|betting|forex)\b/ },
  { category: "spam", weight: 55, reason: "contact handle", pattern: /\b(?:snap(?:chat)?|insta(?:gram)?|tele(?:gram)?|kik|discord|whatsapp)\s*(?:is|:|-)?\s*@?[a-z0-9._]{3,}\b/ }
];

/** Context rules that look at structure rather than words (return weight/category/reason or null). */
export function structuralSignals(raw: string): { category: ModerationCategory; weight: number; reason: string }[] {
  const out: { category: ModerationCategory; weight: number; reason: string }[] = [];
  const letters = raw.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 25) {
    const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
    if (upper / letters.length > 0.8) out.push({ category: "spam", weight: 55, reason: "shouting" });
  }
  const emojiCount = (raw.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emojiCount > 15) out.push({ category: "spam", weight: 55, reason: "emoji flood" });
  const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const max = Math.max(...counts.values());
    if (max >= 6 && max / words.length > 0.5) out.push({ category: "spam", weight: 55, reason: "repetition" });
  }
  if (/(.)\1{14,}/u.test(raw)) out.push({ category: "spam", weight: 55, reason: "character flood" });
  return out;
}
export const NEGATION = new RegExp(String.raw`\b${neg}\b(?:\s+\w+){0,2}\s*$`);
