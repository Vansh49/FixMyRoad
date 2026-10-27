import { useEffect } from "react";
import { divIcon, latLngBounds } from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import boundaryData from "../../shared/chandigarh-boundary.geojson?raw";
import { getBoundaryBounds, isPointInBoundary } from "../../shared/geo.js";

const boundary = JSON.parse(boundaryData);
const markerIcon = divIcon({
  className: "location-marker",
  html: '<span class="location-marker-pin"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 22],
});

const boundaryBounds = getBoundaryBounds(boundary);
const boundaryRing = boundary.features[0].geometry.coordinates[0].map(
  ([longitude, latitude]) => [latitude, longitude],
);
const outsideMask = [
  [
    [10, 60],
    [10, 100],
    [45, 100],
    [45, 60],
    [10, 60],
  ],
  boundaryRing,
];
const maximumBounds = latLngBounds(
  [boundaryBounds.south, boundaryBounds.west],
  [boundaryBounds.north, boundaryBounds.east],
).pad(0.08);

function MapInteraction({ position, onChange, onInvalid }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(maximumBounds);
    map.fitBounds(maximumBounds, { padding: [8, 8] });
  }, [map, maximumBounds]);

  useMapEvents({
    click(event) {
      const nextPosition = [event.latlng.lat, event.latlng.lng];
      if (!isPointInBoundary(nextPosition[0], nextPosition[1], boundary)) {
        onInvalid();
        return;
      }
      onChange(nextPosition);
    },
  });

  return (
    <>
      <Polygon
        positions={outsideMask}
        pathOptions={{
          color: "#364b40",
          fillColor: "#364b40",
          fillOpacity: 0.38,
          weight: 0,
        }}
        interactive={false}
      />
      <GeoJSON
        data={boundary}
        style={{
          color: "#24684d",
          fillColor: "#4b9b70",
          fillOpacity: 0.08,
          weight: 3,
        }}
        interactive={false}
      />
      {position && (
        <Marker
          position={position}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const { lat, lng } = event.target.getLatLng();
              if (!isPointInBoundary(lat, lng, boundary)) {
                event.target.setLatLng(position);
                onInvalid();
                return;
              }
              onChange([lat, lng]);
            },
          }}
        />
      )}
    </>
  );
}

export default function LocationPicker({ position, onChange, onInvalid }) {
  const mapCenter = [
    (boundaryBounds.south + boundaryBounds.north) / 2,
    (boundaryBounds.west + boundaryBounds.east) / 2,
  ];

  return (
    <MapContainer
      center={mapCenter}
      zoom={12}
      scrollWheelZoom
      className="location-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInteraction
        position={position}
        onChange={onChange}
        onInvalid={onInvalid}
      />
    </MapContainer>
  );
}
