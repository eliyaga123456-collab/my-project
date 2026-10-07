import { useEffect, useState } from "react";

/** Brand splash shown once per page load: rings + glowing logo, then it zooms away. */
export function Splash() {
  const [on, setOn] = useState(true);
  useEffect(() => { const id = setTimeout(() => setOn(false), 2300); return () => clearTimeout(id); }, []);
  if (!on) return null;
  return <div className="splash" aria-hidden><i className="ring r1" /><i className="ring r2" /><i className="ring r3" /><div className="splash-logo">EAR<span>*</span><small>ADMIN</small></div></div>;
}
