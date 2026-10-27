import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isPointInBoundary } from "../../../shared/geo.js";

const boundaryPath = new URL(
  "../../../shared/chandigarh-boundary.geojson",
  import.meta.url,
);
export const chandigarhBoundary = JSON.parse(
  readFileSync(fileURLToPath(boundaryPath), "utf8"),
);

if (chandigarhBoundary.features?.[0]?.properties?.name !== "Chandigarh") {
  throw new Error("The Chandigarh boundary GeoJSON is missing or invalid.");
}

export function isInsideChandigarh(latitude, longitude) {
  return isPointInBoundary(latitude, longitude, chandigarhBoundary);
}
