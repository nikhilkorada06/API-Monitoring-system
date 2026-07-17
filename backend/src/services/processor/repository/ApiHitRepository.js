import { BaseRepository } from './BaseRepository.js';

export class ApiHitRepository extends BaseRepository {
    constructor({ model, logger: log = console } = {}) {
        super({ logger: log });
        if(!model) {
            throw new Error("💔💔💔 ApiHitRepository requires a model instance to be provided !!!");
        }
        this.model = model;
    }

    async save(eventData) {
        try {
            const doc = new this.model(eventData);
            await doc.save();

            this.logger.info("🎉🎉🎉 API hit saved to MongoDB : ", {
                eventId: eventData.eventId,
            });

            return doc;
        } catch (error) {

            if(error && error?.code === 11000) {
                this.logger.warn("⚠️⚠️⚠️ Duplicate API hit detected. Skipping save operation. !!!", {
                    eventId: eventData.eventId,
                });
                return null; // Return null or handle as needed for duplicates
            }
            this.logger.error("💔💔💔 Error saving API hit : ", error);
            throw error;
        }
    }

    async find(filer = {}, options = {}) {
        try {
            const { 
                limit = 100, 
                skip = 0, 
                sort = { 
                    timestamp: -1 
                } 
            } = options;
            const hits = await this.model
                                        .find(filer)
                                        .sort(sort)
                                        .limit(limit)
                                        .skip(skip)
                                        .lean();      // Use lean() for better performance if you don't need Mongoose documents if will neglect complete documeent and return only plain JavaScript objects.

            return hits;
        } catch (error) {
            this.logger.error('💔💔💔 Error finding API hits:', error);
            throw error;
        }
    };

    async count(filters = {}) {
        try {
            const count = await this.model.countDocuments(filters);
            return count;
        } catch (error) {
            this.logger.error('Error counting API hits:', error);
            throw error;
        }
    }

    async deleteOldHits(beforeDate) {
        try {
            const result = await this.model.deleteMany({ 
                    timestamp: { 
                        $lt: beforeDate 
                    } 
                });
                
            this.logger.info('Deleted old API hits', { 
                    count: result.deletedCount 
                }
            );
            return result.deletedCount;
        } catch (error) {
            this.logger.error('Error deleting old API hits:', error);
            throw error;
        }
    }
}