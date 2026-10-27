export const statusText = {
  submitted: "Submitted",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const statusClass = {
  submitted: "status-submitted",
  in_progress: "status-progress",
  resolved: "status-resolved",
};

export function formatReportDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
