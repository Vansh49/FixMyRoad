import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, CircleHelp,
  ClipboardList, Clock3, Compass, FilePlus2, Filter, Gauge, ImagePlus, LocateFixed,
  LogOut, MapPin, Menu, Search, ShieldCheck, TriangleAlert, Wrench, X,
} from "lucide-react";
import { apiRequest } from "./api.js";
import { useAuth } from "./auth.jsx";
import LocationPicker from "./LocationPicker.jsx";

const statusText = { submitted: "Submitted", in_progress: "In progress", resolved: "Resolved" };
const statusClass = { submitted: "status-submitted", in_progress: "status-progress", resolved: "status-resolved" };
const dateText = (value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

function App() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!session) return <Routes><Route path="*" element={<AuthPage />} /></Routes>;

  function handleSignOut() {
    signOut();
    navigate("/login");
  }

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" to="/"><span className="brand-mark"><Compass size={20} /></span><span>fixmyroad<span className="brand-period">.</span></span></Link>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-card"><span className="workspace-avatar">{session.user.name.slice(0, 1)}</span><span className="workspace-copy"><strong>{session.user.role === "officer" ? "City operations" : "My neighborhood"}</strong><small>{session.user.role === "officer" ? "Officer workspace" : "Citizen portal"}</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">MENU</div>
        <nav className="side-nav">
          {session.user.role === "officer" ? (
            <>
              <NavLink to="/"><Gauge size={18} />Overview</NavLink>
              <NavLink to="/reports"><ClipboardList size={18} />All reports<span className="nav-count">04</span></NavLink>
            </>
          ) : (
            <>
              <NavLink to="/"><Gauge size={18} />My overview</NavLink>
              <NavLink to="/reports"><ClipboardList size={18} />My reports</NavLink>
              <NavLink to="/report/new"><FilePlus2 size={18} />Report an issue</NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><div className="tip-icon"><CircleHelp size={17} /></div><strong>See something? Say something.</strong><p>Your report helps make every street safer for everyone.</p>{session.user.role === "citizen" && <Link to="/report/new">Submit a report <ArrowRight size={14} /></Link>}</div>
          <div className="profile-card"><span className="profile-avatar">{session.user.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><span className="profile-info"><strong>{session.user.name}</strong><small>{session.user.role === "officer" ? "City officer" : "Community member"}</small></span><button className="icon-button logout-button" title="Sign out" onClick={handleSignOut}><LogOut size={17} /></button></div>
        </div>
      </aside>
      {menuOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMenuOpen(false)} />}
      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>FixMyRoad</span><span className="crumb-slash">/</span><strong>{pageTitle(location.pathname, session.user.role)}</strong></div>
          <div className="topbar-right"><span className="live-indicator"><span />Live community data</span><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><span className="topbar-divider" /><div className="user-chip"><span className="mini-avatar">{session.user.name.slice(0, 1)}</span><span>{session.user.name.split(" ")[0]}</span><ChevronDown size={14} /></div></div>
        </header>
        <Routes>
          <Route path="/" element={session.user.role === "officer" ? <OfficerDashboard /> : <CitizenDashboard />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/report/new" element={session.user.role === "citizen" ? <NewReport onCreated={() => notify("Your report has been submitted successfully.")} /> : <Navigate to="/" replace />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {toast && <div className="toast"><span><Check size={16} /></span>{toast}</div>}
    </div>
  );
}

function pageTitle(path, role) {
  if (path === "/report/new") return "New report";
  if (path.startsWith("/reports/")) return "Report details";
  if (path === "/reports") return role === "officer" ? "All reports" : "My reports";
  return role === "officer" ? "Operations overview" : "My overview";
}

function NavLink({ to, children }) {
  const location = useLocation();
  const active = to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);
  return <Link className={`nav-link ${active ? "nav-active" : ""}`} to={to}>{children}</Link>;
}

function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, register } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (isRegister) await register(values.name, values.email, values.password);
      else await signIn(values.email, values.password);
      navigate("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link className="brand story-brand" to="/"><span className="brand-mark"><Compass size={20} /></span><span>fixmyroad<span className="brand-period">.</span></span></Link>
        <div className="story-content"><div className="eyebrow"><span /> A BETTER STREET STARTS HERE</div><h1>Small reports.<br /><em>Safer streets.</em></h1><p>One pothole report can make a whole neighborhood safer. Help your community spot issues and follow every fix.</p><div className="story-stat"><div className="stat-avatars"><span>AS</span><span>MK</span><span>RV</span><span>+2k</span></div><div><strong>2,400+ neighbors</strong><small>making a difference together</small></div></div></div>
        <div className="story-footer"><span>© 2026 FixMyRoad</span><span>Built for safer communities</span></div>
        <div className="story-decoration decoration-one" /><div className="story-decoration decoration-two" />
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="form-intro"><div className="form-icon"><ShieldCheck size={22} /></div><span className="form-kicker">YOUR COMMUNITY, CONNECTED</span><h2>{isRegister ? "Create your account" : "Welcome back"}</h2><p>{isRegister ? "Join your neighbors and help improve local streets." : "Sign in to follow your reports and make a difference."}</p></div>
          {error && <div className="inline-error"><TriangleAlert size={16} />{error}</div>}
          <form className="auth-form" onSubmit={submit}>
            {isRegister && <label>Your name<input name="name" autoComplete="name" placeholder="e.g. Aanya Gupta" required minLength="2" maxLength="80" /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <label>Password<input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} required minLength={isRegister ? 8 : undefined} /></label>
            {!isRegister && <div className="forgot-row"><span>Demo access is ready to use</span><span className="lock-mark"><ShieldCheck size={14} /> Secure sign in</span></div>}
            <button className="button button-primary auth-submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}<ArrowRight size={17} /></button>
          </form>
          <div className="switch-auth">{isRegister ? "Already have an account?" : "New to FixMyRoad?"} <button onClick={() => { setIsRegister(!isRegister); setError(""); }}>{isRegister ? "Sign in" : "Create an account"}</button></div>
          {!isRegister && <div className="demo-box"><span className="demo-icon"><CircleHelp size={17} /></span><div><strong>Try the demo</strong><span>Citizen: citizen@civic.local · Citizen123!</span><span>Officer: officer@civic.local · Officer123!</span></div></div>}
          <div className="auth-legal">By continuing, you agree to help keep our community respectful and safe.</div>
        </div>
      </section>
    </div>
  );
}

function useReports() {
  const { session } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest("/reports", { token: session.token })
      .then((result) => { if (active) { setReports(result.reports); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session.token, refreshKey]);

  return { reports, loading, error, refresh: () => setRefreshKey((key) => key + 1) };
}

function CitizenDashboard() {
  const { session } = useAuth();
  const { reports, loading, error } = useReports();
  const counts = {
    total: reports.length,
    active: reports.filter((report) => report.status === "in_progress").length,
    resolved: reports.filter((report) => report.status === "resolved").length,
  };
  const recent = reports.slice(0, 4);
  return (
    <div className="page-content">
      <div className="welcome-row"><div><div className="eyebrow"><span /> YOUR COMMUNITY SNAPSHOT</div><h1>Good morning, {session.user.name.split(" ")[0]} <span className="wave">✳</span></h1><p>Here's what's happening with the streets you care about.</p></div><Link className="button button-primary" to="/report/new"><FilePlus2 size={17} />Report an issue</Link></div>
      <div className="stat-grid">
        <StatCard label="Reports submitted" value={loading ? "—" : counts.total} note="Your neighborhood impact" icon={<ClipboardList size={18} />} trend="All time" tone="mint" />
        <StatCard label="Being worked on" value={loading ? "—" : counts.active} note="Updates as teams get assigned" icon={<Activity size={18} />} trend="In progress" tone="amber" />
        <StatCard label="Resolved" value={loading ? "—" : counts.resolved} note="Issues fixed in your area" icon={<Check size={18} />} trend="Completed" tone="blue" />
      </div>
      <div className="content-grid">
        <section className="panel recent-panel"><div className="panel-heading"><div><span className="section-kicker">YOUR ACTIVITY</span><h2>Recent reports</h2></div><Link className="text-link" to="/reports">View all <ArrowRight size={15} /></Link></div>
          {error ? <ErrorNotice message={error} /> : loading ? <LoadingRows /> : recent.length ? <div className="report-list">{recent.map((report) => <ReportRow key={report.id} report={report} />)}</div> : <EmptyState />}
        </section>
        <section className="panel neighborhood-panel"><div className="panel-heading"><div><span className="section-kicker">NEIGHBORHOOD PULSE</span><h2>Making progress</h2></div><span className="pulse-icon"><Activity size={18} /></span></div><div className="pulse-visual"><div className="pulse-number">{loading ? "—" : reports.length}<span> reports</span></div><div className="pulse-bars">{[36, 54, 43, 68, 49, 82, 62, 94, 70, 58, 76, 46, 87, 65, 100, 73, 84, 58, 94, 76, 66, 88, 55, 72].map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index > 17 ? "bar-muted" : ""} />)}</div><div className="pulse-labels"><span>OCT 01</span><span>REPORTS THIS MONTH</span><span>OCT 25</span></div></div><div className="pulse-note"><span><ArrowUpRight size={15} /></span><p><strong>Every report counts.</strong><br />Your community is helping us spot what needs attention.</p></div></section>
      </div>
      <div className="bottom-callout"><div className="callout-symbol"><MapPin size={19} /></div><div><strong>Know a street that needs attention?</strong><p>It takes less than a minute to let the right people know.</p></div><Link to="/report/new" className="button button-dark">Make a report <ArrowRight size={15} /></Link></div>
    </div>
  );
}

function OfficerDashboard() {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/dashboard", { token: session.token })
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [session.token, refreshKey]);

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      await apiRequest(`/reports/${id}/status`, { method: "PATCH", token: session.token, body: JSON.stringify({ status }) });
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId("");
    }
  }

  const counts = data?.counts ?? {};
  return (
    <div className="page-content">
      <div className="welcome-row"><div><div className="eyebrow"><span /> CITY OPERATIONS</div><h1>Good morning, Mira <span className="wave">✳</span></h1><p>Here's the latest road safety activity across your wards.</p></div><Link className="button button-outline" to="/reports"><Filter size={16} />Manage reports</Link></div>
      {error && <ErrorNotice message={error} />}
      <div className="stat-grid">
        <StatCard label="Total reports" value={counts.total ?? "—"} note="Across all city wards" icon={<ClipboardList size={18} />} trend="This month" tone="mint" />
        <StatCard label="Awaiting action" value={counts.submitted ?? "—"} note="Ready for team assignment" icon={<Clock3 size={18} />} trend="Needs review" tone="amber" />
        <StatCard label="High priority" value={counts.highSeverity ?? "—"} note="Severe issues reported" icon={<TriangleAlert size={18} />} trend="Priority" tone="rose" />
        <StatCard label="Resolved" value={counts.resolved ?? "—"} note="Repair work completed" icon={<Check size={18} />} trend="Completed" tone="blue" />
      </div>
      <div className="content-grid officer-grid">
        <section className="panel recent-panel"><div className="panel-heading"><div><span className="section-kicker">NEEDS ATTENTION</span><h2>Latest reports</h2></div><Link className="text-link" to="/reports">All reports <ArrowRight size={15} /></Link></div>
          {data?.recentReports?.length ? <div className="report-list">{data.recentReports.map((report) => <ReportRow key={report.id} report={report} officer />)}</div> : <LoadingRows />}
        </section>
        <section className="panel queue-panel"><div className="panel-heading"><div><span className="section-kicker">QUICK ACTIONS</span><h2>Review queue</h2></div><span className="queue-count">{counts.submitted ?? "—"}</span></div><p className="queue-description">Reports submitted by citizens that are waiting for a first review.</p>{data?.recentReports?.filter((report) => report.status === "submitted").slice(0, 3).map((report) => <div className="queue-item" key={report.id}><span className={`severity-dot dot-${report.severity}`} /><span className="queue-copy"><strong>{report.title}</strong><small>{report.locationLabel}</small></span><button className="mini-action" disabled={updatingId === report.id} onClick={() => updateStatus(report.id, "in_progress")} title="Start work"><ArrowRight size={15} /></button></div>)}{!data?.recentReports?.some((report) => report.status === "submitted") && <div className="queue-empty"><Check size={17} />All caught up for now.</div>}</section>
      </div>
      <div className="bottom-callout officer-callout"><div className="callout-symbol"><Wrench size={19} /></div><div><strong>Keep every update visible.</strong><p>Changing status adds a timestamped entry to the report's repair history.</p></div><Link to="/reports" className="button button-dark">Open report queue <ArrowRight size={15} /></Link></div>
    </div>
  );
}

function StatCard({ label, value, note, icon, trend, tone }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon tone-${tone}`}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span>{note}</span><span className="stat-trend"><i />{trend}</span></div></div>;
}

function ReportsPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const isOfficer = session.user.role === "officer";

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (status) params.set("status", status);
    apiRequest(`/reports${params.size ? `?${params}` : ""}`, { token: session.token })
      .then((result) => { if (active) { setReports(result.reports); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session.token, search, status, refreshKey]);

  async function updateStatus(id, nextStatus) {
    setUpdatingId(id);
    try {
      await apiRequest(`/reports/${id}/status`, { method: "PATCH", token: session.token, body: JSON.stringify({ status: nextStatus }) });
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="page-content">
      <div className="welcome-row reports-welcome"><div><div className="eyebrow"><span /> {isOfficer ? "CITYWIDE VIEW" : "YOUR SUBMISSIONS"}</div><h1>{isOfficer ? "Road report center" : "Your reports"}</h1><p>{isOfficer ? "Review incoming road issues and keep repair work moving." : "A clear view of every issue you've shared with your community."}</p></div>{!isOfficer && <Link className="button button-primary" to="/report/new"><FilePlus2 size={17} />New report</Link>}</div>
      <div className="report-toolbar"><div className="search-field"><Search size={17} /><input aria-label="Search reports" placeholder="Search by issue or location…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><label className="filter-select"><Filter size={16} /><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="submitted">Submitted</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><ChevronDown size={14} /></label><span className="result-count">{loading ? "Loading…" : `${reports.length} ${reports.length === 1 ? "report" : "reports"}`}</span></div>
      {error && <ErrorNotice message={error} />}
      <section className="panel all-reports-panel">
        {loading ? <LoadingRows /> : reports.length ? <div className="table-wrap"><table><thead><tr><th>REPORT</th><th>LOCATION</th><th>SEVERITY</th><th>STATUS</th><th>SUBMITTED</th><th>{isOfficer ? "ACTION" : ""}</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><Link className="table-report-title" to={`/reports/${report.id}`}><span className={`report-thumb thumb-${report.severity}`}><MapPin size={18} /></span><span><strong>{report.title}</strong><small>RW-{report.id.slice(-4).toUpperCase()}</small></span></Link></td><td><span className="table-location"><MapPin size={14} />{report.locationLabel}</span></td><td><span className={`severity-label severity-${report.severity}`}><i />{report.severity}</span></td><td><StatusBadge status={report.status} /></td><td className="table-date">{dateText(report.createdAt)}</td><td>{isOfficer && report.status !== "resolved" ? <button className="table-action" disabled={updatingId === report.id} onClick={() => updateStatus(report.id, report.status === "submitted" ? "in_progress" : "resolved")}>{report.status === "submitted" ? "Start work" : "Resolve"} <ArrowRight size={14} /></button> : <Link className="table-open" to={`/reports/${report.id}`}>View <ArrowRight size={14} /></Link>}</td></tr>)}</tbody></table></div> : <EmptyState search={search} />}
      </section>
    </div>
  );
}

function NewReport({ onCreated }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState([28.6139, 77.209]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) formData.set(key, value);
      formData.set("latitude", String(position[0]));
      formData.set("longitude", String(position[1]));
      if (photo) formData.set("photo", photo);
      const result = await apiRequest("/reports", {
        method: "POST",
        token: session.token,
        body: formData,
      });
      onCreated();
      navigate(`/reports/${result.report.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location services are not available in this browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition([coords.latitude, coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocationError("Could not access your location. You can still place the pin on the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image that is 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setError("");
    setPhoto(file);
  }

  return (
    <div className="page-content">
      <div className="welcome-row reports-welcome"><div><div className="eyebrow"><span /> COMMUNITY REPORTING</div><h1>Report a road issue</h1><p>Share a few details and help your local team get the right fix started.</p></div><Link className="button button-outline" to="/">Cancel</Link></div>
      <div className="form-layout">
        <form className="panel report-form" onSubmit={submit}>
          <div className="form-section-heading"><span className="form-step">01</span><div><strong>Tell us what you noticed</strong><small>A clear description helps the repair team prepare.</small></div></div>
          {error && <ErrorNotice message={error} />}
          <label>Report title<input name="title" placeholder="e.g. Deep pothole near the school crossing" required minLength="4" maxLength="120" /></label>
          <label>Description<textarea name="description" rows="4" placeholder="Describe the road damage and anything that might help the repair team…" required minLength="10" maxLength="1000" /></label>
          <div className="form-section-heading location-heading"><span className="form-step">02</span><div><strong>Add a photo</strong><small>A clear photo helps the repair team understand the issue.</small></div></div>
          <div className={`photo-picker ${photoPreview ? "photo-picker-selected" : ""}`}>
            <label htmlFor="report-photo" className="photo-picker-label">
              {photoPreview ? <img className="photo-preview" src={photoPreview} alt="Selected road issue preview" /> : <span className="photo-picker-icon"><ImagePlus size={21} /></span>}
              <span className="photo-picker-copy"><strong>{photo ? photo.name : "Choose a photo"}</strong><small>JPEG, PNG, or WebP · up to 5 MB</small></span>
              <span className="photo-picker-action">{photo ? "Change" : "Browse"}</span>
            </label>
            <input id="report-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
            {photo && <button type="button" className="remove-photo" aria-label="Remove photo" onClick={() => setPhoto(null)}><X size={15} /></button>}
          </div>
          <div className="form-section-heading location-heading"><span className="form-step">03</span><div><strong>Where is the issue?</strong><small>Place the pin on the map and add a nearby address.</small></div></div>
          <label>Nearby address<input name="locationLabel" placeholder="Street, landmark, or neighborhood" required minLength="3" maxLength="160" /></label>
          <div className="map-toolbar"><span><MapPin size={14} />Click or drag the pin to mark the spot</span><button type="button" className="locate-button" disabled={locating} onClick={useCurrentLocation}><LocateFixed size={14} />{locating ? "Finding you…" : "Use my location"}</button></div>
          <LocationPicker position={position} onChange={setPosition} />
          <div className="map-coordinates"><span>LAT <strong>{position[0].toFixed(5)}</strong></span><span>LNG <strong>{position[1].toFixed(5)}</strong></span></div>
          {locationError && <div className="coordinate-note location-error"><TriangleAlert size={14} />{locationError}</div>}
          <div className="coordinate-note"><MapPin size={15} />The address and selected map coordinates will be saved together with this report.</div>
          <div className="form-section-heading location-heading"><span className="form-step">04</span><div><strong>How serious is it?</strong><small>Help the city prioritize urgent safety issues.</small></div></div>
          <label>Severity<select name="severity" defaultValue="medium"><option value="low">Low — minor damage</option><option value="medium">Medium — affecting traffic</option><option value="high">High — immediate safety concern</option></select></label>
          <div className="form-actions"><Link className="text-link" to="/">Cancel</Link><button className="button button-primary" disabled={busy}>{busy ? "Submitting…" : "Submit report"}<ArrowRight size={16} /></button></div>
        </form>
        <aside className="form-aside"><div className="aside-illustration"><div className="road-line road-line-one" /><div className="road-line road-line-two" /><div className="map-pin-illustration"><MapPin size={23} fill="currentColor" /></div><span className="map-dot map-dot-one" /><span className="map-dot map-dot-two" /><span className="map-dot map-dot-three" /><div className="map-tag">CENTRAL WARD</div></div><div className="aside-copy"><span className="section-kicker">WHAT HAPPENS NEXT</span><h3>Your report is in good hands.</h3><div className="next-step"><span>1</span><p><strong>City team reviews it</strong><small>Usually within 1–2 business days.</small></p></div><div className="next-step"><span>2</span><p><strong>Repairs get scheduled</strong><small>You'll see each status update here.</small></p></div><div className="next-step"><span>3</span><p><strong>Street gets safer</strong><small>We'll mark it resolved when done.</small></p></div></div></aside>
      </div>
    </div>
  );
}

function ReportDetail() {
  const { session } = useAuth();
  const { id: reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/reports/${reportId}`, { token: session.token })
      .then((result) => { if (active) { setReport(result.report); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [reportId, session.token]);

  if (error) return <div className="page-content"><ErrorNotice message={error} /><Link className="text-link" to="/reports">Back to reports</Link></div>;
  if (!report) return <div className="page-content"><LoadingRows /></div>;

  return (
    <div className="page-content">
      <div className="welcome-row reports-welcome"><div><Link className="back-link" to="/reports"><ArrowDownLeft size={15} /> Back to reports</Link><h1 className="detail-title">{report.title}</h1><p>Report RW-{report.id.slice(-4).toUpperCase()} · submitted {dateText(report.createdAt)}</p></div><StatusBadge status={report.status} /></div>
      <div className="detail-grid"><section className="panel detail-panel"><div className="panel-heading"><div><span className="section-kicker">REPORT DETAILS</span><h2>Issue overview</h2></div><span className={`severity-label severity-${report.severity}`}><i />{report.severity} priority</span></div><p className="detail-description">{report.description}</p>{report.imageUrl && <div className="report-photo-wrap"><img className="report-photo" src={report.imageUrl} alt={`Road issue: ${report.title}`} /><span className="photo-caption"><ImagePlus size={14} />Citizen-submitted photo</span></div>}<div className="detail-location"><span className="detail-map-icon"><MapPin size={20} /></span><div><strong>{report.locationLabel}</strong><small>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</small></div><a href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=16/${report.latitude}/${report.longitude}`} target="_blank" rel="noreferrer">Open map <ArrowUpRight size={14} /></a></div></section>
        <section className="panel history-panel"><div className="panel-heading"><div><span className="section-kicker">KEEPING YOU IN THE LOOP</span><h2>Repair history</h2></div></div><div className="history-list">{report.history.map((entry, index) => <div className={`history-entry ${index === 0 ? "history-first" : ""}`} key={`${entry.status}-${entry.changedAt}`}><span className="history-node">{entry.status === "resolved" ? <Check size={13} /> : <span />}</span><div><strong>{statusText[entry.status]}</strong><p>{entry.note}</p><small>{new Date(entry.changedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div></div>)}</div></section></div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${statusClass[status]}`}><i />{statusText[status]}</span>;
}

function ReportRow({ report, officer }) {
  return <Link className="report-row" to={`/reports/${report.id}`}><span className={`report-thumb thumb-${report.severity}`}><MapPin size={18} /></span><span className="report-row-copy"><strong>{report.title}</strong><small><MapPin size={12} />{report.locationLabel}<span className="row-divider">·</span>{dateText(report.createdAt)}</small></span><span className="report-row-right"><span className={`severity-label severity-${report.severity}`}><i />{report.severity}</span><StatusBadge status={report.status} />{officer ? <ArrowRight className="row-chevron" size={16} /> : <ArrowRight className="row-chevron" size={16} />}</span></Link>;
}

function LoadingRows() {
  return <div className="loading-state"><span className="spinner" />Loading reports…</div>;
}

function EmptyState({ search }) {
  return <div className="empty-state"><span><Search size={21} /></span><strong>{search ? "No matching reports" : "Your first report starts here"}</strong><p>{search ? "Try another issue or location." : "Share a road issue and keep track of the repair right here."}</p>{!search && <Link className="button button-primary" to="/report/new"><FilePlus2 size={16} />Report a road issue</Link>}</div>;
}

function ErrorNotice({ message }) {
  return <div className="inline-error"><TriangleAlert size={16} />{message}</div>;
}

export default App;
