import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all pins
export async function GET() {
  try {
    const pins = await prisma.pin.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pins);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Unknown error while fetching pins";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST a new pin
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required" },
        { status: 400 },
      );
    }

    // reverse geocoding to get location dat
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&extratags=1`,
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

    const result = await prisma.$transaction(async (tx) => {
      const country = await tx.country.upsert({
        where: { code: location.countryCode! }, // must be unique in schema
        update: {
          name: location.country ?? "Unknown",
          continent: location.continent,
        },
        create: {
          code: location.countryCode!,
          name: location.country ?? "Unknown",
          continent: location.continent,
        },
      });

      const state = location.state
        ? await tx.state.upsert({
            where: {
              countryId_name: {
                countryId: country.id,
                name: location.state,
              },
            },
            update: {},
            create: {
              name: location.state,
              countryId: country.id,
            },
          })
        : null;

      const city = location.city
        ? await tx.city.upsert({
            where: {
              countryId_stateId_name: {
                countryId: country.id,
                stateId: state?.id ?? null,
                name: location.city,
              },
            },
            update: {
              latitude: location.latitude,
              longitude: location.longitude,
              population: location.population,
              osmId: location.osmId,
            },
            create: {
              name: location.city,
              countryId: country.id,
              stateId: state?.id ?? null,
              latitude: location.latitude,
              longitude: location.longitude,
              population: location.population,
              osmId: location.osmId,
            },
          })
        : null;

      const newPin = await tx.pin.create({
        data: {
          latitude,
          longitude,
          title: body.title ?? null,
          authorId: body.authorId ?? null, // required in your schema
          cityId: city?.id ?? null,
        },
        include: {
          city: {
            include: {
              state: true,
              country: true,
            },
          },
        },
      });

      return { newPin, country, state, city };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Unknown error while creating pin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
