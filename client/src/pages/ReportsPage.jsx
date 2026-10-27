import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  FilePlus2,
  Filter,
  MapPin,
  Search,
} from "lucide-react";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import {
  EmptyState,
  ErrorNotice,
  LoadingRows,
  StatusBadge,
} from "../components/ReportUi.jsx";
import { formatReportDate } from "../utils/reports.js";

export default function ReportsPage() {
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

    apiRequest(`/reports${params.size ? `?${params}` : ""}`, {
      token: session.token,
    })
      .then((result) => {
        if (active) {
          setReports(result.reports);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.token, search, status, refreshKey]);

  async function updateStatus(id, nextStatus) {
    setUpdatingId(id);
    try {
      await apiRequest(`/reports/${id}/status`, {
        method: "PATCH",
        token: session.token,
        body: JSON.stringify({ status: nextStatus }),
      });
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="page-content">
      <div className="welcome-row reports-welcome">
        <div>
          <div className="eyebrow">
            <span /> {isOfficer ? "CITYWIDE VIEW" : "YOUR SUBMISSIONS"}
          </div>
          <h1>{isOfficer ? "Road report center" : "Your reports"}</h1>
          <p>
            {isOfficer
              ? "Review incoming road issues and keep repair work moving."
              : "A clear view of every issue you've shared with your community."}
          </p>
        </div>
        {!isOfficer && (
          <Link className="button button-primary" to="/report/new">
            <FilePlus2 size={17} />
            New report
          </Link>
        )}
      </div>

      <div className="report-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search reports"
            placeholder="Search by issue or location…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <label className="filter-select">
          <Filter size={16} />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <span className="result-count">
          {loading
            ? "Loading…"
            : `${reports.length} ${reports.length === 1 ? "report" : "reports"}`}
        </span>
      </div>

      {error && <ErrorNotice message={error} />}
      <section className="panel all-reports-panel">
        {loading ? (
          <LoadingRows />
        ) : reports.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>REPORT</th>
                  <th>LOCATION</th>
                  <th>SEVERITY</th>
                  <th>STATUS</th>
                  <th>SUBMITTED</th>
                  <th>{isOfficer ? "ACTION" : ""}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <Link
                        className="table-report-title"
                        to={`/reports/${report.id}`}
                      >
                        <span
                          className={`report-thumb thumb-${report.severity}`}
                        >
                          <MapPin size={18} />
                        </span>
                        <span>
                          <strong>{report.title}</strong>
                          <small>RW-{report.id.slice(-4).toUpperCase()}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="table-location">
                        <MapPin size={14} />
                        {report.locationLabel}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`severity-label severity-${report.severity}`}
                      >
                        <i />
                        {report.severity}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="table-date">
                      {formatReportDate(report.createdAt)}
                    </td>
                    <td>
                      {isOfficer && report.status !== "resolved" ? (
                        <button
                          className="table-action"
                          disabled={updatingId === report.id}
                          onClick={() =>
                            updateStatus(
                              report.id,
                              report.status === "submitted"
                                ? "in_progress"
                                : "resolved",
                            )
                          }
                        >
                          {report.status === "submitted"
                            ? "Start work"
                            : "Resolve"}
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <Link
                          className="table-open"
                          to={`/reports/${report.id}`}
                        >
                          View <ArrowRight size={14} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState search={search} />
        )}
      </section>
    </div>
  );
}
