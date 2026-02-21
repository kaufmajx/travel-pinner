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
    return NextResponse.json({ error: "Failed to fetch pins" }, { status: 500 });
  }
}

// POST a new pin
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.latitude || !body.longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude required" },
        { status: 400 }
      );
    }

    const newPin = await prisma.pin.create({
      data: {
        latitude: body.latitude,
        longitude: body.longitude,
        title: body.title || null,
      },
    });

    return NextResponse.json(newPin);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create pin" }, { status: 500 });
  }
}