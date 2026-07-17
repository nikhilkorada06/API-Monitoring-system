import amqp from "amqplib";
import config from "./index.js";
import logger from "./logger.js";

class RabbitMQConnection {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
    }

    async connect(){
        if(this.channel){
            return this.channel;
        }

        if(this.isConnecting) {
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if(!this.isConnecting){
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100)
            })
            return this.channel;
        }

        try {
            this.isConnecting = true;
            logger.info("⏰⏰⏰ Connecting to RabbitMQ : ", {url: config.rabbitmq.url});
            this.connection = await amqp.connect(config.rabbitmq.url);
            this.channel = await this.connection.createChannel();

            //Creating Key or Queue Name
            const dlqName = `${config.rabbitmq.queue}.dlq` //api_hits.dlq

            // DL Queue 
            await this.channel.assertQueue(dlqName, {
                durable: true,
            })

            //Normal Queue  // sends the error msgs of this queue to DLQ through default exchange(direct exchange) given by RabbitMQ
            await this.channel.assertQueue(config.rabbitmq.queue, {
                durable: true,  // secure data when the broker restarts
                arguments: {
                    "x-dead-letter-exchange": "", //direct exchange (by default)
                    "x-dead-letter-routing-key": dlqName, //dlq
                }
            })  //this normal queue can send the unprocessed messages to DLQ
            
            logger.info("🎉🎉🎉 RabbitMQ Connected, queue :", {url: config.rabbitmq.url});

            this.connection.on("close", () => {
                logger.warn("🙃🙃🙃 RabbitMQ Connection Closed !!!");
                this.connection = null;
                this.channel = null;
            })

            this.connection.on("error", err => {
                logger.warn("😔😔😔 RabbitMQ connection Error ", {error: err});
                this.connection = null;
                this.channel = null;
            })

            this.isConnecting = false;

            return this.channel;
        } catch (error) {
            this.isConnecting = false;
            logger.error("😔😔😔 Failed Connecting RabbitMQ !", {error: error});
            throw error;
        }
    }

    getChannel() {
        return this.channel;
    }

    getStatus() {
        if(!this.connection || !this.channel) return "Disconnected";
        if(this.connection.closing || this.connection.disconnected) return "Closing";
        return "Connected";
    }

    async close() {
        try {
            if(this.channel){
                await this.channel.close();
                this.channel = null;
            } 
            if(this.connection){
                await this.connection.close();
                this.connection = null;
            }
        } catch (error) {
            logger.error("😔😔😔 Error in Closing RabbitMQ connection ", {error: error});
        }
    }
}

export default new RabbitMQConnection();