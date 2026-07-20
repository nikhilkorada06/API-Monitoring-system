import ResponseFormatter from '../../../shared/utils/responseFormatter.js';
import logger from '../../../shared/config/logger.js';

export default class ClientController {
    constructor(clientService, authService) {
        if (!clientService) {
            throw new Error('💔💔💔 clientService is required for ClientController !!!');
        }
        if (!authService) {
            throw new Error('💔💔💔 authService is required for ClientController !!!');
        }
        this.clientService = clientService;
        this.authService = authService;
    }

    /**
     * - Creates a new client
     * @param {Request} req 
     * @param {Response} res 
     * @param {next} next 
     * @returns {Response} JSON response with the created client and status code 201
     */
    async MiddlewareToCreateClient(req, res, next) {
        try {
            const isSuperAdmin = await this.authService.checkIfUserIsSuperAdmin(req.user.userId);
            if(!isSuperAdmin) {
                return res.status(403).json(ResponseFormatter.error(
                    '💔💔💔 Only Super Admin can create a client !!!', 
                    403
                ));
            }

            const client = await this.clientService.createClient(req.body, req.user);

            return res.status(201).json(ResponseFormatter.success(
                client, 
                "🍹🍹🍹Client Created Successfully !!!", 
                201
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * - Creates a new user for a specific client
     * @param {Request} req 
     * @param {Response} res 
     * @param {next} next 
     * @returns {Response} JSON response with the created client user with status code 201
     */
    async MiddlewareToCreateClientUser(req, res, next) {
        try {
            const { clientId } = req.params;
            const newClientUser = await this.clientService.createClientUser(clientId, req.body, req.user);

            return res.status(201).json(ResponseFormatter.success(
                newClientUser, 
                "🍹🍹🍹Client User Created Successfully !!!", 
                201
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * - Creates an API key for a specific client
     * @param {Request} req 
     * @param {Response} res 
     * @param {next} next 
     * @returns {Response} JSON response with the created API key and status code 201
     */
    async MiddlewareToCreateApiKey(req, res, next) {
        try {
            const { clientId } = req.params;
            const newApiKey = await this.clientService.createApiKey(clientId, req.body, req.user);

            if(!newApiKey) {
                return res.status(400).json(ResponseFormatter.error(
                    '💔💔💔 API Key could not be created for the client !!!', 
                    400
                ));
            }

            logger.info("🔑🔑🔑 API Key created for Client Successfully", {
                apiKeyId: newApiKey._id,
                clientId: clientId,
            });

            return res.status(201).json(ResponseFormatter.success(
                newApiKey, 
                "🍹🍹🍹API Key Created Successfully for Client !!!", 
                201
            ));
        } catch(error) {
            next(error);
        }
    }

    /**
     * - Fetches all API keys for a specific client.
     * @param {Request} req 
     * @param {Response} res 
     * @param {next} next 
     * @returns {Response} JSON response with all API keys of the client and status code 200
     */
    async MiddlewareToGetAllApiKeysOfClient(req, res, next) {
        try {
            const { clientId } = req.params;
            const apiKeys = await this.clientService.getAllApiKeysOfClient(clientId, req.user);

            return res.status(200).json(ResponseFormatter.success(
                apiKeys, 
                "🍹🍹🍹 All API Keys of the client fetched successfully !!!", 
                200
            ));
        } catch(error) {
            next(error);
        }
    }

    async MiddlewareToGetAllClients(req, res, next) {
        try {
            const isSuperAdmin = await this.authService.checkIfUserIsSuperAdmin(req.user.userId);
            if(!isSuperAdmin) {
                return res.status(403).json(ResponseFormatter.error(
                    '💔💔💔 Only Super Admin can fetch all clients !!!', 
                    403
                ));
            }

            const listOfAllClients = await this.clientService.getAllClients(req.user, req.query.skip);

            return res.status(200).json(ResponseFormatter.success(
                listOfAllClients, 
                "🍹🍹🍹 All Clients fetched successfully !!!", 
                200
            ));
        } catch(error) {
            next(error);
        }
    }
}