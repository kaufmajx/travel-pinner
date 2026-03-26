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
    const isWishlist = Boolean(body.isWishlist);

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

      // coordinates
      latitude: toNumber(data.lat),
      longitude: toNumber(data.lon),

      continent: normalizeDisplay(address.continent),
      country: normalizeDisplay(address.country),
      state: normalizeDisplay(address.state),
      city: normalizeDisplay(cityRaw),

      countryCode: normalizeCountryCode(address.country_code), // e.g. "US"
      population: toNumber(extra.population),
    };

    if (!location.countryCode) {
      return NextResponse.json(
        { error: "Could not resolve country code for this location" },
        { status: 422 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const country = await tx.country.upsert({
        where: { code: location.countryCode }, // must be unique in schema
        update: {
          name: location.country ?? "Unknown",
          continent: location.continent,
        },
        create: {
          code: location.countryCode,
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
        ? location.osmId
          ? await tx.city.upsert({
              where: { osmId: location.osmId },
              update: {
                name: location.city,
                countryId: country.id,
                stateId: state?.id ?? null,
                latitude: location.latitude,
                longitude: location.longitude,
                population: location.population,
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
          : state?.id
            ? await tx.city.upsert({
                where: {
                  countryId_stateId_name: {
                    countryId: country.id,
                    stateId: state.id,
                    name: location.city,
                  },
                },
                update: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  population: location.population,
                },
                create: {
                  name: location.city,
                  countryId: country.id,
                  stateId: state.id,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  population: location.population,
                },
              })
            : await (async () => {
                const existing = await tx.city.findFirst({
                  where: {
                    countryId: country.id,
                    stateId: null,
                    name: location.city,
                  },
                });

                if (existing) {
                  return tx.city.update({
                    where: { id: existing.id },
                    data: {
                      latitude: location.latitude,
                      longitude: location.longitude,
                      population: location.population,
                    },
                  });
                }

                return tx.city.create({
                  data: {
                    name: location.city,
                    countryId: country.id,
                    stateId: null,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    population: location.population,
                  },
                });
              })()
        : null;

      const pinData: {
        latitude: number;
        longitude: number;
        title: string | null;
        isWishlist: boolean;
        country?: { connect: { id: string } };
        city?: { connect: { id: string } };
        author?: { connect: { id: number } };
      } = {
        latitude,
        longitude,
        title: body.title ?? null,
        isWishlist,
      };

      pinData.country = { connect: { id: country.id } };

      if (city?.id) {
        pinData.city = { connect: { id: city.id } };
      }

      if (typeof body.authorId === "number") {
        pinData.author = { connect: { id: body.authorId } };
      }

      const newPin = await tx.pin.create({
        data: pinData,
        include: {
          country: true,
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
