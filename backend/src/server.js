import express from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./shared/config/index.js";
import logger from "./shared/config/logger.js";
import mongodb from "./shared/config/mongodb.js";
import mysql from "./shared/config/mysql.js";
import rabbitmq from "./shared/config/rabbitmq.js";
import errorHandler from "./shared/middleware/errorHandler.js";
import ResponseFormatter from "./shared/utils/responseFormatter.js";
import AppError from "./shared/utils/AppError.js";
import { mongo } from "mongoose";
import cookieParser from "cookie-parser";

// Routes
import authRouter from "./services/auth/routes/authRouter.js";
import clientRouter from "./services/client/routes/clientRouter.js";
import ingestRouter from "./services/ingest/routes/ingestRoutes.js";
import analyticsRouter from "./services/analytics/routes/analyticsRouter.js";

/**
 * Initialize Express Application
 */
const app = express();

/**
 * Middlewares
 */
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    logger.info(`Incoming Request: ${req.method} from ${req.path}`, {
        ip: req.ip,
        method: req.method,
        userAgent: req.header["user-agent"],
    });
    next();
});

/**
 * Health Check Endpoint
 */
app.get("/health", (req, res) => {
    res.status(200).json(ResponseFormatter.success(
        {
            status: "Healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        },
        "Server is healthy",
        200
    ));
});


app.get("/", (req, res) => {
    res.status(200).json(
        ResponseFormatter.success(
            {
                service: "API Hit managing system",
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    auth: '/api/auth',
                    ingest: '/api/hit',
                    analytics: '/api/analytics',
                }
            },
            'API Managing System Service',
            200
        )
    )
});

/**
 * Routes
 */
app.use("/api/auth", authRouter);
app.use("/api/hit", ingestRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api", clientRouter);

/**
 * 404 Handler
 */
app.use((req, res) => {
    res.status(404).json(ResponseFormatter.error("EndPoint Not Found", 404))
});

app.use(errorHandler);

/**
 * Initialize Services
 * This function initializes all the required services like MongoDB, MySQL, RabbitMQ, etc.
 * It is called before starting the server to ensure that all services are up and running.
 * If any service fails to initialize, it throws an AppError with a 500 status code.
 */
async function initializeServices() {
    try{
        logger.info("Initializing Services...");
        await mongodb.connect();
        await mysql.testConnection();
        await rabbitmq.connect();
        logger.info("All Services Initialized Successfully!");
    } catch (error){
        logger.error("Failed to initialize services", {
            name: error.name,
            message: error.message,
            stack: error.stack,
        });
        throw new AppError("Failed to initialize services", 500, error.message);
    }
}

let server;

(async function startServer() {
    try{
        await initializeServices();
        server = app.listen(config.server.port, () => {
            logger.info(`Server is running on port ${config.server.port}`);
            logger.info(`Environment: ${config.server.node_env}`);
            logger.info(`MongoDB URI: ${config.mongo.uri}`);
            logger.info(`MySQL Host: ${config.mysql.host}`);
            logger.info(`RabbitMQ URL: ${config.rabbitmq.url}`);
            logger.info(`API available at: http://localhost:${config.server.port}/`);
        });
    } catch (error) {
        logger.error("Failed to start server", {
            name: error.name,
            message: error.message,
            stack: error.stack,
        });
        throw new AppError("Failed to start server", 500, error.message);
    }
})();


const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, Graceful Shutdown Initiated...`);

    /**
     *  callback fn inside server.close() will be executed after server is closed. 
     */
    if(!server) {
        logger.error("Server is not running, cannot perform graceful shutdown.");
        process.exit(1);
    }
    server.close(async () => {
        logger.info("server closed successfully !!!");
        try{
            await mongodb.disconnect();
            await mysql.closePool();
            await rabbitmq.close();
            logger.info("Graceful shutdown completed !!!");
            process.exit(0);
        } catch(error){
            logger.error("Graceful Shutdown Error", {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
            process.exit(1);
        }
    });

    // if this shutdown process should take max 10 secs after 10 secs we will do force shutdown. To avoid unexpected freezes or hangs.
    setTimeout(() => {
        logger.error("FORCED SHUTDOWN !!!");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

//this uncaughtException happens when Something unexpected happened while executing JavaScript.
process.on('uncaughtException', (error) => {
    logger.error("Uncaught Expression :", {
        name: error.name,
        message: error.message,
        stack: error.stack,
    });
    gracefulShutdown('uncaughtException')
})


process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", {
        reason,
        promise
    });

    gracefulShutdown("unhandledRejection");
});