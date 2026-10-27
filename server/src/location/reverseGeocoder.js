const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1100;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cacheKey(latitude, longitude) {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function isChandigarhAddress(address) {
  return (
    address.country_code?.toLowerCase() === "in" &&
    [
      address.city,
      address.town,
      address.municipality,
      address.county,
      address.state_district,
      address.state,
    ].some((value) => value?.toLowerCase() === "chandigarh")
  );
}

export function createReverseGeocoder({
  baseUrl = process.env.GEOCODER_BASE_URL ??
    "https://nominatim.openstreetmap.org/reverse",
  fetchImpl = fetch,
} = {}) {
  const cache = new Map();
  const inFlight = new Map();
  let requestQueue = Promise.resolve();
  let lastRequestAt = 0;

  async function fetchAddress(latitude, longitude) {
    const delay = Math.max(
      0,
      lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now(),
    );
    if (delay) await wait(delay);
    lastRequestAt = Date.now();

    const url = new URL(baseUrl);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");

    const response = await fetchImpl(url, {
      headers: {
        "User-Agent":
          "FixMyRoad/1.0 (mailto:vansh1758.becse24@chitkara.edu.in)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`Reverse geocoding returned HTTP ${response.status}.`);
    }

    const result = await response.json();
    if (
      typeof result.display_name !== "string" ||
      !result.address ||
      !isChandigarhAddress(result.address)
    ) {
      const error = new Error(
        "The selected point did not resolve to a Chandigarh address.",
      );
      error.code = "ADDRESS_OUTSIDE_CITY";
      throw error;
    }

    return {
      locationLabel: result.display_name,
      address: result.address,
    };
  }

  return async function reverseGeocode(latitude, longitude) {
    const normalizedLatitude = Number(latitude.toFixed(5));
    const normalizedLongitude = Number(longitude.toFixed(5));
    const key = cacheKey(normalizedLatitude, normalizedLongitude);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    if (!inFlight.has(key)) {
      const request = requestQueue.then(() =>
        fetchAddress(normalizedLatitude, normalizedLongitude),
      );
      requestQueue = request.catch(() => {});
      inFlight.set(key, request);
      request.then(
        () => inFlight.delete(key),
        () => inFlight.delete(key),
      );
    }

    const value = await inFlight.get(key);
    cache.set(key, { value, expiresAt: Date.now() + CACHE_DURATION_MS });
    return value;
  };
}
