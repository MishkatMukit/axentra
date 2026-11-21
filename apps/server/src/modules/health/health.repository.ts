import { prisma } from "../../config/prisma.js";

const pingDatabase = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};

export const healthRepository = { pingDatabase };
