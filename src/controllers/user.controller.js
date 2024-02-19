import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse}  from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateTokens = async function(user){
    //we have passed the user here to avoid making another database call

    try {
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong on our end")
    }

}

const cookieOptions = {
    httpOnly: true,
    secure: true
}

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

    let coverImageTempPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageTempPath = req.files.coverImage[0].path
    }

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

const loginUser = asyncHandler( async (req,res)=>{
    const {email, password} = req.body
    
    if(!email){
        throw new ApiError(401,"Email is required")
    }

    let user = await User.findOne()

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const checkPass = await user.isPasswordCorrect(password)

    if(!checkPass){
        throw new ApiError(401,"Re-check the credentials")
    }
    //Now we will generate the Acc and Ref tokens and send the Acc and Ref back to user
    const {accessToken,refreshToken} = await generateTokens(user)

    //Getting the same user without the password and refreshToken included
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res.status(200)
    .cookie("accessToken",accessToken, cookieOptions)
    .cookie("refreshToken",refreshToken,cookieOptions)
    .json(
        new ApiResponse(
            200,
            "Logged in successfully",
            {
                user: loggedInUser,accessToken,refreshToken,
            }
        )
    )
})

const logoutUser = asyncHandler(async (req,res)=>{

    //We fetch the user ID from the req.user passed then update its refreshToken 
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken: undefined
        }
    })

    // Then we also delete the cookies to properly logout the user
    return res.status(200)
    .clearCookie("accessToken",cookieOptions)
    .clearCookie("refreshToken",cookieOptions)
    .json(new ApiResponse(
        200,"Logged out successfully",{}
    ))
})

const tokenReset = asyncHandler( async (req,res)=>{

    //we dont need to make this a secured route because we have appropriate checks to handle requests without the user passed in 
    const reqRefToken = req.cookies.refreshToken || req.body.refreshToken

    if(!reqRefToken){
        throw new ApiError(401,"Unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(reqRefToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Unauthorized access") // Will refer to a bad refreshToken 
        }
    
        if(reqRefToken !== user?.refreshToken){
            throw new ApiError(401,"Invalid or expired refresh token")
        }
    
        const {accessToken,refreshToken} = await generateTokens(user)
    
        return res.status(200)
        .cookie("accessToken",accessToken, cookieOptions)
        .cookie("refreshToken",refreshToken,cookieOptions)
        .json(
            new ApiResponse(
                200,
                "Authenticated successfully",
                {
                    accessToken,refreshToken
                }
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

const resetPassword = asyncHandler(async (req,res)=>{

    const {oldPass,newPass} = req.body
    const user = await User.findById(req.user._id)

    if(!user.isPasswordCorrect(oldPass)){
        throw new ApiError(400, "Old password is incorrect")
    }
    
    user.password = newPass
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(
        200,
        "Password upadated successfully",
        {}
    ))

})
export {registerUser,loginUser,logoutUser,tokenReset,resetPassword}











/*
The asyncHandler function takes another function requestHandler as its parameter. It returns a new function that will be used as middleware in the Express.js application.

The returned function takes req, res, and next as parameters.
It wraps the requestHandler function in a Promise.resolve().
If the promise resolves successfully, it moves to the next middleware or route handler.
If there's an error during the asynchronous operation, it catches the error and passes it to the next function, triggering error handling.

*/