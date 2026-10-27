import { Link } from "react-router-dom";
import {
  ArrowRight,
  FilePlus2,
  MapPin,
  Search,
  TriangleAlert,
} from "lucide-react";
import { formatReportDate, statusClass, statusText } from "../utils/reports.js";

export function StatCard({ label, value, note, icon, trend, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon tone-${tone}`}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        <span>{note}</span>
        <span className="stat-trend">
          <i />
          {trend}
        </span>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${statusClass[status]}`}>
      <i />
      {statusText[status]}
    </span>
  );
}

export function ReportRow({ report }) {
  return (
    <Link className="report-row" to={`/reports/${report.id}`}>
      <span className={`report-thumb thumb-${report.severity}`}>
        <MapPin size={18} />
      </span>
      <span className="report-row-copy">
        <strong>{report.title}</strong>
        <small>
          <MapPin size={12} />
          {report.locationLabel}
          <span className="row-divider">·</span>
          {formatReportDate(report.createdAt)}
        </small>
      </span>
      <span className="report-row-right">
        <span className={`severity-label severity-${report.severity}`}>
          <i />
          {report.severity}
        </span>
        <StatusBadge status={report.status} />
        <ArrowRight className="row-chevron" size={16} />
      </span>
    </Link>
  );
}

export function LoadingRows() {
  return (
    <div className="loading-state">
      <span className="spinner" />
      Loading reports…
    </div>
  );
}

export function EmptyState({ search }) {
  return (
    <div className="empty-state">
      <span>
        <Search size={21} />
      </span>
      <strong>
        {search ? "No matching reports" : "Your first report starts here"}
      </strong>
      <p>
        {search
          ? "Try another issue or location."
          : "Share a road issue and keep track of the repair right here."}
      </p>
      {!search && (
        <Link className="button button-primary" to="/report/new">
          <FilePlus2 size={16} />
          Report a road issue
        </Link>
      )}
    </div>
  );
}

export function ErrorNotice({ message }) {
  return (
    <div className="inline-error">
      <TriangleAlert size={16} />
      {message}
    </div>
  );
}
