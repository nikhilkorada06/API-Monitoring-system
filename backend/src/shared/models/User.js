// The Data of all users will be stored in this collection

import mongoose, {Schema} from "mongoose";
import bcrypt from "bcryptjs";
import SercurityUtils from "../utils/SercurityUtils.js";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minLength: 3,
            validate: {
                validator: function(username) {
                    return /^[a-zA-Z0-9_.-]+$/.test(username);
                },
                message: "Please enter a valid username."
            }
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: function(email) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                },
                message: "Please enter a valid email address."
            }
        },
        password: {
            type: String,
            required: true,
            minLength: 6,
            validate: {
                validator: function(password) {
                    if(this.isModified('password') && password && !password.startsWith('$2a$')){
                        const validation = SercurityUtils.validatePassword(password);
                        return validation.success;
                    }
                    return true;
                },
                message: function(props) {
                    if(props.value && !props.value.startsWith('$2a$')){
                        const validation = SercurityUtils.validatePassword(props.value);
                        return validation.errors.join(".");
                    }
                    return "Password Validation Failed...😔😔😔";
                },
            }
        },
        role: {
            type: String, 
            enum: ['super_admin', 'client_admin', 'client_viewer'],
            default: 'client_viewer'
        },
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: function(){
                return this.role !== 'super_admin'
            }
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        permissions: {
            canCreateApiKey: {
                type: Boolean,
                default: false
            },
            canManageUsers: {
                type: Boolean,
                default: false
            },
            canViewAnalytics: {
                type: Boolean,
                default: true
            },
            canExportData: {
                type: Boolean,
                default: true
            }
        }
    }, 
    {
        timestamps: true,
        collection: "users"
    }
);


//Middleware in DB

// userSchema.pre("save", async function(next){
//     if(!this.isModified('password')){
//         return next();
//     }
//     try {
//         const salt = await bcrypt.genSalt(10);
//         this.password = await bcrypt.hash(this.password, salt);
//         next();
//     } catch (error) {
//         next(error);
//     }
// });

// updated mongoose middleware style to use async/await without next() as per mongoose 6.x documentation
userSchema.pre("save", async function () {

    if (!this.isModified("password")) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 *    - data converted in B-Tree when we use indexes.
 *    - Indexes are used to speed up the search process.
 *    - takes O(log n) to search an element and O(n) without index.
 *    - time for search operation decreases but time for insert operation increases.
 *  
 *    - if we mention two fields in index then it will create a compound index.
 *    - here sorting happens based on first field, if first field value is same then sorting happens based on second field.
 *    - if we mention one field in index then it will create a single field index.
 */
userSchema.index({ clientId: 1, isActive: 1});  
userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);
export default User;