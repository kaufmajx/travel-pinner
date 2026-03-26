import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.pin.findMany({
      where: { countryId: { not: null } },
      distinct: ["countryId"],
      select: {
        country: {
          select: { code: true },
        },
      },
    });

    const codes = rows
      .map((row) => row.country?.code?.toUpperCase())
      .filter((code): code is string => Boolean(code));

    return NextResponse.json(codes);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error
        ? err.message
        : "Unknown error while fetching visited countries";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
