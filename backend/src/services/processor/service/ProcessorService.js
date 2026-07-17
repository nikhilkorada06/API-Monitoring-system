import logger from '../../../shared/config/logger.js';

export class ProcessorService {
    constructor({ apiHitRepository, metricsRepository }) {
        if (!apiHitRepository || !metricsRepository) throw new Error('ProcessorService requires apiHitRepository and metricsRepository');
        this.apiHitRepository = apiHitRepository;
        this.metricsRepository = metricsRepository;
    };

    /**
     * round timestamp to nearest hour if interval is 'hour'
     * round timestamp to nearest day if interval is 'day'
     * round timestamp to nearest minute if interval is 'minute'
     * default is 'hour'
     * @param {Date} timestamp
     * @param {string} interval
     * @returns {Date}
     */
    getTimeBucket(timestamp, interval = 'hour') {
        const date = new Date(timestamp);

        switch (interval) {
            case 'hour':
                date.setMinutes(0, 0, 0);
                break;
            case 'day':
                date.setHours(0, 0, 0, 0);
                break;
            case 'minute':
                date.setSeconds(0, 0);
                break;
            default:
                date.setMinutes(0, 0, 0);
        }

        return date;
    };

    async processEvent(eventData) {

        let rawEventSaved = false;

        // logger.info("D - Entered processEvent");

        try {
            logger.info(' ✍🏻✍🏻✍🏻 Processing event data : ', {
                eventId: eventData.eventId,
                clientId: eventData.clientId,
                serviceName: eventData.serviceName,
                endpoint: eventData.endpoint,
                method: eventData.method,
            });

            // save data to MongoDB --> If this fails then we should fail complete operation
            await this.apiHitRepository.save(eventData);
            rawEventSaved = true;

            // logger.info("E - Mongo save complete");

            logger.info(' 🎉🎉🎉 Event data saved to MongoDB : ', {
                eventId: eventData.eventId,
            });

            // upsert metrics data to MySQL --> If this fails then we shouldn't fail complete operation.
            await this._updateMetricsWithFallback(eventData);

            // logger.info("F - Metrics updated");

            logger.info(' 🎉🎉🎉 Metrics data upserted to MySQL : ', {
                eventId: eventData.eventId,
            });
        } catch(error) {
            if(!rawEventSaved) {
                logger.error(' 💔💔💔 Failed to save raw event data to MongoDB. Event processing failed. ', {
                    eventId: eventData.eventId,
                    error: error.message,
                });
                throw new Error('Failed to save raw event data to MongoDB. Event processing failed.');
            }
            logger.error(' 💔💔💔 Failed to upsert metrics data to MySQL. Event processing completed but metrics update failed. ', {
                eventId: eventData.eventId,
                error: error.message,
            });
        }
    }

    async _updateMetricsWithFallback(eventData) {
        try {            
            // calculate time bucket based on event timestamp
            const timeBucket = this.getTimeBucket(eventData.timestamp, 'hour');

            // console.log("EVENT DATA =", eventData);
            // console.log("latencyMs =", eventData.latencyMs);

            const metricsData = {
                clientId: eventData.clientId.toString(),
                serviceName: eventData.serviceName,
                endpoint: eventData.endpoint,
                method: eventData.method,
                totalHits: 1,
                errorHits: eventData.statusCode >= 400 ? 1 : 0,
                avgLatency: eventData.latencyMs,
                minLatency: eventData.latencyMs,
                maxLatency: eventData.latencyMs,
                timeBucket,
            };

            await this.metricsRepository.upsertEndpointMetrics(metricsData);

            logger.info(' 🎉🎉🎉 Metrics data upserted to MySQL : ', {
                eventId: eventData.eventId,
            });
        } catch(error) {
            logger.error(' 💔💔💔 Failed to upsert metrics data to MySQL. ', {
                eventId: eventData.eventId,
                error: error.message,
            });
            throw error;
        }
    }

    async cleanUpOldEvents(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const deletedCount = await this.apiHitRepository.deleteOldHits(cutoffDate);
            logger.info(` 🗑️🗑️🗑️ Deleted ${deletedCount} old events from MongoDB older than ${cutoffDate.toISOString()}`);

            return deletedCount;
        } catch(error) {
            logger.error(' 💔💔💔 Failed to delete old events from MongoDB. ', {
                error: error.message,
            });
            throw error;
        }
    }
}