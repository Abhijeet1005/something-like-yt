import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse}  from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req,res)=>{
    const {fullname,username,email,password} = req.body

    //check that required fields are not empty 
    if(
        [fullname,email,username,password].some((field)=> field?.trim() === "")   //.some() will check and if at least one element satisfies the condition
    ){
        throw new ApiError(400,"All fields are required")
    }
    if(!email.includes('@')){
        throw new ApiError(401,"Enter valid email")
    }

    //db query for existing user
    const existingUser = await User.findOne({
        username:username,
        // $or: [{ username },{ email }]  //This operator if we want both email and username to be unique
    })

    if(existingUser){
        throw new ApiError(409, "username already taken")
    }

    const avatarTempPath = req.files?.avatar[0]?.path;
    const coverImageTempPath = req.files?.coverImage[0]?.path;

    if(!avatarTempPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatarCloudinary = await uploadOnCloudinary(avatarTempPath)
    const coverImageCloudinary = await uploadOnCloudinary(coverImageTempPath)

    if(!avatarCloudinary){
        throw new ApiError(400,"Avatar is required.")
    }

    const user = await User.create({
        fullname,
        email,
        avatar: avatarCloudinary.url,
        coverImage: coverImageCloudinary?.url || "",  //We havent marked coverImage as necessary so we do this check
        username: username.toLowerCase(),
        password,
    })
    
    //Now we send data of the newly created use but excluding the password and refresh token
    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Unable to create the user")
    }

    //Now we will send a proper built response using the ApiResponse class to serve a uniform response every time 
    return res.status(201).json(
        new ApiResponse(200,"User created successfully",createdUser)
    )
})

export {registerUser}











/*
The asyncHandler function takes another function requestHandler as its parameter. It returns a new function that will be used as middleware in the Express.js application.

The returned function takes req, res, and next as parameters.
It wraps the requestHandler function in a Promise.resolve().
If the promise resolves successfully, it moves to the next middleware or route handler.
If there's an error during the asynchronous operation, it catches the error and passes it to the next function, triggering error handling.

*/