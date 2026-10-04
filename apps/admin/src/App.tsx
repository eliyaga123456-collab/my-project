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
import { Badge, IconButton, Skeleton } from "./ui";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/reports", label: "Reports", icon: Flag },
  { to: "/moderation", label: "Moderation", icon: ShieldCheck },
  { to: "/abuse", label: "Abuse", icon: ShieldAlert },
  { to: "/audit", label: "Audit log", icon: FileClock },
  { to: "/health", label: "System health", icon: Activity }
];

export function App() {
  const { phase } = useAuth();
  if (phase === "loading") return <div className="boot" role="status" aria-label="Loading"><Skeleton width={160} height={20} /></div>;
  if (phase === "anonymous") return <Login />;
  return <Shell />;
}

function Shell() {
  const { user, logout } = useAuth();
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
      <a href="#main" className="skip">Skip to content</a>
      <header className="topbar">
        <IconButton label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sidebar"><Menu size={20} aria-hidden /></IconButton>
        <span className="brand-mark">Unsaid <em>admin</em></span>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden />}
      <aside id="sidebar" className={`sidebar ${open ? "open" : ""}`} aria-label="Primary">
        <div className="sidebar-head">
          <span className="brand-mark">Unsaid <em>admin</em></span>
          <IconButton label="Close menu" className="only-mobile" onClick={() => setOpen(false)}><X size={18} aria-hidden /></IconButton>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <n.icon size={18} aria-hidden />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="me">
            <div className="me-name" title={user?.email}>@{user?.username}</div>
            <Badge tone={user?.role === "admin" ? "ember" : "info"}>{user?.role}</Badge>
          </div>
          <div className="foot-actions">
            <IconButton label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>{theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}</IconButton>
            <IconButton label="Sign out" onClick={() => void logout()}><LogOut size={18} aria-hidden /></IconButton>
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
