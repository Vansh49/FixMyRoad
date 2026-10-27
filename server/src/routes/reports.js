import { Router } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { requireRole } from "../middleware/auth.js";

const statuses = new Set(["submitted", "in_progress", "resolved"]);
const severities = new Set(["low", "medium", "high"]);
const allowedTransitions = {
  submitted: new Set(["in_progress"]),
  in_progress: new Set(["resolved", "submitted"]),
  resolved: new Set(),
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, or WebP image.");
      error.code = "UNSUPPORTED_IMAGE";
      return callback(error);
    }
    return callback(null, true);
  },
});

function imageExtension(buffer, mimeType) {
  if (
    mimeType === "image/jpeg" &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return ".jpg";
  if (
    mimeType === "image/png" &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return ".png";
  if (
    mimeType === "image/webp" &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return ".webp";
  return null;
}

export function createReportsRouter({
  store,
  authenticate,
  uploadDirectory,
  isInsideCity,
  reverseGeocode,
}) {
  const router = Router();
  router.use(authenticate);

  router.get("/", async (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const search =
      typeof req.query.q === "string"
        ? req.query.q.trim().toLowerCase().slice(0, 100)
        : undefined;
    if (status && !statuses.has(status))
      return res.status(400).json({ error: "Status filter is invalid." });

    const reporterId = req.user.role === "citizen" ? req.user.sub : undefined;
    const reports = await store.listReports({ reporterId, status, search });
    return res.json({ reports, total: reports.length });
  });

  router.post(
    "/",
    requireRole("citizen"),
    upload.single("photo"),
    async (req, res) => {
      const title =
        typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const description =
        typeof req.body?.description === "string"
          ? req.body.description.trim()
          : "";
      const latitude =
        typeof req.body?.latitude === "number" ||
        (typeof req.body?.latitude === "string" &&
          req.body.latitude.trim() !== "")
          ? Number(req.body.latitude)
          : Number.NaN;
      const longitude =
        typeof req.body?.longitude === "number" ||
        (typeof req.body?.longitude === "string" &&
          req.body.longitude.trim() !== "")
          ? Number(req.body.longitude)
          : Number.NaN;
      const { severity } = req.body ?? {};
      if (
        title.length < 4 ||
        title.length > 120 ||
        description.length < 10 ||
        description.length > 1000 ||
        !severities.has(severity) ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res
          .status(400)
          .json({
            error:
              "Provide a valid title, description, location, severity, latitude, and longitude.",
          });
      }
      if (!isInsideCity(latitude, longitude)) {
        return res
          .status(422)
          .json({
            error: "Choose a location within Chandigarh's city boundary.",
          });
      }

      let locationLabel;
      try {
        ({ locationLabel } = await reverseGeocode(latitude, longitude));
      } catch (error) {
        if (error.code === "ADDRESS_OUTSIDE_CITY") {
          return res.status(422).json({ error: error.message });
        }
        console.error("Report address lookup failed:", error);
        return res
          .status(502)
          .json({
            error:
              "Could not verify this Chandigarh address. Please choose another map point.",
          });
      }
      if (
        typeof locationLabel !== "string" ||
        locationLabel.trim().length < 3
      ) {
        console.error("Report address lookup returned an invalid address.");
        return res
          .status(502)
          .json({
            error:
              "Could not verify this Chandigarh address. Please choose another map point.",
          });
      }

      let imageUrl;
      let imagePath;
      if (req.file) {
        const extension = imageExtension(req.file.buffer, req.file.mimetype);
        if (!extension)
          return res
            .status(400)
            .json({
              error:
                "The uploaded file is not a valid JPEG, PNG, or WebP image.",
            });
        const filename = `${randomUUID()}${extension}`;
        imagePath = path.join(uploadDirectory, filename);
        await mkdir(uploadDirectory, { recursive: true });
        await writeFile(imagePath, req.file.buffer, { flag: "wx" });
        imageUrl = `/uploads/${filename}`;
      }

      let report;
      try {
        report = await store.createReport({
          title,
          description,
          locationLabel,
          latitude,
          longitude,
          severity,
          reporterId: req.user.sub,
          ...(imageUrl ? { imageUrl } : {}),
        });
      } catch (error) {
        if (imagePath) await unlink(imagePath);
        throw error;
      }
      return res.status(201).json({ report });
    },
  );

  router.get("/:id", async (req, res) => {
    const report = await store.findReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });
    if (req.user.role === "citizen" && report.reporterId !== req.user.sub) {
      return res
        .status(403)
        .json({ error: "You can only view your own reports." });
    }
    return res.json({ report });
  });

  router.patch("/:id/status", requireRole("officer"), async (req, res) => {
    const status = req.body?.status;
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    if (!statuses.has(status))
      return res.status(400).json({ error: "Choose a valid report status." });
    if (note.length > 240)
      return res
        .status(400)
        .json({ error: "Status note must be 240 characters or fewer." });

    const current = await store.findReportById(req.params.id);
    if (!current) return res.status(404).json({ error: "Report not found." });
    if (!allowedTransitions[current.status].has(status)) {
      return res
        .status(409)
        .json({
          error: `A report cannot move from ${current.status} to ${status}.`,
        });
    }

    const report = await store.updateReportStatus(
      req.params.id,
      status,
      note || `Status updated to ${status.replace("_", " ")}.`,
    );
    return res.json({ report });
  });

  return router;
}
