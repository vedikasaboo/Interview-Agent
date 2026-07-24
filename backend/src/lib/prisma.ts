import { PrismaClient } from "@prisma/client";

// Single instance for the whole app. No globalThis guard needed: `tsx watch`
// restarts the process on change rather than hot-swapping modules, so this
// never accumulates clients the way a Next.js dev server would.
export const prisma = new PrismaClient();
