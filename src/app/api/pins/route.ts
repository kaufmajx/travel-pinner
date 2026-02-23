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
        { status: 400 }
      );
    }

    const newPin = await prisma.pin.create({
      data: {
        latitude,
        longitude,
        title: body.title || null,
      },
    });

    return NextResponse.json(newPin);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Unknown error while creating pin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
