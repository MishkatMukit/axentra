import { prisma } from "../../config/prisma.js";

export type { User } from "../../generated/prisma/client.js";

const findByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

// Signup exception to "repositories write only their own schema" (spec section 4):
// the 1:1 Profile is created in the same nested write, which Prisma runs as one transaction.
const createLocalUserWithProfile = (data: { email: string; passwordHash: string; fullName: string }) =>
  prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      authProvider: "LOCAL",
      profile: { create: { fullName: data.fullName } },
    },
  });

const touchLastLogin = (id: string) =>
  prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });

export const identityRepository = { findByEmail, createLocalUserWithProfile, touchLastLogin };
