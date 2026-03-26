"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";

export default function PinMap() {
  const [leaflet, setLeaflet] = useState<typeof import("react-leaflet") | null>(
    null,
  );
  const [leafletCore, setLeafletCore] = useState<
    typeof import("leaflet") | null
  >(null);
  const [countriesGeoJson, setCountriesGeoJson] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visitedCountryCodes, setVisitedCountryCodes] = useState<Set<string>>(
    new Set(),
  );

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
    async function loadVisited() {
      const res = await fetch("/api/countries/visited");
      if (!res.ok) throw new Error("Failed to load visited countries");
      const codes = (await res.json()) as string[];
      if (isMounted)
        setVisitedCountryCodes(new Set(codes.map((c) => c.toUpperCase())));
    }
    loadVisited().catch((e) => setError(e.message));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCountries() {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
        );
        if (!response.ok) {
          throw new Error("Failed to load country boundaries");
        }
        const data = (await response.json()) as object;
        if (isMounted) {
          setCountriesGeoJson(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Unknown error loading countries";
          setError(message);
        }
      }
    }

    loadCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  const countryStyle = useMemo(() => {
    return (feature?: { properties?: Record<string, unknown> }) => {
      const code = String(feature?.properties?.ISO_A2 || "").toUpperCase();
      const isVisited = visitedCountryCodes.has(code);

      return {
        color: "#6b7280",
        weight: 1,
        fillColor: isVisited ? "#111827" : "#ffffff",
        fillOpacity: isVisited ? 0.75 : 1,
      };
    };
  }, [visitedCountryCodes]);

  if (!leaflet || !leafletCore || !countriesGeoJson) {
    return (
      <div
        style={{ height: "100%", width: "100%", backgroundColor: "#ffffff" }}
      />
    );
  }

  const { MapContainer, GeoJSON } = leaflet;

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", backgroundColor: "#ffffff" }}
    >
      <GeoJSON
        data={countriesGeoJson}
        style={countryStyle}
        onEachFeature={(feature, layer) => {
          const name = String(feature.properties?.ADMIN || "Country");

          layer.bindTooltip(name, { sticky: true });
        }}
      />

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
