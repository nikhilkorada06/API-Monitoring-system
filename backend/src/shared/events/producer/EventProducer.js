import { EVENT_TYPES } from '../EventContracts.js';
import { isErrorRetryable } from './RetryStrategy.js';

export class EventProducer {

    /**
     * - Constructs an instance of the EventProducer class, which is responsible for publishing events to a RabbitMQ queue with retry and circuit breaker mechanisms.
     * - @param {Object} options - Configuration options for the EventProducer.
     * @param {ConfirmChannelManager} options.channelManager - An instance of ConfirmChannelManager that manages the RabbitMQ confirm channel.
     * @param {CircuitBreaker} options.circuitBreaker - An instance of CircuitBreaker that manages the circuit breaker state for publishing events.
     * @param {RetryStrategy} options.retryStrategy - An instance of RetryStrategy that defines the retry logic for publishing events.
     * @param {Object} options.logger - An optional logger instance for logging information and errors.
     * @param {string} options.queueName - The name of the RabbitMQ queue to which events will be published.
     * @throws Will throw an error if any of the required parameters are not provided.
     */
    constructor({ channelManager, circuitBreaker, retryStrategy, logger, queueName }) {

        if(!channelManager) {
            throw new Error('💔💔💔 channelManager is required for EventProducer !!!');
        }
        if(!circuitBreaker) {
            throw new Error('💔💔💔 circuitBreaker is required for EventProducer !!!');
        }
        if(!retryStrategy) {
            throw new Error('💔💔💔 retryStrategy is required for EventProducer !!!');
        }
        if(!queueName) {
            throw new Error('💔💔💔 queueName is required for EventProducer !!!');
        }

        // variables started with '_' are private to this class.
        this._channelManager = channelManager;
        this._circuitBreaker = circuitBreaker;
        this._retryStrategy = retryStrategy;
        this._logger = logger ?? console;
        this._queueName = queueName;

        this._metrics = {
            published: 0,
            failed: 0,
            retriesExhausted: 0,
        };

        this._shuttingDown = false;
    }

    _incrementMetric(metricName) {
        this._metrics[metricName] = (this._metrics[metricName] || 0) + 1;
    }

    /**
     * - _publish method publishes a message to the RabbitMQ queue with the provided event data, correlation ID, and attempt count. 
     * - It handles backpressure by listening for the 'drain' event on the channel and logs relevant information about the publishing process.
     * @param {Object} eventData 
     * @param {string} correlationId - The unique identifier for every message published from that request. 
     * @param {number} attempt - The number of times the message has been attempted to be published.
     * @returns {Promise<void>}
     */
    async _publish(eventData, {correlationId, attempt}) {
        
        const channel = await this._channelManager.getChannel();

        const message = {
            type: EVENT_TYPES.API_HIT,
            data: eventData,
            publishedAt: new Date().toISOString(),
            attempt: attempt + 1,
        }

        console.log("EVENT_TYPES.API_HIT =", EVENT_TYPES.API_HIT);
        console.log("MESSAGE =", message);

        const buffer = Buffer.from(JSON.stringify(message));

        const publishOptions = {
            persistent: true, // Make the message persistent to ensure it survives broker restart
            contentType: 'application/json', // Set the content type to JSON
            messageId: eventData.eventId,
            correlationId,
            timestamp: Math.floor(Date.now() / 1000), // Set the timestamp to the current time in seconds
        }

        return new Promise((resolve, reject) => {

            console.log("😥😥😥 Publishing latency:", eventData.latencyMs);

            const written = channel.publish(
                '',                 // Default exchange
                this._queueName,    // Routing key (queue name)
                buffer,
                publishOptions,
                (err) => {
                    if(err) {
                        return reject(new Error(`Failed to publish message to queue ${this._queueName}: ${err.message}`));
                    }
                    resolve();
                }
            );

            if(!written) {
                this._logger.info(`[EventProducer] Backpressure detected while publishing message to queue ${this._queueName}. Waiting for drain event...`, {
                    eventId: eventData.eventId,
                });
            }

            const onDrain = () => {
                channel.removeListener('drain', onDrain);
                this._logger.info(`[EventProducer] Drain event received. !!!`, {
                    eventId: eventData.eventId,
                });
            }

            channel.once("drain", onDrain);
        })
    }

    /**
     * - shutdown method gracefully shuts down the EventProducer instance by closing the channel manager and releasing any resources. 
     * - It also sets a flag to prevent new messages from being published during the shutdown process.
     * - @returns {Promise<void>} A promise that resolves when the shutdown process is complete.
     */
    async shutdown() {
        this._shuttingDown = true;
        this._logger.info('⏰⏰⏰ [EventProducer] Shutdown initiated. No new messages will be published. !!!');
        await this._channelManager.close();
        this._logger.info('⏰⏰⏰ [EventProducer] Shutdown completed. All resources have been released. !!!');
    }

    /**
     * - getStats method returns the current metrics and circuit breaker state of the EventProducer instance.
     * - @returns {Object} An object containing the current metrics and circuit breaker state.
     */
    getStats() {
        return {
            metrics: { 
                ...this._metrics 
            },
            circuitBreaker: this._circuitBreaker.snapshot(),
        }
    }

    /**
     * - publishApiHit method publishes an API hit event to the message queue.
     * @param {Object} eventData 
     * @param {Object} opts 
     * @returns {Promise<boolean>} - Returns true if the message was published successfully, false if the circuit breaker is open and the message was not published.
     * @throws {Error} - Throws an error if the EventProducer is shutting down and cannot publish new messages.
     */
    async publishApiHit(eventData, opts = {}) {
        if(this._shuttingDown) {
            const error = new Error('[EventProducer] is shutting down. Cannot publish new messages.');
            error.code = 'SHUTDOWN_IN_PROGRESS';
            this._logger.info('[EventProducer] publish Rejected --> EventProducer is shutting down. !!!', {
                eventId: eventData.eventId,
                error: error.message,
            });
            throw error;
        }

        if(!this._circuitBreaker.allowRequest()) {
            this._logger.info('[EventProducer] publish Rejected --> Circuit breaker is OPEN. !!!', {
                eventId: eventData.eventId,
                state: this._circuitBreaker.state,
            });
            return false;
        }

        const correlationId = opts.correlationId ?? eventData.eventId;
        const startMs = Date.now();
        let attempt = 0;

        while(true) {
            try {
                await this._publish(eventData, {correlationId, attempt});
                const latencyMs = Date.now() - startMs;

                this._circuitBreaker.onSuccess();
                this._incrementMetric('published');

                this._logger.info('[EventProducer] publish Success !!!', {
                    eventId: eventData.eventId,
                    correlationId,
                    attempt: attempt + 1,
                    latencyMs,
                    endpoint: eventData.endpoint,
                });

                return true;
            } catch(error) {
                this._logger.error('[EventProducer] publish attempt Failed !!!', {
                    eventId: eventData.eventId,
                    correlationId,
                    attempt: attempt + 1,
                    error: error.message,
                });

                const canRetry = isErrorRetryable(error) && this._retryStrategy.shouldRetry(attempt);

                if (!canRetry) {
                    this._circuitBreaker.onFailure();
                    this._incrementMetric('failed');
                    if(!this._retryStrategy.shouldRetry(attempt)) {
                        this._incrementMetric('retriesExhausted');
                    }
                    throw error;
                };

                await this._retryStrategy.wait(attempt);
                attempt++;
            }
        }
    } 
}