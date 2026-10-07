import { AvatarFrame } from "@/components/ui/AvatarFrame";
import { Avatar } from "@/components/ui";
import { AVATAR_FRAMES } from "@unsaid/shared";
export default function P() {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 24, padding: 30 }}>
    {AVATAR_FRAMES.map((f) => <div key={f} style={{ textAlign: "center" }}><Avatar name="Mara Vale" size={96} frame={f} animate /><div>{f}</div></div>)}
  </div>;
}
