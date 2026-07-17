import jwt from "jsonwebtoken";
import ResponseFormatter from "../utils/responseFormatter.js";
import config from "../config/index.js";
import logger from "../config/logger.js";

const authenticate = async (req, res, next) => {
    try {
        let token = null;

        if(req.cookies && req.cookies.authToken){
            token = req.cookies.authToken;
        }

        if(!token){
            return res.status(401).json(
                ResponseFormatter.error(
                    "💔💔💔Auth Token is Missing !!!", 
                    401
                )
            );
        }

        const decode = jwt.verify(token, config.jwt.secret);

        const { userId, username, email, role, clientId } = decode;

        req.user = {
            userId, username, email, role, clientId,
        };

        next();
    } catch (error) {
        
        logger.error("💔💔💔Authentication Failed !!!", {
            ErrorName: error.name,
            ErrorMessage: error.message,
            ErrorPath: req.path,
        });
    }
}

export default authenticate;