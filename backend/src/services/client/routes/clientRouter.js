import express from 'express';
import clientDependencies from '../dependencies/Container.js';
import authenticate from '../../../shared/middleware/authenticate.js';

const router = express.Router();
const { clientController } = clientDependencies.controller;

router.use(authenticate); // Apply authentication middleware to all routes

router.post('/admin/clients/onboard', (req, res, next) => {
    clientController.MiddlewareToCreateClient(req, res, next);
});

router.post('/admin/clients/:clientId/users', (req, res, next) => {
    clientController.MiddlewareToCreateClientUser(req, res, next);
});

router.post('/admin/clients/:clientId/api-key', (req, res, next) => {
    clientController.MiddlewareToCreateApiKey(req, res, next);
});

router.get('/admin/clients/:clientId/api/keys', (req, res, next) => {
    clientController.MiddlewareToGetAllApiKeysOfClient(req, res, next);
});

export default router;