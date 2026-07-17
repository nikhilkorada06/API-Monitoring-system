import mongoose, { mongo } from "mongoose";
import config from "./index.js";
import logger from "./logger.js";

/**
 * MongoDB database Manager/connector
 */

// Singleton pattern to manage MongoDB connection --> only one instance of MongoConnection will be created and used throughout the application.

class connectMongoDB {

    constructor(){
        this.connection = null;
    }


    /**
     * connect to MongoDB
     * @returns {Promise<mongoose.connection>}
     */
    async connect(){

        try {
            if(this.connection){
                logger.info("MongoDB is already connected !!!");
            }

            await mongoose.connect(config.mongo.uri, {
                dbName: config.mongo.dbName
            })

            this.connection = mongoose.connection;

            logger.info(`MongoDB Connected : ${config.mongo.uri}`);

            this.connection.on("error", err => {
                logger.error("MongoDB connection Error : ", err);
            })

            this.connection.on("disconnected", () => {
                logger.error("MongoDB disconnected !!!");
            })

            return this.connection;
        } catch (error) {
            logger.error("Failed to connect to MongoDB : ", error);
            throw error;
        }
    }

    /**
     * This helps to disconnect the active MongoDB connection...
     */

    async disconnect(){
        try {
            if(this.connection){
                await mongoose.disconnect();
                this.connection = null;
                logger.info("MongoDB disconnected !!!");
            }
        } catch (error) {
            logger.error("Failed to disconnect to MongoDB : ", error);
            throw error;
        }
    }

    /**
     * Get active connection
     * @returns {mongoose.connection}
     */

    async checkConnection(){
        return this.connection;
    }
}

export default new connectMongoDB();