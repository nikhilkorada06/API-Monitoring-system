import config from '../../../shared/config/index.js';
import { APPLICATION_ROLES } from '../../../shared/constants/roles.js';
import ResponseFormatter from '../../../shared/utils/responseFormatter.js';

class AuthController {
    constructor(authService) {
        if (!authService) {
            throw new Error('💔💔💔AuthService is required !!!');
        }
        this.authService = authService;
    }

    async MiddlewareToCreatePrimarySuperAdmin(req, res, next) {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({ message: "🙃🙃🙃 All name, email, and password are required !!!" });
            }

            const superAdminData = {
                username,
                email,
                password,
                role: APPLICATION_ROLES.SUPER_ADMIN,
            }

            const { token, user } = await this.authService.createPrimarySuperAdmin(superAdminData);

            res.cookie('authToken', token, {
                httpOnly: config.cookieConfig.httpOnly,
                secure: config.cookieConfig.secure,
                maxAge: config.cookieConfig.maxAge,
            });

            res.status(201).json(
                ResponseFormatter.success(
                    { 
                        user, 
                        token 
                    }, 
                    "🍹🍹🍹Super Admin User Created Successfully !!!", 
                    201
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async MiddlewareToRegisterUser(req, res, next) {
        try{
            const { username, email, password, role } = req.body;
            const userData = {
                username,
                email,
                password,
                role: role || APPLICATION_ROLES.CLIENT_VIEWER,
            };

            const { token, user } = await this.authService.RegisterUser(userData);
            
            res.cookie('authToken', token, {
                httpOnly: config.cookieConfig.httpOnly,
                secure: config.cookieConfig.secure,
                maxAge: config.cookieConfig.maxAge,
            });

            res.status(201).json(
                ResponseFormatter.success(
                    { 
                        user, 
                        token 
                    }, 
                    "🍹🍹🍹User Created Successfully !!!", 
                    201
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async MiddlewareToLoginUser(req, res, next) {
        try {
            const { username, password } = req.body;
            const { token, user } = await this.authService.LoginUser({ username, password });

            res.cookie('authToken', token, {
                httpOnly: config.cookieConfig.httpOnly,
                secure: config.cookieConfig.secure,
                maxAge: config.cookieConfig.maxAge,
            });

            res.status(201).json(
                ResponseFormatter.success(
                    { 
                        user, 
                        token 
                    }, 
                    "🍹🍹🍹 User LoggedIn Successfully !!!", 
                    201
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async MiddlewareToGetUserProfile(req, res, next) {
        try {
            const userId = req.user.userId;
            const user = await this.authService.getUserProfile({ userId });

            res.status(200).json(
                ResponseFormatter.success(
                    {
                        user 
                    },
                    "🍹🍹🍹 User Profile Retrieved Successfully !!!",
                    200
                )
            );
        } catch (error) {
            next(error);
        }
    }

    async MiddlewareToLogoutUser(req, res, next) {
        try {
            res.clearCookie('authToken', {
                httpOnly: config.cookieConfig.httpOnly,
                secure: config.cookieConfig.secure,
            }).status(200).json(   // if 204 is used, then no content can be sent in response, so using 200 instead of 204
                ResponseFormatter.success(
                    {},
                    "🍹🍹🍹 User LoggedOut Successfully !!!",
                    204
                )
            );
        } catch (error) {
            next(error);
        }   
    }
}

export default AuthController;