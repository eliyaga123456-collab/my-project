import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Activity, CircleHelp, FileClock, Flag, LayoutDashboard, LogOut, Menu, Radio, ShieldAlert, ShieldCheck, Users, X } from "lucide-react";
import { useAuth } from "./auth";
import { Splash } from "./ui/Splash";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { UsersPage } from "./pages/Users";
import { ReportsPage } from "./pages/Reports";
import { ModerationPage } from "./pages/Moderation";
import { AuditPage } from "./pages/Audit";
import { AbusePage } from "./pages/Abuse";
import { ActivityPage } from "./pages/ActivityPage";
import { HealthPage } from "./pages/Health";
import { RoundsPage } from "./pages/RoundsPage";
import { RoundDetail } from "./pages/RoundDetail";
import { UserDetail } from "./pages/UserDetail";
import { HelpPage } from "./pages/HelpPage";
import { useT, type Key } from "./i18n";
import { Badge, IconButton, LanguageSwitcher, Logo, Ltr, Skeleton, ThemeToggle } from "./ui";

const NAV: { to: string; label: Key; icon: typeof Users; end?: boolean }[] = [
  { to: "/", label: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/rounds", label: "nav.rounds", icon: Radio },
  { to: "/activity", label: "nav.activity", icon: Activity },
  { to: "/users", label: "nav.users", icon: Users },
  { to: "/reports", label: "nav.reports", icon: Flag },
  { to: "/moderation", label: "nav.moderation", icon: ShieldCheck },
  { to: "/abuse", label: "nav.abuse", icon: ShieldAlert },
  { to: "/audit", label: "nav.audit", icon: FileClock },
  { to: "/health", label: "nav.health", icon: Activity },
  { to: "/help", label: "nav.help", icon: CircleHelp }
];
const TABS = ["/", "/rounds", "/reports", "/users"];

export function App() {
  return <><Splash /><AppInner /></>;
}

function AppInner() {
  const { phase } = useAuth();
  const { t } = useT();
  if (phase === "loading") return <div className="boot" role="status" aria-label={t("common.loading")}><Skeleton width={160} height={20} /></div>;
  if (phase === "anonymous") return <Login />;
  return <Shell />;
}

function Shell() {
  const { user, logout } = useAuth();
  const { t, te } = useT();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="shell">
      <a href="#main" className="skip">{t("common.skipToContent")}</a>
      <header className="topbar">
        <IconButton label={open ? t("nav.closeMenu") : t("nav.openMenu")} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sidebar"><Menu size={20} aria-hidden /></IconButton>
        <Logo className="top-logo" />
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden />}
      <aside id="sidebar" className={`sidebar ${open ? "open" : ""}`} aria-label={t("nav.primary")}>
        <div className="sidebar-head">
          <Logo className="side-logo" />
          <IconButton label={t("nav.closeMenu")} className="only-mobile" onClick={() => setOpen(false)}><X size={18} aria-hidden /></IconButton>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <n.icon size={18} aria-hidden />{t(n.label)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <LanguageSwitcher className="in-foot" />
          <ThemeToggle className="in-foot" />
          <div className="me">
            <div className="me-name" title={user?.email}><Ltr>@{user?.username}</Ltr></div>
            <Badge tone={user?.role === "admin" ? "ember" : "info"}>{user ? te("role", user.role) : ""}</Badge>
          </div>
          <div className="foot-actions">
            <IconButton label={t("nav.signOut")} onClick={() => void logout()}><LogOut className="icon-dir" size={18} aria-hidden /></IconButton>
          </div>
        </div>
      </aside>
      <main id="main" className="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/rounds" element={<RoundsPage />} />
          <Route path="/rounds/:id" element={<RoundDetail />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/abuse" element={<AbusePage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label={t("nav.primary")}>
        {NAV.filter((n) => TABS.includes(n.to)).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="tab-link"><n.icon size={22} aria-hidden /><span>{t(n.label)}</span></NavLink>
        ))}
        <button type="button" className="tab-link" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="sidebar"><Menu size={22} aria-hidden /><span>{t("nav.more")}</span></button>
      </nav>
    </div>
  );
}
