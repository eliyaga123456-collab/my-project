import { ImageResponse } from "next/og";
import { publicApi } from "@/lib/server-api";

export const alt = "An answer on Unsaid";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export default async function Image({ params }: { params: Promise<{ answerId: string }> }) {
  const { answerId } = await params;
  let question = "What have you been meaning to say?";
  let answer = "Get your own link and find out.";
  let author = "Unsaid";
  let handle = "";
  try {
    const a = await publicApi.answers.get(answerId);
    question = clip(a.question, 150);
    answer = clip(a.answer, 230);
    author = clip(a.author.displayName, 28);
    handle = `@${a.author.username}`;
  } catch { /* render the generic card */ }

  const qSize = question.length > 90 ? 34 : 42;
  const aSize = answer.length > 150 ? 34 : answer.length > 80 ? 42 : 52;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0b0a14", color: "#f6f4ff", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", left: -140, top: -160, width: 620, height: 620, borderRadius: 999, background: "#ff7440", opacity: 0.35, filter: "blur(90px)", display: "flex" }} />
        <div style={{ position: "absolute", right: -160, bottom: -200, width: 700, height: 700, borderRadius: 999, background: "#6d62f2", opacity: 0.45, filter: "blur(100px)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: "56px 72px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#ff7440,#b24cff 55%,#6d62f2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28, fontWeight: 800 }}>U</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, display: "flex" }}>Unsaid</div>
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#a6a3c7" }}>{handle}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", position: "relative" }}>
            <div style={{ display: "flex", background: "linear-gradient(135deg,#ff7440,#b24cff 60%,#6d62f2)", color: "#1a0d07", padding: "22px 30px", borderRadius: 24, fontSize: qSize, fontWeight: 800, lineHeight: 1.15, transform: "rotate(-3deg)", alignSelf: "flex-start", maxWidth: 900, boxShadow: "0 24px 60px -20px rgba(0,0,0,.6)", marginLeft: -12 }}>
              {question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: -16, background: "#181730", border: "2px solid rgba(255,255,255,.1)", borderRadius: 32, padding: "52px 44px 36px", fontSize: aSize, fontWeight: 600, lineHeight: 1.2 }}>
              <div style={{ display: "flex" }}>{answer}</div>
              <div style={{ display: "flex", marginTop: 24, fontSize: 24, fontWeight: 600, color: "#a6a3c7" }}>{author} · answered on Unsaid</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { "cache-control": "public, max-age=300, s-maxage=300" } }
  );
}
