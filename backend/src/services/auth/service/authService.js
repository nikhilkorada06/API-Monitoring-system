import logger from '../../../shared/config/logger.js';
import jwt from 'jsonwebtoken';
import AppError from '../../../shared/utils/AppError.js';
import config from '../../../shared/config/index.js';
import bcrypt from 'bcryptjs';
import { APPLICATION_ROLES } from '../../../shared/constants/roles.js';

class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    generateToken(user) {
        const payload = {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            clientId: user.clientId,
        }

        return jwt.sign(payload, config.jwt.secret, { 
            expiresIn: config.jwt.expiresIn
        });
    }

    removeSensitiveInfo(user) {
        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;
    }

    async comparePassword(userEnteredPassword, hashedPassword) {
        return await bcrypt.compare(userEnteredPassword, hashedPassword);
    }

    async createPrimarySuperAdmin(userData) {
        try {
            const existingUsers = await this.userRepository.findAll();

            if(existingUsers && existingUsers.length > 0) {
                throw new Error("🙃🙃🙃 Onboarding user already exists. Cannot create another one.");
            }

            const newUser = await this.userRepository.create(userData);
            const token = this.generateToken(newUser);

            logger.info("🍹🍹🍹Super Admin User Created Successfully !!!", {
                username: newUser.username,
            });

            return {
                user: this.removeSensitiveInfo(newUser),
                token,
            }

        } catch (error) {
            logger.error("💔💔💔 Error Creating Super Admin User --->", {
                username: userData.username,
                error: error.message,
            });
            throw error;
        }
    }

    async RegisterUser(userData) {
        try {
            const existingUserName = await this.userRepository.findByUsername(userData.username);

            if(existingUserName){
                throw new AppError(
                    `🙃🙃🙃 ${userData.username} already exists try using a different USERNAME !!!`,
                    409,
                )
            }

            const existingEmail = await this.userRepository.findByEmail(userData.username);

            if(existingEmail){
                throw new AppError(
                    `🙃🙃🙃 ${userData.email} already exists try using a different E-MAIL !!!`,
                    409,
                )
            }

            const newUser = await this.userRepository.create(userData);
            const token = await this.generateToken(newUser);

            logger.info("🍹🍹🍹New User REGISTERED Successfully !!!", {
                username: newUser.username,
            });

            return {
                user: this.removeSensitiveInfo(newUser),
                token,
            }
        } catch (error) {
            logger.error("💔💔💔 Error Creating New User --->", {
                username: userData.username,
                error: error.message,
            });
            throw error;
        }
    }

    async LoginUser(userData) {
        try {
            const { username, password } = userData;
            const existingUser = await this.userRepository.findByUsername(username);
            
            if(!existingUser){
                throw new AppError(
                    `😔😔😔 User with this ${username} is not Existing !!!`,
                    401
                );
            }

            if(!existingUser.isActive) {
                throw new AppError(
                    `💔💔💔 Account is Deactivated !!!`,
                    403
                );
            }
    
            const isPasswordCorrect = this.comparePassword(password, existingUser.password);

            if(!isPasswordCorrect){
                throw new AppError(
                    `💔💔💔 INVALID CREADENTIALS !!!`, 
                    401
                );
            }

            const token = await this.generateToken(existingUser);

            logger.info("🍹🍹🍹 User LoggedIn Successfully !!!", {
                username: existingUser.username,
            });

            return {
                token,
                user: this.removeSensitiveInfo(existingUser)
            }
        } catch (error) {
            logger.error("💔💔💔 Error in login service !!!", error);
            throw error;
        }
    }

    async getUserProfile({ userId }) {
        try {
            const user = await this.userRepository.findById(userId);

            if(!user){
                throw new AppError(
                    `😔😔😔 User with this ${userId} is not Existing !!!`,
                    404
                );
            }

            logger.info("🍹🍹🍹 User Profile Fetched Successfully !!!", {
                username: user.username,
            });

            return this.removeSensitiveInfo(user);
        } catch (error) {
            logger.error("💔💔💔 Error in Fetching User Profile service !!!", error);
            throw error;
        }
    }

    async checkIfUserIsSuperAdmin(userId) {
        try {
            const user = await this.userRepository.findById(userId);

            if(!user){
                throw new AppError(
                    `😔😔😔 User with this ${userId} is not Existing !!!`,
                    404
                );
            }

            return user.role === APPLICATION_ROLES.SUPER_ADMIN;
        } catch (error) {
            logger.error("💔💔💔 Error in checking if user is super admin service !!!", error);
            throw error;
        }
    }
}

export default AuthService;