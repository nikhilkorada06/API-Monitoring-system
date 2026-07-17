import dotenv from 'dotenv';

dotenv.config();

const config = {
    //Server
    server:{
        node_env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || "3000", 10),
    },

    //MongoDB
    mongo: {
        uri: process.env.MONGODB_URI || 'mongodb://mongo:27017/api_monitoring',
        dbName: process.env.MONGODB_DB_NAME || 'api_monitoring',
    },

    //MySQL
    mysql: {
        host: process.env.MYSQL_HOST || 'mysql',
        port: parseInt(process.env.MYSQL_PORT || "3306", 10),
        database: process.env.MYSQL_DATABASE || 'api_monitoring',
        user: process.env.MYSQL_USER || 'api_user',
        password: process.env.MYSQL_PASSWORD || 'api_password',

        // Additional MySQL settings for fethching metrics
        maxLimit: parseInt(process.env.MYSQL_MAX_LIMIT || "1000", 10), // maximum number of records to fetch in a single query
        metricsTimeoutMs: parseInt(process.env.MYSQL_METRICS_TIMEOUT_MS || "30000", 10), // timeout for metrics queries in milliseconds
    },

    //RabbitMQ
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672',
        queue: process.env.RABBITMQ_QUEUE || 'api_hits',
        publisherConfirms: process.env.RABBITMQ_PUBLISHER_CONFIRMS === 'true' || false,
        retryAttempts: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || "5", 10),
        retryDelay: parseInt(process.env.RABBITMQ_RETRY_DELAY || "1000", 10), // in milliseconds

        // Circuit Breaker settings
        circuitBreakerFailureThreshold: parseInt(process.env.RABBITMQ_CIRCUIT_BREAKER_FAILURE_THRESHOLD || "2", 10),
        circuitBreakerCooldownMs: parseInt(process.env.RABBITMQ_CIRCUIT_BREAKER_COOLDOWN_MS || "30000", 10), // in milliseconds
        circuitBreakerHalfOpenMaxAttempts: parseInt(process.env.RABBITMQ_CIRCUIT_BREAKER_HALF_OPEN_MAX_ATTEMPTS || "3", 10),

        // Retry strategy settings
        retryStrategyMaxRetryAttempts: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || "5", 10),
        retryStrategyBaseRetryDelay: parseInt(process.env.RABBITMQ_RETRY_BASE_DELAY || "200", 10), // in milliseconds
        retryStrategyMaxRetryDelay: parseInt(process.env.RABBITMQ_RETRY_MAX_DELAY || "5000", 10), // in milliseconds
        retryStrategyJitterFactor: parseFloat(process.env.RABBITMQ_RETRY_JITTER_FACTOR || "0.3"), // 30% jitter
    },

    //jwt
    jwt: {
        secret: process.env.JWT_SECRET || "your_jwt_secret",
        expiresIn: process.env.JWT_EXPIRES_IN || '24h', // 24 hours
    },

    //rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minute
        max: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10), // limit each IP to 100 requests per windowMs
    },

    cookieConfig: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24*60*60*1000, // 24 hours
    }
}

export default config;