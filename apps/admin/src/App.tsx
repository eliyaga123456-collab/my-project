import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Activity, FileClock, Flag, LayoutDashboard, LogOut, Menu, Moon, ShieldAlert, ShieldCheck, Sun, Users, X } from "lucide-react";
import { useAuth } from "./auth";
import { useTheme } from "./lib/hooks";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { UsersPage } from "./pages/Users";
import { ReportsPage } from "./pages/Reports";
import { ModerationPage } from "./pages/Moderation";
import { AuditPage } from "./pages/Audit";
import { AbusePage } from "./pages/Abuse";
import { HealthPage } from "./pages/Health";
import { useT, type Key } from "./i18n";
import { Badge, IconButton, LanguageSwitcher, Ltr, Skeleton } from "./ui";

const NAV: { to: string; label: Key; icon: typeof Users; end?: boolean }[] = [
  { to: "/", label: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/users", label: "nav.users", icon: Users },
  { to: "/reports", label: "nav.reports", icon: Flag },
  { to: "/moderation", label: "nav.moderation", icon: ShieldCheck },
  { to: "/abuse", label: "nav.abuse", icon: ShieldAlert },
  { to: "/audit", label: "nav.audit", icon: FileClock },
  { to: "/health", label: "nav.health", icon: Activity }
];

export function App() {
  const { phase } = useAuth();
  const { t } = useT();
  if (phase === "loading") return <div className="boot" role="status" aria-label={t("common.loading")}><Skeleton width={160} height={20} /></div>;
  if (phase === "anonymous") return <Login />;
  return <Shell />;
}

function Shell() {
  const { user, logout } = useAuth();
  const { t, te } = useT();
  const [theme, toggleTheme] = useTheme();
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
        <span className="brand-mark" dir="ltr">EAR <em>admin</em></span>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden />}
      <aside id="sidebar" className={`sidebar ${open ? "open" : ""}`} aria-label={t("nav.primary")}>
        <div className="sidebar-head">
          <span className="brand-mark" dir="ltr">EAR <em>admin</em></span>
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
          <div className="me">
            <div className="me-name" title={user?.email}><Ltr>@{user?.username}</Ltr></div>
            <Badge tone={user?.role === "admin" ? "ember" : "info"}>{user ? te("role", user.role) : ""}</Badge>
          </div>
          <div className="foot-actions">
            <IconButton label={theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")} onClick={toggleTheme}>{theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}</IconButton>
            <IconButton label={t("nav.signOut")} onClick={() => void logout()}><LogOut className="icon-dir" size={18} aria-hidden /></IconButton>
          </div>
        </div>
      </aside>
      <main id="main" className="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/abuse" element={<AbusePage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
