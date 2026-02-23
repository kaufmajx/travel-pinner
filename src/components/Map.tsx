"use client";

import "leaflet/dist/leaflet.css";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type Pin = {
  id: number;
  latitude: number;
  longitude: number;
  title: string | null;
  isWishlist: boolean;
  createdAt: string;
};

type CreatePinResponse = {
  newPin?: Pin;
} & Partial<Pin>;

export default function TravelMap() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [draftTitle, setDraftTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activePinId, setActivePinId] = useState<number | null>(null);
  const [leaflet, setLeaflet] = useState<typeof import("react-leaflet") | null>(
    null,
  );
  const [leafletCore, setLeafletCore] = useState<
    typeof import("leaflet") | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const draftMarkerRef = useRef<import("leaflet").Marker | null>(null);

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
      iconUrl: "/pin1.png",
      shadowUrl: "/pin1.png",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32],
      shadowSize: [40, 40],
      shadowAnchor: [20, 38],
    });
  }, [leafletCore]);

  const draftMarkerIcon = useMemo(() => {
    if (!leafletCore) return null;
    return leafletCore.icon({
      iconUrl: "/pin1-draft.png",
      shadowUrl: "/pin1-draft.png",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32],
      shadowSize: [40, 40],
      shadowAnchor: [20, 38],
    });
  }, [leafletCore]);

  const wishlistMarkerIcon = useMemo(() => {
    if (!leafletCore) return null;
    return leafletCore.icon({
      iconUrl: "/pin1-wishlist.png",
      shadowUrl: "/pin1-wishlist.png",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32],
      shadowSize: [40, 40],
      shadowAnchor: [20, 38],
    });
  }, [leafletCore]);

  useEffect(() => {
    if (draftPin && draftMarkerRef.current) {
      draftMarkerRef.current.openPopup();
    }
  }, [draftPin]);

  function stopEvent(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  async function createPin(latitude: number, longitude: number, title: string) {
    try {
      const response = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          title: title.trim() ? title.trim() : null,
          isWishlist: false,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to create pin");
      }

      const payload = (await response.json()) as CreatePinResponse;
      const newPin = payload.newPin ?? (payload as Pin);

      if (
        typeof newPin?.id !== "number" ||
        typeof newPin?.latitude !== "number" ||
        typeof newPin?.longitude !== "number"
      ) {
        throw new Error("Unexpected response while creating pin");
      }

      setPins((currentPins) => [newPin, ...currentPins]);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error creating pin";
      setError(message);
    }
  }

  async function toggleWishlist(pin: Pin) {
    try {
      setActivePinId(pin.id);
      const response = await fetch(`/api/pins/${pin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWishlist: !pin.isWishlist }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to update wishlist");
      }

      const updatedPin = (await response.json()) as Pin;
      setPins((currentPins) =>
        currentPins.map((currentPin) =>
          currentPin.id === updatedPin.id ? updatedPin : currentPin,
        ),
      );
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error updating wishlist";
      setError(message);
    } finally {
      setActivePinId(null);
    }
  }

  async function deletePin(pinId: number) {
    try {
      setActivePinId(pinId);
      const response = await fetch(`/api/pins/${pinId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to delete pin");
      }

      setPins((currentPins) => currentPins.filter((pin) => pin.id !== pinId));
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error deleting pin";
      setError(message);
    } finally {
      setActivePinId(null);
    }
  }

  if (!leaflet || !markerIcon || !draftMarkerIcon || !wishlistMarkerIcon) {
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
        if (isSaving || activePinId !== null) return;
        setDraftPin({ lat: e.latlng.lat, lng: e.latlng.lng });
        setDraftTitle("");
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", backgroundColor: "#ffffff" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AddMarker />

      {draftPin ? (
        <Marker
          position={[draftPin.lat, draftPin.lng]}
          icon={draftMarkerIcon}
          ref={draftMarkerRef}
        >
          <Popup closeOnEscapeKey={!isSaving} closeButton={!isSaving}>
            <div
              style={{ minWidth: 220 }}
              onMouseDown={stopEvent}
              onClick={stopEvent}
            >
              <p style={{ marginBottom: 8 }}>Save this pin?</p>
              <input
                type="text"
                placeholder="Add a title (optional)"
                value={draftTitle}
                onMouseDown={stopEvent}
                onClick={stopEvent}
                onChange={(e) => setDraftTitle(e.target.value)}
                disabled={isSaving}
                style={{
                  width: "100%",
                  marginBottom: 8,
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  padding: "6px 8px",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={isSaving}
                  onMouseDown={stopEvent}
                  onClick={async (e) => {
                    stopEvent(e);
                    setIsSaving(true);
                    await createPin(draftPin.lat, draftPin.lng, draftTitle);
                    setIsSaving(false);
                    setDraftPin(null);
                    setDraftTitle("");
                  }}
                  style={{
                    backgroundColor: "#111827",
                    color: "#ffffff",
                    borderRadius: 6,
                    padding: "6px 10px",
                    border: "none",
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {isSaving ? "Saving..." : "Confirm"}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onMouseDown={stopEvent}
                  onClick={(e) => {
                    stopEvent(e);
                    setDraftPin(null);
                    setDraftTitle("");
                  }}
                  style={{
                    backgroundColor: "#f3f4f6",
                    color: "#111827",
                    borderRadius: 6,
                    padding: "6px 10px",
                    border: "1px solid #d1d5db",
                    cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ) : null}

      {pins.map((pin) => {
        const isBusy = activePinId === pin.id;

        return (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={pin.isWishlist ? wishlistMarkerIcon : markerIcon}
          >
            <Popup>
              <div
                onMouseDown={stopEvent}
                onClick={stopEvent}
                style={{ minWidth: 230 }}
              >
                <div style={{ marginBottom: 6, fontWeight: 600 }}>
                  {pin.title || "Saved pin"}
                </div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  Lat: {pin.latitude.toFixed(4)}
                  <br />
                  Lng: {pin.longitude.toFixed(4)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    disabled={isBusy}
                    onMouseDown={stopEvent}
                    onClick={(e) => {
                      stopEvent(e);
                      void toggleWishlist(pin);
                    }}
                    style={{
                      backgroundColor: pin.isWishlist ? "#f59e0b" : "#111827",
                      color: "#ffffff",
                      borderRadius: 6,
                      padding: "6px 10px",
                      border: "none",
                      fontSize: 12,
                      cursor: isBusy ? "not-allowed" : "pointer",
                    }}
                  >
                    {isBusy
                      ? "Saving..."
                      : pin.isWishlist
                        ? "Remove Wishlist"
                        : "Add to Wishlist"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onMouseDown={stopEvent}
                    onClick={(e) => {
                      stopEvent(e);
                      void deletePin(pin.id);
                    }}
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#b91c1c",
                      borderRadius: 6,
                      padding: "6px 10px",
                      border: "1px solid #fecaca",
                      fontSize: 12,
                      cursor: isBusy ? "not-allowed" : "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

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
