import express from "express";
import requestLogger from "../../../shared/middleware/requestLogger.js";
import validate from "../../../shared/middleware/validate.js";
import { AuthSchemaForSuperAdmin, loginSchema, registrationSchema } from "../validation/authSchema.js";
import initializedContainer from "../../../services/auth/Dependencies/Container.js";
import authenticate from "../../../shared/middleware/authenticate.js";
import authorize from "../../../shared/middleware/authorize.js";
import { APPLICATION_ROLES } from "../../../shared/constants/roles.js";

const router = express.Router();
const authController = initializedContainer.controllers.authController

router.post("/primary-super-admin-login", 
    requestLogger,
    validate(AuthSchemaForSuperAdmin),
    (req, res, next) => authController.MiddlewareToCreatePrimarySuperAdmin(req, res, next)
);

router.post("/register-new-user",
    requestLogger,
    authenticate,
    authorize([APPLICATION_ROLES.SUPER_ADMIN]),
    validate(registrationSchema),
    (req, res, next) => authController.MiddlewareToRegisterUser(req, res, next)
);

router.post("/login-user",
    requestLogger,
    validate(loginSchema),
    (req, res, next) => authController.MiddlewareToLoginUser(req, res, next)
)

router.get("/profile",
    requestLogger,
    authenticate,
    (req, res, next) => authController.MiddlewareToGetUserProfile(req, res, next)
)

router.post("/logout-user",
    requestLogger,
    (req, res, next) => authController.MiddlewareToLogoutUser(req, res, next)
)

export default router;