import type { AuthSession, AuthUser, LoginInput, RegisterInput } from "@axentra/contracts";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { createHash, randomBytes } from "node:crypto";
import config from "../../config/index.js";
import { signAccessToken } from "../../infrastructure/auth/jwt.js";
import { AppError } from "../../shared/errors.js";
import { identityRepository, type User } from "./identity.repository.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so both failure paths take the same time
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", BCRYPT_ROUNDS);
// A just-rotated token presented again within this window is a parallel refresh (e.g. two tabs), not theft
const REUSE_GRACE_MS = 10_000;

export type ClientMeta = { userAgent?: string; ipAddress?: string };
type IssuedSession = { session: AuthSession; refreshToken: string; refreshExpiresAt: Date };

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  authProvider: user.authProvider,
  emailVerified: user.emailVerified,
  hasGoogleLinked: user.googleId !== null,
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const newRefreshToken = (userId: string, meta: ClientMeta) => {
  const refreshToken = randomBytes(32).toString("base64url");
  const refreshExpiresAt = new Date(Date.now() + config.refresh_token_ttl_ms);
  return {
    refreshToken,
    refreshExpiresAt,
    row: { userId, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt, ...meta },
  };
};

const issueSession = async (user: User, meta: ClientMeta): Promise<IssuedSession> => {
  const { refreshToken, refreshExpiresAt, row } = newRefreshToken(user.id, meta);
  await identityRepository.createRefreshToken(row);
  return {
    session: { user: toAuthUser(user), accessToken: await signAccessToken(user.id) },
    refreshToken,
    refreshExpiresAt,
  };
};

const sessionExpired = () => new AppError("Session expired, please log in again", httpStatus.UNAUTHORIZED);

const register = async (input: RegisterInput, meta: ClientMeta): Promise<IssuedSession> => {
  if (await identityRepository.findByEmail(input.email)) {
    throw new AppError("An account with this email already exists", httpStatus.CONFLICT);
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  // A concurrent signup can still race past the check; the unique index (P2002) then returns 409
  const user = await identityRepository.createLocalUserWithProfile({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
  });
  return issueSession(user, meta);
};

const login = async (input: LoginInput, meta: ClientMeta): Promise<IssuedSession> => {
  const user = await identityRepository.findByEmail(input.email);
  // Google-only accounts have no password hash and fail the same way as a wrong password
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !valid) {
    throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
  }
  if (!user.isActive) {
    throw new AppError("This account has been disabled", httpStatus.FORBIDDEN);
  }

  return issueSession(await identityRepository.touchLastLogin(user.id), meta);
};

const refresh = async (refreshToken: string | undefined, meta: ClientMeta): Promise<IssuedSession> => {
  if (!refreshToken) throw new AppError("Authentication required", httpStatus.UNAUTHORIZED);

  const record = await identityRepository.findRefreshToken(hashToken(refreshToken));
  if (!record) throw sessionExpired();

  if (record.revokedAt) {
    // Reuse of a rotated token outside the grace window means it was likely stolen: end every session
    if (Date.now() - record.revokedAt.getTime() > REUSE_GRACE_MS) {
      await identityRepository.revokeAllForUser(record.userId);
    }
    throw sessionExpired();
  }
  if (record.expiresAt <= new Date()) throw sessionExpired();
  if (!record.user.isActive) throw new AppError("This account has been disabled", httpStatus.FORBIDDEN);

  const next = newRefreshToken(record.userId, meta);
  if (!(await identityRepository.rotateRefreshToken(record.id, next.row))) throw sessionExpired();

  return {
    session: { user: toAuthUser(record.user), accessToken: await signAccessToken(record.userId) },
    refreshToken: next.refreshToken,
    refreshExpiresAt: next.refreshExpiresAt,
  };
};

const logout = async (refreshToken: string | undefined): Promise<void> => {
  if (refreshToken) await identityRepository.revokeRefreshToken(hashToken(refreshToken));
};

const getMe = async (userId: string): Promise<AuthUser> => {
  const user = await identityRepository.findById(userId);
  if (!user || !user.isActive) throw new AppError("Authentication required", httpStatus.UNAUTHORIZED);
  return toAuthUser(user);
};

export const identityService = { register, login, refresh, logout, getMe };
