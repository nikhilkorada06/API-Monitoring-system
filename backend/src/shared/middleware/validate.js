import ResponseFormatter from "../utils/responseFormatter.js";

const validate = (schema) => (req, res, next) => {
    if(!schema) {
        return next();
    }

    const errors = [];
    const body = req.body || {};

    Object.entries(schema).forEach(([field, value]) => {
        const fieldValue = body[field];

        if(value.required && !fieldValue) {
            errors.push(`${field} is required`);
            return;
        }

        if(value.minLength && fieldValue.length < value.minLength) {
            errors.push(`${field} must be at least ${value.minLength} characters long`);
            return;
        }

        if(value.custom) {
            const customError = value.custom(fieldValue);
            if(customError) {
                errors.push(customError);
                return;
            }
        }
    });

    if(errors.length > 0) {
        return res.status(400).json(
            ResponseFormatter.error(
                "Few Errors Found regarding LOGIN details. Validation Error !!!", 
                400,
                errors
            )
        );
    }

    next();
}

export default validate;