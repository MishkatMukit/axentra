import { prisma } from "../../config/prisma.js";

export type { User } from "../../generated/prisma/client.js";

type NewRefreshToken = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
};

const findByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

const findById = (id: string) => prisma.user.findUnique({ where: { id } });

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

const createRefreshToken = (data: NewRefreshToken) => prisma.refreshToken.create({ data });

const findRefreshToken = (tokenHash: string) =>
  prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

// Atomically revokes the old token and stores its replacement. Returns false if another
// request already rotated it (the conditional update matched nothing).
const rotateRefreshToken = (oldId: string, next: NewRefreshToken) =>
  prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id: oldId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) return false;
    await tx.refreshToken.create({ data: next });
    return true;
  });

const revokeRefreshToken = (tokenHash: string) =>
  prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });

const revokeAllForUser = (userId: string) =>
  prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

export const identityRepository = {
  findByEmail,
  findById,
  createLocalUserWithProfile,
  touchLastLogin,
  createRefreshToken,
  findRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
