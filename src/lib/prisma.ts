// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const databaseUrl = new URL(connectionString);
const sslMode = databaseUrl.searchParams.get("sslmode");
if (sslMode === "require" && !databaseUrl.searchParams.has("uselibpqcompat")) {
  databaseUrl.searchParams.set("uselibpqcompat", "true");
}

const pool =
  global.pgPool ||
  new Pool({
    connectionString: databaseUrl.toString(),
  });

const adapter = new PrismaPg(pool);

export const prisma = global.prisma || new PrismaClient({ adapter, log: ["query"] });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.pgPool = pool;
}
