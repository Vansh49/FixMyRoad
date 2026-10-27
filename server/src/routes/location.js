import { Router } from "express";
import { requireRole } from "../middleware/auth.js";

export function createLocationRouter({
  authenticate,
  boundary,
  isInsideCity,
  reverseGeocode,
}) {
  const router = Router();

  router.get("/boundary", (_req, res) => res.json(boundary));

  router.get(
    "/reverse",
    authenticate,
    requireRole("citizen"),
    async (req, res) => {
      const latitude =
        typeof req.query.latitude === "string" && req.query.latitude.trim()
          ? Number(req.query.latitude)
          : Number.NaN;
      const longitude =
        typeof req.query.longitude === "string" && req.query.longitude.trim()
          ? Number(req.query.longitude)
          : Number.NaN;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res
          .status(400)
          .json({ error: "Valid latitude and longitude are required." });
      }
      if (!isInsideCity(latitude, longitude)) {
        return res
          .status(422)
          .json({
            error: "Choose a location within Chandigarh's city boundary.",
          });
      }

      try {
        const result = await reverseGeocode(latitude, longitude);
        return res.json(result);
      } catch (error) {
        if (error.code === "ADDRESS_OUTSIDE_CITY") {
          return res.status(422).json({ error: error.message });
        }
        console.error("Reverse geocoding failed:", error);
        return res.status(502).json({
          error:
            "Could not resolve this Chandigarh address. Please try another map point.",
        });
      }
    },
  );

  return router;
}
