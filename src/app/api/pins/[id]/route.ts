import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pinId = Number(id);

    if (!Number.isInteger(pinId)) {
      return NextResponse.json({ error: "Invalid pin id" }, { status: 400 });
    }

    const body = (await req.json()) as { isWishlist?: boolean; title?: string | null };
    const data: { isWishlist?: boolean; title?: string | null } = {};

    if (typeof body.isWishlist === "boolean") {
      data.isWishlist = body.isWishlist;
    }

    if (typeof body.title === "string" || body.title === null) {
      data.title = body.title;
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const pin = await prisma.pin.update({
      where: { id: pinId },
      data,
    });

    return NextResponse.json(pin);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error updating pin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const pinId = Number(id);

    if (!Number.isInteger(pinId)) {
      return NextResponse.json({ error: "Invalid pin id" }, { status: 400 });
    }

    await prisma.pin.delete({
      where: { id: pinId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error deleting pin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
