import {asyncHandler} from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req,res)=>{
    res.status(200).json({
        message: "Ok"
    })
})

export {registerUser}

/*
The asyncHandler function takes another function requestHandler as its parameter. It returns a new function that will be used as middleware in the Express.js application.

The returned function takes req, res, and next as parameters.
It wraps the requestHandler function in a Promise.resolve().
If the promise resolves successfully, it moves to the next middleware or route handler.
If there's an error during the asynchronous operation, it catches the error and passes it to the next function, triggering error handling.

*/