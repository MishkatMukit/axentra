import type { AuthUser, LoginInput, RegisterInput } from "@axentra/contracts";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { AppError } from "../../shared/errors.js";
import { identityRepository, type User } from "./identity.repository.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so both failure paths take the same time
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", BCRYPT_ROUNDS);

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  authProvider: user.authProvider,
  emailVerified: user.emailVerified,
  hasGoogleLinked: user.googleId !== null,
});

const register = async (input: RegisterInput): Promise<AuthUser> => {
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
  return toAuthUser(user);
};

const login = async (input: LoginInput): Promise<AuthUser> => {
  const user = await identityRepository.findByEmail(input.email);
  // Google-only accounts have no password hash and fail the same way as a wrong password
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !valid) {
    throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
  }
  if (!user.isActive) {
    throw new AppError("This account has been disabled", httpStatus.FORBIDDEN);
  }

  return toAuthUser(await identityRepository.touchLastLogin(user.id));
};

export const identityService = { register, login };
