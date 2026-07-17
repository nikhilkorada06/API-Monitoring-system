import logger from "../config/logger.js";

const requestLogger = (req, res, next) => {
    
    const startTime = Date.now();

    res.on("finish", () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        logger.info(`HTTP %s %s %s %dms`, req.method, req.originalUrl || req.url, req.ip || req.socket.remoteAddress, 
            duration, {
                method: req.method,
                path : req.originalUrl || req.url,
                status: res.statusCode,
                duration
            }
        );
    });

    next();
}

export default requestLogger;