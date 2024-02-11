class ApiError extends Error{
    constructor(
        statusCode,
        message = 'Something went wrong',
        errors = [],
        stack = '',
    ) { 
        //We first build the error object with the constructor of Error class with the message we have then we edit specific properties
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.errors = errors
        this.data = null
        this.success = false

        //We can also implement the Error.captureStackTrace here
        // if (stack){
        //     this.stack = stack
        // }else{
        //     Error.captureStackTrace(this,this.constructor)
        // }

    }
}

export {ApiError}