import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/** Brand splash shown once per page load: glow, expanding rings, sparkles around the logo, then it zooms away. */
export function Splash() {
  const [on, setOn] = useState(true);
  useEffect(() => { const id = setTimeout(() => setOn(false), 2400); return () => clearTimeout(id); }, []);
  if (!on) return null;
  return (
    <div className="splash" aria-hidden>
      <i className="splash-glow" />
      <i className="ring r1" /><i className="ring r2" /><i className="ring r3" />
      <i className="spark s1" /><i className="spark s2" /><i className="spark s3" /><i className="spark s4" /><i className="spark s5" />
      <Logo className="splash-logo" alt="" />
      <div className="splash-bar"><i /></div>
    </div>
  );
}
