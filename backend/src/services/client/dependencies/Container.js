import MongoClientRepository from '../repository/ClientRepository.js';
import MongoApiKeyRepository from '../repository/ApiKeyRepository.js';
import MongoUserRepository from '../../auth/repository/UserRepository.js';
import clientService from '../services/clientService.js';
import ApiKeyService from '../../auth/service/authService.js';
import AuthDependencies from '../../auth/Dependencies/Container.js';
import ClientController from '../controller/clientController.js';

class Container {
    static init() {
        const repositories = {
            clientRepository: MongoClientRepository, // Initialize with your client repository implementation
            apiKeyRepository: MongoApiKeyRepository, // Initialize with your API key repository implementation
            userRepository: MongoUserRepository, // Initialize with your user repository implementation
        }

        const services = {
            clientService: new clientService({
                clientRepository: repositories.clientRepository,
                apiKeyRepository: repositories.apiKeyRepository,
                userRepository: repositories.userRepository,
            }), // Initialize with your client service implementation
        }

        const controller = {
            clientController: new ClientController(services.clientService, AuthDependencies.services.authService), // Initialize with your client controller implementation
        }

        return {
            repositories,
            services,
            controller,
        }
    }
}

const initializedContainer = Container.init();
export {Container};
export default initializedContainer;