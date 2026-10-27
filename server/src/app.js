import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthMiddleware } from "./middleware/auth.js";
import {
  chandigarhBoundary,
  isInsideChandigarh,
} from "./location/chandigarh.js";
import { createReverseGeocoder } from "./location/reverseGeocoder.js";
import { createAuthRouter } from "./routes/auth.js";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createLocationRouter } from "./routes/location.js";
import { createReportsRouter } from "./routes/reports.js";

const defaultUploadDirectory = fileURLToPath(
  new URL("../uploads/", import.meta.url),
);

export function createApp({
  store,
  secret,
  clientOrigin = "http://localhost:5173",
  uploadDirectory = defaultUploadDirectory,
  isInsideCity = isInsideChandigarh,
  reverseGeocode = createReverseGeocoder(),
}) {
  const app = express();
  const authenticate = createAuthMiddleware(secret);

  app.disable("x-powered-by");
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: "32kb" }));
  app.use(
    "/uploads",
    express.static(path.resolve(uploadDirectory), {
      dotfiles: "deny",
      index: false,
      setHeaders(res) {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    }),
  );

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", createAuthRouter({ store, secret, authenticate }));
  app.use(
    "/api/location",
    createLocationRouter({
      authenticate,
      boundary: chandigarhBoundary,
      isInsideCity,
      reverseGeocode,
    }),
  );
  app.use(
    "/api/reports",
    createReportsRouter({
      store,
      authenticate,
      uploadDirectory,
      isInsideCity,
      reverseGeocode,
    }),
  );
  app.use("/api/dashboard", createDashboardRouter({ store, authenticate }));
  app.use((_req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && "body" in error) {
      return res
        .status(400)
        .json({ error: "Request body must contain valid JSON." });
    }
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res
        .status(status)
        .json({
          error:
            error.code === "LIMIT_FILE_SIZE"
              ? "Image must be 5 MB or smaller."
              : "Upload one image at a time.",
        });
    }
    if (error.code === "UNSUPPORTED_IMAGE") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Unhandled request error:", error);
    return res
      .status(500)
      .json({ error: "An unexpected server error occurred." });
  });

  return app;
}
