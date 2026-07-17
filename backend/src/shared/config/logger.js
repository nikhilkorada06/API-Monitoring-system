import winston from 'winston';
import config from './index.js';

/**
 * winston logger configuration 
 * Provides logging !!!
 */

const logger = winston.createLogger(
    {
        level: config.node_env === "production" ? "info" : "debug",
        
        format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),

        defaultMeta: {service: "api-monitoring"},

        transports: [
            new winston.transports.File({ filename: 'logs/errorLogs.log', level: "error"}),
            new winston.transports.File({ filename: "logs/combinedLogs.log"}),
        ],
    }
)

if(config.node_env !== "production"){
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
        )
    })
    )
}

export default logger;