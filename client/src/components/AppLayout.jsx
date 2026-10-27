import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Compass,
  FilePlus2,
  Gauge,
  LogOut,
  Menu,
} from "lucide-react";

function getPageTitle(path, role) {
  if (path === "/report/new") return "New report";
  if (path.startsWith("/reports/")) return "Report details";
  if (path === "/reports")
    return role === "officer" ? "All reports" : "My reports";
  return role === "officer" ? "Operations overview" : "My overview";
}

function SidebarLink({ to, children }) {
  const location = useLocation();
  const active =
    to === "/"
      ? location.pathname === "/"
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link className={`nav-link ${active ? "nav-active" : ""}`} to={to}>
      {children}
    </Link>
  );
}

function Sidebar({ session, menuOpen, onSignOut }) {
  const isOfficer = session.user.role === "officer";

  return (
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <Link className="brand" to="/">
        <span className="brand-mark">
          <Compass size={20} />
        </span>
        <span>
          fixmyroad<span className="brand-period">.</span>
        </span>
      </Link>

      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-card">
        <span className="workspace-avatar">
          {session.user.name.slice(0, 1)}
        </span>
        <span className="workspace-copy">
          <strong>{isOfficer ? "City operations" : "My neighborhood"}</strong>
          <small>{isOfficer ? "Officer workspace" : "Citizen portal"}</small>
        </span>
        <ChevronDown size={15} />
      </div>

      <div className="nav-label">MENU</div>
      <nav className="side-nav">
        {isOfficer ? (
          <>
            <SidebarLink to="/">
              <Gauge size={18} />
              Overview
            </SidebarLink>
            <SidebarLink to="/reports">
              <ClipboardList size={18} />
              All reports
              <span className="nav-count">04</span>
            </SidebarLink>
          </>
        ) : (
          <>
            <SidebarLink to="/">
              <Gauge size={18} />
              My overview
            </SidebarLink>
            <SidebarLink to="/reports">
              <ClipboardList size={18} />
              My reports
            </SidebarLink>
            <SidebarLink to="/report/new">
              <FilePlus2 size={18} />
              Report an issue
            </SidebarLink>
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <div className="tip-icon">
            <CircleHelp size={17} />
          </div>
          <strong>See something? Say something.</strong>
          <p>Your report helps make every street safer for everyone.</p>
          {!isOfficer && (
            <Link to="/report/new">
              Submit a report <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <div className="profile-card">
          <span className="profile-avatar">
            {session.user.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span className="profile-info">
            <strong>{session.user.name}</strong>
            <small>{isOfficer ? "City officer" : "Community member"}</small>
          </span>
          <button
            className="icon-button logout-button"
            title="Sign out"
            onClick={onSignOut}
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ session, onOpenMenu }) {
  const location = useLocation();

  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        aria-label="Open navigation"
        onClick={onOpenMenu}
      >
        <Menu size={20} />
      </button>
      <div className="breadcrumb">
        <span>FixMyRoad</span>
        <span className="crumb-slash">/</span>
        <strong>{getPageTitle(location.pathname, session.user.role)}</strong>
      </div>
      <div className="topbar-right">
        <span className="live-indicator">
          <span />
          Live community data
        </span>
        <button
          className="icon-button notification-button"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <i />
        </button>
        <span className="topbar-divider" />
        <div className="user-chip">
          <span className="mini-avatar">{session.user.name.slice(0, 1)}</span>
          <span>{session.user.name.split(" ")[0]}</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
}

export default function AppLayout({
  session,
  menuOpen,
  onCloseMenu,
  onOpenMenu,
  onSignOut,
  children,
}) {
  return (
    <div className="app-shell">
      <Sidebar session={session} menuOpen={menuOpen} onSignOut={onSignOut} />
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="mobile-scrim"
          onClick={onCloseMenu}
        />
      )}
      <main className="main-shell">
        <TopBar session={session} onOpenMenu={onOpenMenu} />
        {children}
      </main>
    </div>
  );
}
