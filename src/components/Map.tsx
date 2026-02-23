"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";

type Pin = {
  id: string;
  latitude: number;
  longitude: number;
  title: string | null;
  createdAt: string;
};

export default function TravelMap() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [leaflet, setLeaflet] = useState<typeof import("react-leaflet") | null>(
    null,
  );
  const [leafletCore, setLeafletCore] = useState<
    typeof import("leaflet") | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([import("react-leaflet"), import("leaflet")]).then(
      ([reactLeafletModule, leafletModule]) => {
        if (isMounted) {
          setLeaflet(reactLeafletModule);
          setLeafletCore(leafletModule);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPins() {
      try {
        const response = await fetch("/api/pins");
        if (!response.ok) {
          throw new Error("Failed to load saved pins");
        }
        const data = (await response.json()) as Pin[];
        if (isMounted) {
          setPins(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Unknown error loading pins";
          setError(message);
        }
      }
    }

    loadPins();

    return () => {
      isMounted = false;
    };
  }, []);

  const markerIcon = useMemo(() => {
    if (!leafletCore) return null;
    return leafletCore.icon({
      iconUrl: "/pin2.png",
      shadowUrl: "/pin2.png",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32],
      shadowSize: [40, 40],
      shadowAnchor: [20, 38],
    });
  }, [leafletCore]);

  async function createPin(latitude: number, longitude: number) {
    try {
      const locationData = await fetch(`/api/reverse?lat=${latitude}&lon=${longitude}`);
      
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error creating pin";
      setError(message);
    }

    try {
      const response = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to create pin");
      }

      const newPin = (await response.json()) as Pin;
      setPins((currentPins) => [newPin, ...currentPins]);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error creating pin";
      setError(message);
    }
  }

  if (!leaflet || !markerIcon) {
    return (
      <div
        style={{ height: "100%", width: "100%", backgroundColor: "#ffffff" }}
      />
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = leaflet;

  function AddMarker() {
    useMapEvents({
      click(e) {
        void createPin(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", backgroundColor: "#ffffff" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AddMarker />
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.latitude, pin.longitude]}
          icon={markerIcon}
        >
          <Popup>
            Lat: {pin.latitude.toFixed(4)} <br />
            Lng: {pin.longitude.toFixed(4)} <br />
            {pin.title ? pin.title : "Saved pin"}
          </Popup>
        </Marker>
      ))}
      {error ? (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: 12,
            left: 12,
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "8px 10px",
            maxWidth: 320,
          }}
        >
          {error}
        </div>
      ) : null}
    </MapContainer>
  );
}
