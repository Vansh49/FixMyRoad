import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ImagePlus,
  MapPin,
} from "lucide-react";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import {
  ErrorNotice,
  LoadingRows,
  StatusBadge,
} from "../components/ReportUi.jsx";
import { formatReportDate, statusText } from "../utils/reports.js";

function ReportOverview({ report }) {
  return (
    <section className="panel detail-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">REPORT DETAILS</span>
          <h2>Issue overview</h2>
        </div>
        <span className={`severity-label severity-${report.severity}`}>
          <i />
          {report.severity} priority
        </span>
      </div>
      <p className="detail-description">{report.description}</p>
      {report.imageUrl && (
        <div className="report-photo-wrap">
          <img
            className="report-photo"
            src={report.imageUrl}
            alt={`Road issue: ${report.title}`}
          />
          <span className="photo-caption">
            <ImagePlus size={14} />
            Citizen-submitted photo
          </span>
        </div>
      )}
      <div className="detail-location">
        <span className="detail-map-icon">
          <MapPin size={20} />
        </span>
        <div>
          <strong>{report.locationLabel}</strong>
          <small>
            {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
          </small>
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=16/${report.latitude}/${report.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Open map <ArrowUpRight size={14} />
        </a>
      </div>
    </section>
  );
}

function RepairHistory({ history }) {
  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">KEEPING YOU IN THE LOOP</span>
          <h2>Repair history</h2>
        </div>
      </div>
      <div className="history-list">
        {history.map((entry) => (
          <div
            className="history-entry"
            key={`${entry.status}-${entry.changedAt}`}
          >
            <span className="history-node">
              {entry.status === "resolved" ? <Check size={13} /> : <span />}
            </span>
            <div>
              <strong>{statusText[entry.status]}</strong>
              <p>{entry.note}</p>
              <small>
                {new Date(entry.changedAt).toLocaleString("en", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ReportDetailPage() {
  const { session } = useAuth();
  const { id: reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest(`/reports/${reportId}`, { token: session.token })
      .then((result) => {
        if (active) {
          setReport(result.report);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [reportId, session.token]);

  if (error) {
    return (
      <div className="page-content">
        <ErrorNotice message={error} />
        <Link className="text-link" to="/reports">
          Back to reports
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page-content">
        <LoadingRows />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="welcome-row reports-welcome">
        <div>
          <Link className="back-link" to="/reports">
            <ArrowDownLeft size={15} />
            Back to reports
          </Link>
          <h1 className="detail-title">{report.title}</h1>
          <p>
            Report RW-{report.id.slice(-4).toUpperCase()} · submitted{" "}
            {formatReportDate(report.createdAt)}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>
      <div className="detail-grid">
        <ReportOverview report={report} />
        <RepairHistory history={report.history} />
      </div>
    </div>
  );
}
