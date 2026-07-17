import BaseClientRepository from "./BaseClientRepository.js";
import ClientSchema from "../../../shared/models/Client.js";
import logger from "../../../shared/config/logger.js";

class MongoClientRepository extends BaseClientRepository {
    constructor() {
        super(ClientSchema);
    }

    /**
     * Creates a new client in the database.
     * @param {Object} clientData 
     * @returns {Promise<Object>} created client object
     */
    async create(clientData) {
        try {
            const client = new this.model(clientData);
            await client.save();

            await client.populate({ 
                path: 'createdBy', 
                select: '-password' 
            });

            logger.info("🎉🎉🎉 Client created in MongoDB Successfully", {
                clientId: client._id,
                slug: client.slug,
            });

            return client;
        } catch (error) {
            logger.error("😔😔😔 Error creating client in MongoDB", error);
            throw error;
        }
    }

    /**
     * Finds a client by their ID in the database.
     * @param {string} clientId 
     * @returns {Promise<Object>} found client object
     */
    async findById(clientId) {
        try {
            const foundClient = await this.model.findById(clientId);
            if (!foundClient) {
                throw new Error(`💔💔💔 Client with ID ${clientId} not found !!!`);
            }
            logger.info("🔎🔎🔎 Client details fetched from MongoDB !!!", {
                clientId: foundClient._id,
                slug: foundClient.slug,
            });
            return foundClient;
        } catch (error) {
            logger.error("😔😔😔 Error finding client in MongoDB by ID !!!", error);
            throw error;
        }
    }

    /**
     * Find a client by slug
     * @param {string} slug - The slug of the client
     * @returns {Promise<Object|null>} - The client object or null if not found
     */
    async findBySlug(slug) {
        try {
            const client = await this.model.findOne({ slug });
            return client;
        } catch (error) {
            logger.error('Error finding client by slug:', error);
            throw error;
        }
    }

    /**
     * Find clients with filters and pagination
     * @param {Object} filters - Query filters
     * @param {Object} options - Query options (limit, skip, sort)
     * @returns {Promise<Object>}
     */
    async find(filters = {}, options = {}) {
        try {
            const { 
                limit = 50, 
                skip = 0, 
                sort = { 
                    createdAt: -1 
                } 
            } = options;

            const clients = await this.model.find(filters)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select('-__v');

            return clients;
        } catch (error) {
            logger.error('Error finding clients:', error);
            throw error;
        }
    }

    /**
     * Count clients matching filters
     * @param {Object} filters - Query filters
     * @returns {Promise<number>}
     */
    async count(filters = {}) {
        try {
            const count = await this.model.countDocuments(filters);
            return count;
        } catch (error) {
            logger.error('Error counting clients:', error);
            throw error;
        }
    }
}

export default new MongoClientRepository();