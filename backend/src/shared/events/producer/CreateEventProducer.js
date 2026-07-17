import logger from '../../config/logger.js';
import rabbitmq from '../../config/rabbitmq.js';
import config from '../../config/index.js';

import { ConfirmChannelManager } from './ConfirmChannelManager.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { RetryStrategy } from './RetryStrategy.js';
import { EventProducer } from './EventProducer.js';

export function CreateEventProducer(overrides = {}) {
    const log = overrides.logger ?? logger;
    const rmq = overrides.rabbitmq ?? rabbitmq;
    const queueName = overrides.queueName ?? config.rabbitmq.queue;

    // validate critical dependencies
    if (!rmq) {
        throw new Error('[CreateEventProducer] Invalid RabbitMQ instance provided.');
    }
    if (!queueName) {
        throw new Error('[CreateEventProducer] Invalid queue name provided.');
    }
    if(!config.rabbitmq.retryAttempts || config.rabbitmq.retryAttempts < 0) {
        throw new Error('[CreateEventProducer] Invalid retryAttempts configuration provided.');
    }

    const ConfirmChannelManagerInstance = overrides.channelManager ?? new ConfirmChannelManager({ rabbitMQConnection: rmq, logger: log });

    const circuitBreakerInstance = overrides.circuitBreaker ?? new CircuitBreaker({
        failureThreshold: config.rabbitmq.circuitBreakerFailureThreshold,
        coolDownMs: config.rabbitmq.circuitBreakerCooldownMs,
        halfOpenMaxAttempts: config.rabbitmq.circuitBreakerHalfOpenMaxAttempts,
        logger: log,
    });

    const retryStrategyInstance = overrides.retryStrategy ?? new RetryStrategy({
        maxRetries: config.rabbitmq.retryStrategyMaxRetryAttempts,
        baseDelayMs: config.rabbitmq.retryStrategyBaseRetryDelay,
        maxDelayMs: config.rabbitmq.retryStrategyMaxRetryDelay,
        jitterFactor: config.rabbitmq.retryStrategyJitterFactor,
    });

    return new EventProducer({
        channelManager: ConfirmChannelManagerInstance,
        circuitBreaker: circuitBreakerInstance,
        retryStrategy: retryStrategyInstance,
        logger: log,
        queueName: queueName,
    })
}