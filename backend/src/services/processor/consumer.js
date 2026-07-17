import { z } from 'zod';
import rabbitmq from '../../shared/config/rabbitmq.js';
import mongodb from '../../shared/config/mongodb.js';
import mysql from '../../shared/config/mysql.js';
import config from '../../shared/config/index.js';
import logger from '../../shared/config/logger.js';
import processorContainer from './Dependencies/Container.js';
import { EVENT_TYPES } from '../../shared/events/EventContracts.js';
import { RetryStrategy, isErrorRetryable } from '../../shared/events/producer/RetryStrategy.js';
import { CircuitBreaker } from '../../shared/events/producer/CircuitBreaker.js';

const messageSchema = z.object({
    type: z.enum([EVENT_TYPES.API_HIT]),
    data: z.record(z.string(), z.unknown()),
    messageId: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
});

class EventConsumer {
    constructor({ processorService, rabbitmq, mongodb, mysql, config, logger, retryStrategy, circuitBreaker }) {
        this._processorService = processorService;
        this._rabbitmq = rabbitmq;
        this._mongodb = mongodb;
        this._mysql = mysql;
        this._config = config;
        this._logger = logger;
        this._retryStrategy = retryStrategy;
        this._circuitBreaker = circuitBreaker;

        this.isRunning = false;
        this.channel = null;
        this._stats = { 
            processed: 0, 
            failed: 0, 
            retried: 0, 
            dlqRouted: 0, 
            lastProcessedAt: null 
        };
        this._processedIds = new Set();
        this._poisonMessages = new Map(); // messageType -> consecutive failure count
    };

    async start() {
        try {
            await this._connectDatabases();
            this.channel = await this._rabbitmq.connect();
            const prefetch = this._config.rabbitmq.prefetch || 10;
            await this.channel.prefetch(prefetch);

            this.channel.on('error', (err) => {
                this._logger.error('💔💔💔 RabbitMQ consumer side channel error :', err);
                this._circuitBreaker.onFailure();
            });

            this.channel.on('close', () => {
                this._logger.warn('💔💔💔 RabbitMQ consumer side channel closed unexpectedly !!!');
                if(this.isRunning) {
                    this._reconnectToRabbitMQ();
                }
            });

            this._logger.info(`Started consuming from queue: ${this._config.rabbitmq.queue}`);
            this.isRunning = true;

            await this.channel.consume(
                this._config.rabbitmq.queue,
                async (message) => {
                    if (message !== null) await this._handleMessage(message);
                }, 
                { 
                    noAck: false, 
                    consumerTag: `consumer-${Date.now()}` 
                }
            );

            this._logger.info('👌🏻👌🏻👌🏻 Event consumer is running !!!');

        } catch(error) {
            this._logger.error("❌❌❌ Error while starting consumer :", error);
            this._cleanUp();
            throw error;
        }
    }

    async _cleanUp() {
        try {
            this.isRunning = false;
            if(this.channel) {
                await this.channel.close();
                this._logger.info("😔😔😔 RabbitMQ channel closed from consumer side with _cleanUp function Successfully !!!");
                this.channel = null;
            }
        } catch(error) {
            this._logger.error("❌❌❌ Error during cleanup :", error);
            throw error;
        }
    }

    async _connectDatabases() {
        const maxRetries = 5;
        let retries = 0;

        while(retries < maxRetries) {
            try {
                this._logger.info(`⏰⏰⏰ Connecting to Databases... Attempt : ${retries + 1}`);
                await Promise.all(
                    [
                        this._mongodb.connect(),
                        this._mysql.testConnection()
                    ]
                );

                this._logger.info("✅✅✅ Connected to Databases Successfully !!!");

                return;

            } catch(error) {
                retries++;
                this._logger.error("❌❌❌ Failed to connect to Databases", error);

                if(retries >= maxRetries) {
                    this._logger.error("❌❌❌ Maximum retries reached. Could not connect to Databases.");
                    throw error;
                }

                await new Promise(resolve => setTimeout(resolve, 5000 * retries));
            }
        }
    }

    async _reconnectToRabbitMQ() {
        try{
            await new Promise(resolve => setTimeout(resolve, 5000)); // wait for 5 seconds before reconnecting
            this.channel = await this._rabbitmq.connect();
            const prefetch = this._config.rabbitmq.prefetch || 10;
            await this.channel.prefetch(prefetch);

            this.channel.on('error', (err) => {
                this._logger.error('💔💔💔 RabbitMQ consumer side channel error :', err);
                this._circuitBreaker.onFailure();
            });

            this.channel.on('close', () => {
                this._logger.warn('💔💔💔 RabbitMQ consumer side channel closed unexpectedly !!!');
                if(this.isRunning) {
                    this._reconnectToRabbitMQ();
                }
            });

            await this.channel.consume(
                this._config.rabbitmq.queue,
                async (msg) => {
                    if(msg !== null) {
                        await this._handleMessage(msg);
                    }
                },
                {
                    noAck: false,
                    consumerTag: `consumer - ${Date.now()}`,
                }
            );

        } catch(error) {
            this._logger.error("❌❌❌ Error while waiting to reconnect to RabbitMQ : ", error);
            if(this.isRunning) {
                setTimeout(() => this._reconnectToRabbitMQ(), 10000); // retry after 10 seconds
            }
        }
    }

    async _handleMessage(message) {
        if(!this._circuitBreaker.allowRequest()) {
            this._logger.warn("⚠️⚠️⚠️ Circuit breaker is open. Requeing the message.");
            this.channel.nack(message, false, true); // requeue the message --> first argument is the message, second is multiple (false means only this message), third is requeue (true means requeue)
            return;
        }

        this._logger.info("A - Entered handleMessage");
        
        const startTime = Date.now();
        let messageData = null;

        try {
            messageData = await this._parseMessage(message);

            this._logger.info("B - Message parsed");

            //Idempotency check: If the message has already been processed, we can ack it and return early.
            if(this._processedIds.has(messageData.messageId)) {
                this._logger.info("⚠️⚠️⚠️ Duplicate message detected. Skipping the processing of this message.", {
                    messageId: messageData.messageId,
                    type: messageData.type,
                });
                this.channel.ack(message);
                return;
            }

            await this._processMessage(messageData);

            this._logger.info("C - Process message completed");

            this.channel.ack(message);
            this._circuitBreaker.onSuccess();
            this._stats.processed++;
            this._stats.lastProcessedAt = new Date();

            // Add the messageId to the processed set to prevent reprocessing to check for duplicates.
            this._processedIds.add(messageData.messageId);

            if(this._processedIds.size > 10_000) {
                const firstProcessedId = this._processedIds.values().next().value;
                this._processedIds.delete(firstProcessedId);
            }

            this._poisonMessages.delete(messageData.type);

        } catch(error) {
            await this._handleProcessingError(error, message, messageData, startTime);
        }
    }

    async _parseMessage(message) {
        try {
            const messageContent = message.content.toString();

            console.log("RAW STRING:");
            console.log(messageContent);

            const messageData = JSON.parse(messageContent);

            console.log("PARSED OBJECT:");
            console.log(messageData);

            const zodParsedData = messageSchema.safeParse(messageData);

            console.log("ZOD RESULT:");
            console.log(zodParsedData);

            if(!zodParsedData.success) {
                this._logger.error("❌❌❌ ZOD Message validation failed :", zodParsedData.error);
                throw new Error("ZOD Message validation failed");
            }

            return {
                ...zodParsedData.data,
                messageId: message.properties.messageId || messageData.messageId || "unknown",
                retryCount: parseInt(message.properties.headers?.['x-retry-count'] || 0),
            };
        } catch(error) {
            this._logger.error("❌❌❌ Error parsing or validating message :", error);
            throw error;
        }
    }

    async _processMessage(messageData) {

        console.log("PROCESS MESSAGE =", messageData);

        switch(messageData.type) {
            case EVENT_TYPES.API_HIT:
                await this._processorService.processEvent(messageData.data);
                break; 
            default:
                throw new Error(`💔💔💔 Unknown event type: ${messageData.type}`)
        }
    }

    async _handleProcessingError(error, message, messageData, startTime) {

        this._logger.error("PROCESSING ERROR", {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });

        const messgeId = messageData?.messageId || message.properties.messageId || "unknown";
        const retryCount = messageData?.retryCount ||  0;
        this._circuitBreaker.onFailure();
        this._stats.failed++;

        const eventType = messageData?.type || "unknown";
        const poisonCount = (this._poisonMessages.get(eventType) || 0) + 1;
        this._poisonMessages.set(eventType, poisonCount);

        if(poisonCount >= 10) {
            this._logger.error("💀💀💀 Poison message detected. Routing to DLQ.", {
                eventType,
                consecutiveFailures: poisonCount,
            });
        } 

        if(!isErrorRetryable(error)  || !this._retryStrategy.shouldRetry(retryCount)) {
            await this._sendToDLQ(message, error, retryCount >= this._retryStrategy.maxRetries ? "MAX_RETRIES_EXCEEDED" : "NON_RETRYABLE_ERROR");
            return;
        }

        await this._retryMessage(message, retryCount);
    };

    async _sendToDLQ(message, error, reason) {
        try {
            const dlqName = `${this._config.rabbitmq.queue}.dlq`;
            this.channel.sendToQueue(dlqName, message.content, {
                ...message.properties,
                persistent: true,
                headers: {
                    ...message.properties.headers,
                    'x-dlq-reason': reason,
                    'x-dlq-error': error.message,
                    'x-dlq-timestamp': Date.now(),
                    'x-original-queue': this._config.rabbitmq.queue,
                }
            });

            this.channel.ack(message);
            this._stats.dlqRouted++;
            this._logger.info("📦📦📦 Message routed to DLQ successfully. !!!", {
                dlqName,
                reason,
                messageId: message.properties.messageId || "unknown",
            });
        } catch(error) {
            this._logger.error("❌❌❌ Failed to route message to DLQ :", error);
            this.channel.nack(message, false, true); // requeue the message
        }
    }

    async _retryMessage(message, retryCount) {
        const delay = this._retryStrategy.delay(retryCount)

        const retryHeaders = {
            ...message.properties.headers,
            'x-retry-count': retryCount + 1,
            'x-retry-timestamp': Date.now(),
            'x-retry-delay': delay,
            'x-original-queue': this._config.rabbitmq.queue,
        };

        setTimeout(() => {
            try {
                this.channel.sendToQueue(this._config.rabbitmq.queue, message.content, { 
                    ...message.properties, 
                    headers: retryHeaders 
                });
                this._logger.info('✍🏻✍🏻✍🏻 Message sent into DLQ scheduled for retry !!!', {
                    messageId: message.properties.messageId,
                    retryCount: retryCount + 1,
                    delay,
                });
            } catch (error) {
                this._logger.error('💔💔💔 Failed to schedule retry:', error);
                this._sendToDLQ(message, error, 'RETRY_FAILED');
            }
        }, delay);

        this.channel.ack(message);
        this._stats.retried++;
    };

    async stop() {
        try {
            await this._cleanUp();

            await Promise.all(
                [
                    this._rabbitmq.close(),
                    this._mongodb.disconnect(),
                    this._mysql.closePool(),
                ]
            );
        } catch (error) {
            this._logger.error('💔💔💔 Error stopping consumer:', error);
        }
    };
}

const retryStrategy = new RetryStrategy({
    maxRetries: config.rabbitmq.retryAttempts,
    baseDelayMs: config.rabbitmq.retryDelay,
    maxDelayMs: 30_000,
    jitterFactor: 0.3,
});

const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    cooldownMs: 30_000,
    halfOpenMaxAttempts: 3,
    logger,
});

const consumer = new EventConsumer({
    processorService: processorContainer.services.processorService,
    rabbitmq,
    mongodb,
    mysql,
    config,
    logger,
    retryStrategy,
    circuitBreaker,
});

(async function startConsumerWithRetry() {
    const startupRetry = new RetryStrategy({ 
        maxRetries: 5, 
        baseDelayMs: 5000, 
        maxDelayMs: 30_000 
    });  // we can also use the same retryStrategy instance but for clarity, we are creating a new one for startup.

    let attempt = 0;

    while (startupRetry.shouldRetry(attempt) || attempt === 0) {
        try {
            logger.info(`✅✅✅ Starting consumer (attempt ${attempt + 1})`);
            await consumer.start();
            logger.info('🎉🎉🎉 Consumer started successfully !!!');
            return;
        } catch (error) {
            attempt++;
            logger.error(`😥😥😥 Consumer start attempt ${attempt} failed:`, error);

            if (!startupRetry.shouldRetry(attempt)) {
                logger.error('💔💔💔 Max retries reached, exiting...');
                process.exit(1);
            }

            await startupRetry.wait(attempt - 1);
        }
    }
})(); // execute the function immediately after decalring it..

process.on('SIGINT', async () => {
    logger.info('✅✅✅ Received SIGINT, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('✅✅✅ Received SIGTERM, shutting down gracefully...');
    await consumer.stop();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('🤦🏻🤦🏻🤦🏻 Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('🤦🏻🤦🏻🤦🏻 Unhandled promise rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export default consumer;