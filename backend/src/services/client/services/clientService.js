import AppError from '../../../shared/utils/AppError.js';
import logger from '../../../shared/config/logger.js';
import { APPLICATION_ROLES, isValidClientRole } from '../../../shared/constants/roles.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export default class clientService {
    constructor(dependencies) {
        if(!dependencies) {
            throw new Error('💔💔💔 Dependencies are required for clientService !!!');
        }
        if(!dependencies.clientRepository) {
            throw new Error('💔💔💔 clientRepository is required for clientService !!!');
        }
        if(!dependencies.apiKeyRepository) {
            throw new Error('💔💔💔 apiKeyRepository is required for clientService !!!');
        }
        if(!dependencies.userRepository) {
            throw new Error('💔💔💔 userRepository is required for clientService !!!');
        }
        this.clientRepository = dependencies.clientRepository;
        this.apiKeyRepository = dependencies.apiKeyRepository;
        this.userRepository = dependencies.userRepository;
    }

    formatClientResponse(client) {
        const clientObj = client.toObject ? client.toObject() : client;
        delete clientObj.password;
        return clientObj;
    }

    /**
     * 
     * @param {String} name 
     * @returns {String} slug
     * Removes special characters and replaces spaces with hyphens to generate a slug from the client name.
     * Example: "My Client Name" -> "my-client-name"
     * Example: "Client@Name!" -> "clientname"
     */
    generateSlug(name) {
        // removes special characters and replaces spaces with hyphens
        return name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim(); 
    }

    async createClient(clientData, adminUser) {
        try {
            const { name, email, description, website } = clientData;
            const slug = this.generateSlug(name);

            const existingClient = await this.clientRepository.findBySlug(slug);
            
            if(existingClient) {
                throw new AppError('💔💔💔 Client with this name already exists !!!', 400);
            }

            const client = await this.clientRepository.create({
                name,
                slug,
                email,
                description,
                website,
                createdBy: adminUser.userId,
            });

            return client;
        } catch (error) {
            logger.error("😔😔😔 Error creating client in clientService", error);
            throw new Error('💔💔💔 Error creating client in clientService !!!');
        }
    }

    /**
     * Checks if a user has access to a specific client
     * @param {Object} user - The user object
     * @param {String} clientId - The ID of the client
     * @returns {Boolean} - True if the user has access, false otherwise
     */
    canUserAccessClient(user, clientId) {
        if(user.role === APPLICATION_ROLES.SUPER_ADMIN) {
            return true;
        }
        return user.clientId && user.clientId.toString() === clientId.toString();
    }

    async createClientUser(clientId, userData, adminUser) {
        try {
            if(!clientId) {
                throw new AppError('💔💔💔 clientId is required to create a client user !!!', 400);
            }
            if(!this.canUserAccessClient(adminUser, clientId)) {
                throw new AppError('💔💔💔 You do not have permission to create a user for this client !!!', 403);
            }

            const { username, email, password, role = APPLICATION_ROLES.CLIENT_USER } = userData;

            if(!isValidClientRole(role)) {
                throw new AppError(`💔💔💔 Invalid role for client user. Allowed roles are: 
                    ${Object.
                        values(APPLICATION_ROLES).
                        filter(role => role !== APPLICATION_ROLES.SUPER_ADMIN)
                        .join(', ')} !!!`, 
                    400
                );
            }

            const existingClient = await this.clientRepository.findById(clientId);

            if(!existingClient) {
                throw new AppError('💔💔💔 Client with this ID does not exist !!!', 404);
            }

            let permissions = {
                canCreateApiKeys: false,
                canManageUsers: false,
                canViewAnalytics: true,
                canExportData: false,
            };

            if(role === APPLICATION_ROLES.CLIENT_ADMIN) {
                permissions = {
                    canCreateApiKeys: true,
                    canManageUsers: true,
                    canViewAnalytics: true,
                    canExportData: true,
                }
            }

            const newClientUser = await this.userRepository.create({
                username,
                email,
                password,
                role,
                clientId,
                permissions,
            });

            logger.info("🎉🎉🎉 Client user created in MongoDB Successfully", {
                clientId: newClientUser.clientId,
                userId: newClientUser._id,
                role: newClientUser.role,
            });

            return newClientUser;
        } catch(error) {
            logger.error("😔😔😔 Error creating client user in clientService", error);
            throw new Error('💔💔💔 Error creating client user in clientService !!!');
        }
    }

    /**
     * Generate a new API key
     * @returns {String} - The generated API key
     */
    generateApiKey() {
        const prefix = "apim";
        const randomBytes = crypto.randomBytes(20).toString("hex");
        return `${prefix}_${randomBytes}`
    }
    
    /**
     * Create a new API key for a specific client
     * @param {String} clientId - The client ID
     * @param {Object} keyData - The API key data
     * @param {Object} user - The user creating the API key
     * @returns {Object} - The created API key
     */
    async createApiKey(clientId, apiKeyData, adminUser) {
        try {
            if(!clientId) {
                throw new AppError('💔💔💔 A valid clientId is required to create an API key !!!', 400);
            }

            const existingClient = await this.clientRepository.findById(clientId);
            
            if(!existingClient) {
                throw new AppError('💔💔💔 Client with this ID does not exist, API key cannot be created for this Client !!!', 404);
            }

            if(!this.canUserAccessClient(adminUser, clientId)) {
                throw new AppError('💔💔💔 You do not have permission to create an API key for this client !!!', 403);
            }

            if(!(adminUser.role === APPLICATION_ROLES.SUPER_ADMIN || adminUser.role === APPLICATION_ROLES.CLIENT_ADMIN)) {
                throw new AppError('💔💔💔 Access Denied - Only Super Admin or Client Admin can create an API key for a client !!!', 403);
            }

            const { name, description, environment = 'production' } = apiKeyData;

            const apiKeyId = uuidv4(); // Generate a unique API key using UUID
            const apiKeyValue = this.generateApiKey();
            
            const newApiKey = await this.apiKeyRepository.create({
                keyId: apiKeyId,
                keyValue: apiKeyValue,
                clientId,
                name,
                description,
                environment,
                createdBy: adminUser.userId
            });

            return newApiKey;
        } catch(error) {
            logger.error("😔😔😔 Error creating API key in clientService", error);
            throw error;
        }
    }

    async getAllApiKeysOfClient(clientId, adminUser) {
        try {
            if(!this.canUserAccessClient(adminUser, clientId)) {
                throw new AppError('💔💔💔 You do not have permission to view API keys for this client !!!', 403);
            }

            const apiKeys = await this.apiKeyRepository.findAllByClientId(clientId);
            
            const formattedResponse = apiKeys.map(key => {
                const keyObj = key.toObject ? key.toObject() : key;
                delete keyObj.keyValue;
                return keyObj
            });

            return formattedResponse;
        } catch(error) {
            logger.error("😔😔😔 Error fetching API keys of client in clientService", error);
            throw error;
        }
    }

    async getClientByApiKey(apiKey) {
        try {
            const apiKeyRecord = await this.apiKeyRepository.findByKeyValue(apiKey);
            if(!apiKeyRecord) {
                return null;
            }
            if(apiKeyRecord.isExpired()){
                return null;
            } 

            const client = apiKeyRecord.clientId;

            return {
                client,
                apiKey: apiKeyRecord,
            }
        } catch (error) {
            logger.error("😔😔😔 Error fetching client by API key in clientService", error);
            throw error;
        }

    }
}