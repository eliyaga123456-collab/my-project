import { ImageResponse } from "next/og";

export const alt = "Unsaid — say the unsaid";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0b0a14", color: "#f6f4ff", fontFamily: "sans-serif", alignItems: "center", padding: "0 90px" }}>
        <div style={{ position: "absolute", left: -120, top: -140, width: 600, height: 600, borderRadius: 999, background: "#ff7440", opacity: 0.4, filter: "blur(90px)", display: "flex" }} />
        <div style={{ position: "absolute", right: -140, bottom: -180, width: 680, height: 680, borderRadius: 999, background: "#6d62f2", opacity: 0.5, filter: "blur(100px)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#ff7440,#b24cff 55%,#6d62f2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 34, fontWeight: 800 }}>U</div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800 }}>Unsaid</div>
          </div>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 800, lineHeight: 1.02, marginTop: 40, letterSpacing: -3 }}>Say the unsaid.</div>
          <div style={{ display: "flex", fontSize: 36, color: "#a6a3c7", marginTop: 24 }}>Your link. Anonymous messages. Your terms.</div>
        </div>
      </div>
    ),
    size
  );
}
