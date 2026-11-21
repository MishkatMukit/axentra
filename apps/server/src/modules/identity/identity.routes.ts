import { LoginSchema, RegisterSchema } from "@axentra/contracts";
import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { identityController } from "./identity.controller.js";

export const identityRoutes = Router();

identityRoutes.post("/register", validate(RegisterSchema), identityController.register);
identityRoutes.post("/login", validate(LoginSchema), identityController.login);
