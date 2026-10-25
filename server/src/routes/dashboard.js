import { Router } from "express";
import { requireRole } from "../middleware/auth.js";

export function createDashboardRouter({ store, authenticate }) {
  const router = Router();
  router.get("/", authenticate, requireRole("officer"), async (_req, res) => {
    const reports = await store.listReports({});
    const counts = { total: reports.length, submitted: 0, in_progress: 0, resolved: 0, highSeverity: 0 };
    for (const report of reports) {
      counts[report.status] += 1;
      if (report.severity === "high") counts.highSeverity += 1;
    }
    return res.json({ counts, recentReports: reports.slice(0, 5) });
  });
  return router;
}
