class AppError extends Error {
    constructor(message, statusCode = 500, errors = null){
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true; // to distinguish from programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;


// Error.captureStackTrace(this, this.constructor); === Error.CaptrueStackTrace(this, AppError)

// first argument is the object on which to capture the stack trace, second argument is the function to exclude from stack trace.
// this is used to trace the path that led to error


// example 1:--

// function A() {
//     B();
// }

// function B() {
//     C();
// }

// function C() {
//     throw new Error("Boom");
// }

// A(); --> Boom

// along with error msg and other details this will also give the path that led to error i.e A -> B -> C -> Boom

// output for example 1 looks like :-- 

// Error: Boom
//     at C
//     at B
//     at A



// example 2 :--  throw new AppError("User not found", 404);

// output for example 2 looks like :--

// Error: User not found
//     at new AppError (...)
//     at getUser (...)
//     at controller (...)