// app/api/reverse/route.ts

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat or lon" }, { status: 400 });
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&extratags=1`,
    {
      headers: {
        "User-Agent": "pin-traveler-app",
      },
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch location data" },
      { status: 500 },
    );
  }

  const data = await response.json();

  const address = data.address || {};
  const extra = data.extratags || {};

  const normalizeDisplay = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const cleaned = value.trim().replace(/\s+/g, " ");
    return cleaned.length ? cleaned : null;
  };

  const normalizeKey = (value: unknown): string | null => {
    const display = normalizeDisplay(value);
    return display ? display.toLocaleLowerCase("en-US") : null;
  };

  const normalizeCountryCode = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const cleaned = value.trim().toUpperCase();
    return cleaned.length ? cleaned : null;
  };

  const toNumber = (value: unknown): number | null => {
    const n =
      typeof value === "string" || typeof value === "number"
        ? Number(value)
        : NaN;
    return Number.isFinite(n) ? n : null;
  };

  // normalize source data
  const cityRaw =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    null;

  const location = {
    // identity
    osmId: data.osm_id != null ? String(data.osm_id) : null,
    osmType: normalizeDisplay(data.osm_type),
    placeId: data.place_id != null ? String(data.place_id) : null,

    // coordinates
    latitude: toNumber(data.lat),
    longitude: toNumber(data.lon),

    // display
    displayName: normalizeDisplay(data.display_name),
    category: normalizeDisplay(data.class),
    type: normalizeDisplay(data.type),
    importance: toNumber(data.importance),
    icon: normalizeDisplay(data.icon),

    // display names
    continent: normalizeDisplay(address.continent),
    country: normalizeDisplay(address.country),
    state: normalizeDisplay(address.state),
    city: normalizeDisplay(cityRaw),

    // stable DB keys
    countryCode: normalizeCountryCode(address.country_code), // e.g. "US"
    countryKey: normalizeKey(address.country), // e.g. "united states"
    stateKey: normalizeKey(address.state), // e.g. "california"
    cityKey: normalizeKey(cityRaw), // e.g. "san francisco"

    // optional extra normalized fields
    region: normalizeDisplay(address.region),
    stateDistrict: normalizeDisplay(address.state_district),
    county: normalizeDisplay(address.county),
    municipality: normalizeDisplay(address.municipality),
    borough: normalizeDisplay(address.borough),
    suburb: normalizeDisplay(address.suburb),
    district: normalizeDisplay(address.district),
    neighbourhood: normalizeDisplay(address.neighbourhood),
    road: normalizeDisplay(address.road),
    houseNumber: normalizeDisplay(address.house_number),
    postcode: normalizeDisplay(address.postcode),

    capital: normalizeDisplay(extra.capital),
    population: toNumber(extra.population),
    website: normalizeDisplay(extra.website),
    wikipedia: normalizeDisplay(extra.wikipedia),
    wikidata: normalizeDisplay(extra.wikidata),
  };

  return NextResponse.json(location);
}
