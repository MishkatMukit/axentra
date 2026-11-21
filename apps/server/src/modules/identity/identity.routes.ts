import { LoginSchema, RegisterSchema } from "@axentra/contracts";
import { Router } from "express";
import { auth } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { identityController } from "./identity.controller.js";

export const identityRoutes = Router();

identityRoutes.post("/register", validate(RegisterSchema), identityController.register);
identityRoutes.post("/login", validate(LoginSchema), identityController.login);
identityRoutes.post("/refresh", identityController.refresh);
identityRoutes.post("/logout", identityController.logout);
identityRoutes.get("/me", auth, identityController.me);
