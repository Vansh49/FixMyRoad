function isPointOnSegment(point, start, end) {
  const [longitude, latitude] = point;
  const [startLongitude, startLatitude] = start;
  const [endLongitude, endLatitude] = end;
  const cross =
    (latitude - startLatitude) * (endLongitude - startLongitude) -
    (longitude - startLongitude) * (endLatitude - startLatitude);

  if (Math.abs(cross) > 1e-10) return false;
  return (
    longitude >= Math.min(startLongitude, endLongitude) - 1e-10 &&
    longitude <= Math.max(startLongitude, endLongitude) + 1e-10 &&
    latitude >= Math.min(startLatitude, endLatitude) - 1e-10 &&
    latitude <= Math.max(startLatitude, endLatitude) + 1e-10
  );
}

function isPointInRing(point, ring) {
  let inside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const start = ring[previous];
    const end = ring[index];
    if (isPointOnSegment(point, start, end)) return true;

    const crossesLatitude = start[1] > point[1] !== end[1] > point[1];
    if (
      crossesLatitude &&
      point[0] <
        ((end[0] - start[0]) * (point[1] - start[1])) / (end[1] - start[1]) +
          start[0]
    ) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygon(point, rings) {
  if (!rings.length || !isPointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => isPointInRing(point, hole));
}

export function isPointInBoundary(latitude, longitude, featureCollection) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return false;
  }

  const point = [longitude, latitude];
  return featureCollection.features.some((feature) => {
    const { type, coordinates } = feature.geometry;
    if (type === "Polygon") return isPointInPolygon(point, coordinates);
    if (type === "MultiPolygon") {
      return coordinates.some((polygon) => isPointInPolygon(point, polygon));
    }
    return false;
  });
}

export function getBoundaryBounds(featureCollection) {
  const positions = [];
  for (const feature of featureCollection.features) {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates
          : [];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        positions.push(...ring);
      }
    }
  }

  if (!positions.length) {
    throw new Error("The city boundary contains no polygon coordinates.");
  }

  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  return {
    south: Math.min(...latitudes),
    west: Math.min(...longitudes),
    north: Math.max(...latitudes),
    east: Math.max(...longitudes),
  };
}
