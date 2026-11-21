import { z } from "zod";

// Normalized so lookups and the unique index are case-insensitive in practice
const email = z.string().trim().toLowerCase().pipe(z.email());

export const RegisterSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    // bcrypt only reads the first 72 bytes; longer passwords would silently truncate
    .refine((p) => new TextEncoder().encode(p).length <= 72, "Password must be at most 72 bytes"),
  fullName: z.string().trim().min(1, "Full name is required").max(100),
});

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(1024),
});

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  authProvider: z.enum(["LOCAL", "GOOGLE", "BOTH"]),
  emailVerified: z.boolean(),
  hasGoogleLinked: z.boolean(),
});

// Returned by register, login, and refresh. The refresh token travels only as an HTTP-only cookie.
export const AuthSessionSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
