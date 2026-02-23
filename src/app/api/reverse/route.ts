// app/api/reverse/route.ts

import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Missing lat or lon" },
      { status: 400 }
    )
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&extratags=1`,
    {
      headers: {
        "User-Agent": "flighty-app"
      }
    }
  )

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch location data" },
      { status: 500 }
    )
  }

  const data = await response.json()

  const address = data.address || {}
  const extra = data.extratags || {}

  // Normalize location hierarchy
  const location = {
    // Core identity
    osmId: data.osm_id?.toString() || null,
    osmType: data.osm_type || null,
    placeId: data.place_id?.toString() || null,

    // Coordinates
    latitude: parseFloat(data.lat),
    longitude: parseFloat(data.lon),

    // Display
    displayName: data.display_name || null,
    category: data.class || null,
    type: data.type || null,
    importance: data.importance || null,
    icon: data.icon || null,

    // Address breakdown (most important for DB)
    continent: address.continent || null,
    country: address.country || null,
    countryCode: address.country_code || null,

    region: address.region || null,
    state: address.state || null,
    stateDistrict: address.state_district || null,
    county: address.county || null,

    municipality: address.municipality || null,
    city:
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      null,

    borough: address.borough || null,
    suburb: address.suburb || null,
    district: address.district || null,
    neighbourhood: address.neighbourhood || null,

    road: address.road || null,
    houseNumber: address.house_number || null,
    postcode: address.postcode || null,

    // Extra tags
    capital: extra.capital || null,
    population: extra.population
      ? parseInt(extra.population)
      : null,
    website: extra.website || null,
    wikipedia: extra.wikipedia || null,
    wikidata: extra.wikidata || null,
  }

  return NextResponse.json(location)
}