import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chandigarhBoundary,
  isInsideChandigarh,
} from "../src/location/chandigarh.js";
import { createReverseGeocoder } from "../src/location/reverseGeocoder.js";
import { isPointInBoundary } from "../../shared/geo.js";

test("Chandigarh boundary accepts city points and rejects points outside", () => {
  assert.equal(isInsideChandigarh(30.7339, 76.7794), true);
  assert.equal(isInsideChandigarh(28.61, 77.21), false);
  assert.equal(isInsideChandigarh(Number.NaN, 76.7794), false);
});

test("shared point-in-boundary supports polygon holes and multipolygons", () => {
  const featureCollection = {
    features: [
      {
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
              [
                [4, 4],
                [6, 4],
                [6, 6],
                [4, 6],
                [4, 4],
              ],
            ],
            [
              [
                [20, 20],
                [25, 20],
                [25, 25],
                [20, 25],
                [20, 20],
              ],
            ],
          ],
        },
      },
    ],
  };

  assert.equal(isPointInBoundary(2, 2, featureCollection), true);
  assert.equal(isPointInBoundary(5, 5, featureCollection), false);
  assert.equal(isPointInBoundary(22, 22, featureCollection), true);
  assert.equal(isPointInBoundary(15, 15, featureCollection), false);
});

test("reverse geocoder caches results and identifies its Nominatim request", async () => {
  let requestCount = 0;
  const geocode = createReverseGeocoder({
    baseUrl: "https://nominatim.example/reverse",
    fetchImpl: async (url, options) => {
      requestCount += 1;
      assert.equal(url.searchParams.get("lat"), "30.7339");
      assert.equal(url.searchParams.get("lon"), "76.7794");
      assert.match(options.headers["User-Agent"], /^FixMyRoad\/1\.0/);
      return {
        ok: true,
        json: async () => ({
          display_name: "Sector 17, Chandigarh, India",
          address: { country_code: "in", city: "Chandigarh" },
        }),
      };
    },
  });

  const [first, concurrent] = await Promise.all([
    geocode(30.7339, 76.7794),
    geocode(30.7339, 76.7794),
  ]);
  const cached = await geocode(30.7339, 76.7794);
  assert.deepEqual(first, {
    locationLabel: "Sector 17, Chandigarh, India",
    address: { country_code: "in", city: "Chandigarh" },
  });
  assert.deepEqual(concurrent, first);
  assert.deepEqual(cached, first);
  assert.equal(requestCount, 1);
});

test("reverse geocoder rejects a result without a Chandigarh address", async () => {
  const geocode = createReverseGeocoder({
    baseUrl: "https://nominatim.example/reverse",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        display_name: "Somewhere else, India",
        address: { country_code: "in", city: "Delhi" },
      }),
    }),
  });

  await assert.rejects(geocode(30.7339, 76.7794), {
    code: "ADDRESS_OUTSIDE_CITY",
  });
});

test("boundary includes its source metadata", () => {
  assert.equal(
    chandigarhBoundary.features[0].properties.source,
    "OpenStreetMap relation 1942809",
  );
  assert.equal(chandigarhBoundary.features[0].properties.license, "ODbL-1.0");
});
