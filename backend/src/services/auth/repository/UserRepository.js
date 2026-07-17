import BaseRepository from './BaseRepository.js';
import logger from '../../../shared/config/logger.js';
import UserModel from '../../../shared/models/User.js'

class MongoUserRepository extends BaseRepository {

    constructor() {
        super(UserModel);
    }

    async create(userData) {
        try {
            let data = {...userData};

            if(data.role === "super_admin" && !data.permissions){
                data.permissions = {
                    canCreateApiKey: true,
                    canManageUsers: true,
                    canViewAnalytics: true,
                    canExportData: true,
                }
            }

            const newUser = new this.model(data);
            await newUser.save();
            
            logger.info("🍹🍹🍹New User Created Successfully !!!", {
                username: newUser.username,
            });
            return newUser;
        } catch (error) {
            logger.error("💔💔💔 Error Creating User --->", error);
            throw error;
        }
    }

    async findById(id) {
        try {
            return await this.model.findById(id);
        } catch (error) {
            logger.error("💔💔💔 Error Finding User by ID --->", error);
            throw error;
        }
    }

    async findByUsername(username) {
        try {
            return await this.model.findOne({ username });
        } catch (error) {
            logger.error("💔💔💔 Error Finding User by UserName --->", error);
            throw error;
        }
    }

    async findByEmail(email) {
        try {
            return await this.model.findOne({ email });
        } catch (error) {
            logger.error("💔💔💔 Error Finding User by E-Mail --->", error);
            throw error;
        }
    }

    async findAll() {
        try {
            return await this.model.find().select("-password");
        } catch (error) {
            logger.error("💔💔💔 Error Fetching All Users --->", error);
            throw error;
        }
    }
};

export default new MongoUserRepository();