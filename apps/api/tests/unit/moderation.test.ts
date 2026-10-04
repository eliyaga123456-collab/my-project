import { describe, expect, it } from "vitest";
import { moderate } from "../../src/moderation/engine";
import { foldForMatching } from "../../src/moderation/normalize";

const decision = (t: string, o = {}) => moderate(t, o).decision;
const cats = (t: string, o = {}) => moderate(t, o).categories;

describe("normalisation", () => {
  it("folds leetspeak glued to letters, but not standalone numbers or punctuation", () => {
    expect(foldForMatching("k1ll y0u")).toBe("kill you");
    expect(foldForMatching("I have 3 cats!")).toBe("i have 3 cats");
    expect(foldForMatching("hello!!")).toBe("hello");
  });
  it("collapses repeats, spacing tricks, zero-width and fullwidth chars", () => {
    expect(foldForMatching("killlllll")).toBe("kill");
    expect(foldForMatching("k i l l")).toBe("kill");
    expect(foldForMatching("ki​ll")).toBe("kill");
    expect(foldForMatching("ｋｉｌｌ")).toBe("kill");
  });
});

describe("allows normal, kind and curious messages", () => {
  const ok = [
    "What's your favourite song right now?",
    "I really admire how you handled that project, you inspire me",
    "Do you want to grab coffee sometime?",
    "you're not ugly, stop saying that",
    "I would kill for a slice of that pizza haha",
    "what's the best advice you ever got?",
    "מה האוכל האהוב עליך?",
    "I'm 25 and still figuring things out, any tips?",
    "Your new haircut looks great!!!",
    "Which country would you love to visit? Mine is Japan 🇯🇵"
  ];
  for (const t of ok) it(`allow: ${t}`, () => expect(decision(t)).toBe("allow"));
});

describe("threats / self-harm encouragement are rejected", () => {
  const bad: [string, string][] = [
    ["I will kill you", "threat"],
    ["im gonna hurt u", "threat"],
    ["you will die", "threat"],
    ["I know where you live", "threat"],
    ["k i l l   y o u r s e l f", "self_harm"],
    ["kys", "self_harm"],
    ["nobody would miss you", "self_harm"],
    ["go d1e", "self_harm"],
    ["אני אהרוג אותך", "threat"],
    ["תמות", "threat"]
  ];
  for (const [t, c] of bad) it(`reject: ${t}`, () => { const r = moderate(t); expect(r.decision).toBe("reject"); expect(r.categories).toContain(c); });
});

describe("other categories", () => {
  it("holds insults, rejects abusive ones", () => {
    expect(decision("you are so ugly")).toBe("hold");
    expect(decision("you are such a bitch")).toBe("reject");
    expect(decision("אתה כזה מכוער")).toBe("hold");
  });
  it("sexual solicitation rejected, mild sexual content held", () => {
    expect(decision("send nudes pls")).toBe("reject");
    expect(decision("you're so sexy af, so hot")).toBe("hold");
  });
  it("personal info: phone/email held, card numbers rejected", () => {
    expect(cats("call me on 054-123-4567")).toContain("personal_info");
    expect(decision("call me on 054-123-4567")).toBe("hold");
    expect(decision("email me at someone@example.com")).toBe("hold");
    expect(decision("my card is 4111 1111 1111 1111")).toBe("reject");
    expect(decision("order #12345")).toBe("allow");
  });
  it("spam: links held, many links rejected, promotions, shouting", () => {
    expect(decision("check this out https://example.com/x")).toBe("hold");
    expect(decision("https://a.com https://b.com https://c.com")).toBe("reject");
    expect(decision("free followers click here")).toBe("hold");
    expect(decision("THIS IS AN EXTREMELY LOUD MESSAGE FOR EVERYONE")).toBe("hold");
    expect(decision("hey ".repeat(10))).toBe("hold");
  });
  it("dangerous content", () => {
    expect(decision("how to make a bomb")).toBe("reject");
    expect(decision("selling weed cheap")).toBe("hold");
  });
  it("hate speech is rejected", () => {
    expect(decision("all muslims should die")).toBe("reject");
    expect(decision("I hate all gays")).toBe("hold");
  });
  it("possible distress is held (supportive, not punitive)", () => {
    const r = moderate("i want to die");
    expect(r.decision).toBe("hold");
    expect(r.categories).toContain("self_harm");
  });
});

describe("modes", () => {
  it("enhanced mode is stricter", () => {
    expect(decision("you are so cringe")).toBe("allow");
    expect(decision("you are so cringe", { enhanced: true })).toBe("hold");
    expect(decision("you are so ugly", { enhanced: true })).toBe("hold");
  });
  it("hidden words filter quietly (hold), never reject", () => {
    expect(decision("my ex was at the party", { hiddenWords: ["ex"] })).toBe("hold");
    const r = moderate("lets talk about pineapple pizza", { hiddenWords: ["Pineapple"] });
    expect(r.decision).toBe("hold");
    expect(r.categories).toEqual(["hidden_word"]);
    expect(decision("completely unrelated", { hiddenWords: ["pineapple"] })).toBe("allow");
  });
  it("hidden words are matched with obfuscation folded", () => {
    expect(decision("p1neapple is great", { hiddenWords: ["pineapple"] })).toBe("hold");
  });
});
