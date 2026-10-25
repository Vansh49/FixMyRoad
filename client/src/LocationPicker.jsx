import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const markerIcon = divIcon({
  className: "location-marker",
  html: '<span class="location-marker-pin"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 22],
});

function MapInteraction({ position, onChange }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [map, position]);

  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      icon={markerIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          const { lat, lng } = event.target.getLatLng();
          onChange([lat, lng]);
        },
      }}
    />
  );
}

export default function LocationPicker({ position, onChange }) {
  return (
    <MapContainer center={position} zoom={14} scrollWheelZoom className="location-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInteraction position={position} onChange={onChange} />
    </MapContainer>
  );
}
