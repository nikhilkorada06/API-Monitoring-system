import ResponseFormatter from "../utils/responseFormatter.js"

const authorize = (allowedRoles = []) => (req, res, next) => {

    try {
        if(!req.user || !req.user.role) {
            return res.status(403).json(
                ResponseFormatter.error(
                    "💔💔💔 NO ROLE ASSIGNED !!! Authorization Incomplete !!!",
                    403,
                )
            );
        }

        if(allowedRoles.length === 0) {
            next();
        }

        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json(
                ResponseFormatter.error(
                    "💔💔💔ROLE ASSIGNED IS INVALID !!! Authorization Incomplete !!!",
                    403,
                )
            );
        }

        next();
    } catch (error) {
        return res.status(403).json(
                ResponseFormatter.error(
                    "💔💔💔Forbidden from AUTHORIZATION !!!",
                    403,
                )
        );
    }
}

export default authorize;