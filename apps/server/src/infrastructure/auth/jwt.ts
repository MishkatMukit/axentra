import { jwtVerify, SignJWT } from "jose";
import config from "../../config/index.js";

const secret = new TextEncoder().encode(config.jwt_access_secret);
const ISSUER = "axentra-api";

export const signAccessToken = (userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(config.access_token_ttl)
    .sign(secret);

// Throws on a bad signature, wrong issuer, or expiry
export const verifyAccessToken = async (token: string): Promise<{ userId: string }> => {
  const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: ["HS256"] });
  if (!payload.sub) throw new Error("Token has no subject");
  return { userId: payload.sub };
};
