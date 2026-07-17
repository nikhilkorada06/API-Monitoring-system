class SercurityUtils {

    /**
     * by using static we can access this var without creating an object of this class.
     * like by using static we can directly say (SercurityUtils.PASSWORD_REQUIREMENTS)
     * if we dont use static then we have to create a new object of this class to use this variable. But by using static we can directly use this variable without a new object of this class.
     */

    static PASSWORD_REQUIREMENTS = {  // if we dont use static then we have to create a new object of this class to use this variable. But by using static we can directly use this variable without a new object of this class.
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8"),
        requireUppercase: (process.env.PASSWORD_REQUIRE_UPPERCASE || "true") === "true",
        requireLowercase: (process.env.PASSWORD_REQUIRE_LOWERCASE || "true") === "true",
        requireNumbers: (process.env.PASSWORD_REQUIRE_NUMBERS || "true") === "true",
        requireSpecialChars: (process.env.PASSWORD_REQUIRE_SPECIAL_CHARS || "true") === "true",
    }

    /**
     * 
     * @param {string} password 
     * @returns {object} - Validation result with success status, errors array, and strength level.
     * @example {success: true, errors: [], strength: "Strong"}
     * @example {success: false, errors: ["Password must be at least 8 characters long.", "Password must contain at least one uppercase letter."], strength: "Weak"}
     */

    static validatePassword(password) { // By using static we can directly use this function without a new object of this class.
        const errors = [];
        const requiremetnts = this.PASSWORD_REQUIREMENTS;

        if(!password){
            return {
                success: false,
                errors: ["Password is required."]
            }
        }

        if(password.length < requiremetnts.minLength){
            errors.push(`Password must be at least ${requiremetnts.minLength} characters long.`);
        }

        if(requiremetnts.requireUppercase && !/[A-Z]/.test(password)){
            errors.push("Password must contain at least one uppercase letter.");
        }

        if(requiremetnts.requireLowercase && !/[a-z]/.test(password)){
            errors.push("Password must contain at least one lowercase letter.");
        }

        if(requiremetnts.requireNumbers && !/[0-9]/.test(password)){
            errors.push("Password must contain at least one number.");
        }

        if(requiremetnts.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)){
            errors.push("Password must contain at least one special character.");
        }

        return {
            success: errors.length === 0,
            errors,
            strength: errors.length === 0 ? "Strong" : (errors.length <= 2 ? "Medium" : "Weak")
        };
    }
};

export default SercurityUtils;