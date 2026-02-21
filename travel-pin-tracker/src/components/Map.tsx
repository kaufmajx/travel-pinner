"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";

type Pin = {
  lat: number;
  lng: number;
};

export default function TravelMap() {
  const [pins, setPins] = useState<Pin[]>([]);

  function AddMarker() {
    useMapEvents({
      click(e) {
        setPins([...pins, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AddMarker />
      {pins.map((pin, index) => (
        <Marker key={index} position={[pin.lat, pin.lng]}>
          <Popup>
            Lat: {pin.lat.toFixed(2)} <br />
            Lng: {pin.lng.toFixed(2)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}