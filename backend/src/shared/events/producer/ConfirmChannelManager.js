import { EventEmitter } from 'node:events';

/**
 * Manages a single RabbitMQ confirm channel, ensuring it is recreated if it closes or encounters an error.
 * Provides a getChannel() method that returns a promise which resolves to a ready-to-use confirm channel.
 * If the channel is currently being established, additional calls to getChannel() will wait for the same channel to be ready.
 * Emits 'drain' event when the channel's write buffer is drained, and 'error' event if the channel encounters an error.
 */
export class ConfirmChannelManager extends EventEmitter {
    /**
     * - Constructs an instance of the ConfirmChannelManager class, which manages a RabbitMQ confirm channel.
     * - @param {Object} options - Configuration options for the ConfirmChannelManager.
     * - @param {RabbitMQConnection} options.rabbitMQConnection - An instance of RabbitMQConnection that manages the connection to RabbitMQ.
     * - @param {logger} options.logger - An optional logger instance for logging information and errors.
     * - @throws Will throw an error if the rabbitMQConnection is not provided.
     */
    constructor({rabbitMQConnection, logger}) {
        super();

        if(!rabbitMQConnection) {
            throw new Error('💔💔💔 rabbitMQConnection is required for ConfirmChannelManager !!!');
        }

        this._rabbitMQConnection = rabbitMQConnection;
        this._logger = logger ?? console;
        this._channel = null;
        this._connecting = false;
        this._connectionWaiters = [];
    }

    /**
     * Returns a promise that resolves to a RabbitMQ confirm channel. If the channel is already established, it returns it immediately. 
     * If the channel is in the process of being established, it waits for that process to complete and then returns the channel. 
     * If no channel exists and one is not currently being established, it initiates the creation of a new confirm channel.
     * @returns {Promise<any>} A promise that resolves to a RabbitMQ confirm channel.
     * @throws Will throw an error if the channel cannot be established after retrying.
     */
    async getChannel() {
        if (this._channel) {
            return this._channel;
        }

        if (this._connecting) {
            return new Promise((resolve, reject) => {
                this._connectionWaiters.push({ resolve, reject });
            });
        }

        return await this._connect();
    }

    /**
     * Establishes a new RabbitMQ confirm channel. If a channel is already being established, it waits for that process to complete. 
     * If the channel is successfully established, it resolves any pending promises waiting for the channel. If an error occurs during channel creation, it rejects any pending promises and throws the error.
     * @returns {Promise<any>} A promise that resolves to a RabbitMQ confirm channel.
     * @throws Will throw an error if the channel cannot be established.
     */
    async _connect() {
        this._connecting = true;

        try {
            let connection;

            if(this._rabbitMQConnection.connection) {
                connection = this._rabbitMQConnection.connection;
            } else {
                const baseChannel = await this._rabbitMQConnection.connect();

                if(!baseChannel?.connection) {
                    throw new Error('💔💔💔 RabbitMQ connection is not established !!!');
                } 

                connection = baseChannel.connection;
            }

            const confirmChannel = await connection.createConfirmChannel();
            
            confirmChannel.on('drain', () => {
                this.emit('drain');
            });

            confirmChannel.on('close', () => {
                this._logger.warn('💔💔💔 [Channel Manager] confirm channel closed unexpectedly !!!');
                this._channel = null;
            });

            confirmChannel.on('error', (error) => {
                this._logger.warn('💔💔💔 [Channel Manager] confirm channel error !!!', {
                    error: error.message,
                    stack: error.stack,
                    code: error.code,
                });
                this._channel = null;
                this.emit('error', error);
            });

            this._channel = confirmChannel;
            this._logger.info('💖💖💖 [Channel Manager] confirm channel established successfully !!!');

            // give this confirm channel to all waiters by resolving their promises.
            for(const waiter of this._connectionWaiters) {
                waiter.resolve(confirmChannel);
            }
            this._connectionWaiters = [];

            return confirmChannel;
        } catch (error) {
            for(const waiter of this._connectionWaiters) {
                waiter.reject(error);
            }
            this._connectionWaiters = [];
            throw error;
        } finally {
            this._connecting = false;
        }
    }
}