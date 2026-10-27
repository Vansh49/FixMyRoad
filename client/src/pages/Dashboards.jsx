import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  Clock3,
  FilePlus2,
  Filter,
  MapPin,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import useReports from "../hooks/useReports.js";
import {
  EmptyState,
  ErrorNotice,
  LoadingRows,
  ReportRow,
  StatCard,
} from "../components/ReportUi.jsx";

export function CitizenDashboard() {
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
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span /> YOUR COMMUNITY SNAPSHOT
          </div>
          <h1>
            Good morning, {session.user.name.split(" ")[0]}{" "}
            <span className="wave">✳</span>
          </h1>
          <p>Here's what's happening with the streets you care about.</p>
        </div>
        <Link className="button button-primary" to="/report/new">
          <FilePlus2 size={17} />
          Report an issue
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Reports submitted"
          value={loading ? "—" : counts.total}
          note="Your neighborhood impact"
          icon={<ClipboardList size={18} />}
          trend="All time"
          tone="mint"
        />
        <StatCard
          label="Being worked on"
          value={loading ? "—" : counts.active}
          note="Updates as teams get assigned"
          icon={<Activity size={18} />}
          trend="In progress"
          tone="amber"
        />
        <StatCard
          label="Resolved"
          value={loading ? "—" : counts.resolved}
          note="Issues fixed in your area"
          icon={<Check size={18} />}
          trend="Completed"
          tone="blue"
        />
      </div>

      <div className="content-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">YOUR ACTIVITY</span>
              <h2>Recent reports</h2>
            </div>
            <Link className="text-link" to="/reports">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          {error ? (
            <ErrorNotice message={error} />
          ) : loading ? (
            <LoadingRows />
          ) : recent.length ? (
            <div className="report-list">
              {recent.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        <section className="panel neighborhood-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">NEIGHBORHOOD PULSE</span>
              <h2>Making progress</h2>
            </div>
            <span className="pulse-icon">
              <Activity size={18} />
            </span>
          </div>
          <div className="pulse-visual">
            <div className="pulse-number">
              {loading ? "—" : reports.length}
              <span> reports</span>
            </div>
            <div className="pulse-bars">
              {[
                36, 54, 43, 68, 49, 82, 62, 94, 70, 58, 76, 46, 87, 65, 100, 73,
                84, 58, 94, 76, 66, 88, 55, 72,
              ].map((height, index) => (
                <i
                  key={index}
                  style={{ height: `${height}%` }}
                  className={index > 17 ? "bar-muted" : ""}
                />
              ))}
            </div>
            <div className="pulse-labels">
              <span>OCT 01</span>
              <span>REPORTS THIS MONTH</span>
              <span>OCT 25</span>
            </div>
          </div>
          <div className="pulse-note">
            <span>
              <ArrowUpRight size={15} />
            </span>
            <p>
              <strong>Every report counts.</strong>
              <br />
              Your community is helping us spot what needs attention.
            </p>
          </div>
        </section>
      </div>

      <div className="bottom-callout">
        <div className="callout-symbol">
          <MapPin size={19} />
        </div>
        <div>
          <strong>Know a street that needs attention?</strong>
          <p>It takes less than a minute to let the right people know.</p>
        </div>
        <Link to="/report/new" className="button button-dark">
          Make a report <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

export function OfficerDashboard() {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/dashboard", { token: session.token })
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [session.token, refreshKey]);

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      await apiRequest(`/reports/${id}/status`, {
        method: "PATCH",
        token: session.token,
        body: JSON.stringify({ status }),
      });
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId("");
    }
  }

  const counts = data?.counts ?? {};
  const recentReports = data?.recentReports ?? [];
  const submittedReports = recentReports
    .filter((report) => report.status === "submitted")
    .slice(0, 3);

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span /> CITY OPERATIONS
          </div>
          <h1>
            Good morning, {session.user.name.split(" ")[0]}{" "}
            <span className="wave">✳</span>
          </h1>
          <p>Here's the latest road safety activity across your wards.</p>
        </div>
        <Link className="button button-outline" to="/reports">
          <Filter size={16} />
          Manage reports
        </Link>
      </div>

      {error && <ErrorNotice message={error} />}
      <div className="stat-grid">
        <StatCard
          label="Total reports"
          value={counts.total ?? "—"}
          note="Across all city wards"
          icon={<ClipboardList size={18} />}
          trend="This month"
          tone="mint"
        />
        <StatCard
          label="Awaiting action"
          value={counts.submitted ?? "—"}
          note="Ready for team assignment"
          icon={<Clock3 size={18} />}
          trend="Needs review"
          tone="amber"
        />
        <StatCard
          label="High priority"
          value={counts.highSeverity ?? "—"}
          note="Severe issues reported"
          icon={<TriangleAlert size={18} />}
          trend="Priority"
          tone="rose"
        />
        <StatCard
          label="Resolved"
          value={counts.resolved ?? "—"}
          note="Repair work completed"
          icon={<Check size={18} />}
          trend="Completed"
          tone="blue"
        />
      </div>

      <div className="content-grid officer-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">NEEDS ATTENTION</span>
              <h2>Latest reports</h2>
            </div>
            <Link className="text-link" to="/reports">
              All reports <ArrowRight size={15} />
            </Link>
          </div>
          {data ? (
            recentReports.length ? (
              <div className="report-list">
                {recentReports.map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <div className="queue-empty">No reports to review yet.</div>
            )
          ) : (
            <LoadingRows />
          )}
        </section>

        <section className="panel queue-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">QUICK ACTIONS</span>
              <h2>Review queue</h2>
            </div>
            <span className="queue-count">{counts.submitted ?? "—"}</span>
          </div>
          <p className="queue-description">
            Reports submitted by citizens that are waiting for a first review.
          </p>
          {submittedReports.map((report) => (
            <div className="queue-item" key={report.id}>
              <span className={`severity-dot dot-${report.severity}`} />
              <span className="queue-copy">
                <strong>{report.title}</strong>
                <small>{report.locationLabel}</small>
              </span>
              <button
                className="mini-action"
                disabled={updatingId === report.id}
                onClick={() => updateStatus(report.id, "in_progress")}
                title="Start work"
              >
                <ArrowRight size={15} />
              </button>
            </div>
          ))}
          {data && submittedReports.length === 0 && (
            <div className="queue-empty">
              <Check size={17} />
              All caught up for now.
            </div>
          )}
        </section>
      </div>

      <div className="bottom-callout officer-callout">
        <div className="callout-symbol">
          <Wrench size={19} />
        </div>
        <div>
          <strong>Keep every update visible.</strong>
          <p>
            Changing status adds a timestamped entry to the report's repair
            history.
          </p>
        </div>
        <Link to="/reports" className="button button-dark">
          Open report queue <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
