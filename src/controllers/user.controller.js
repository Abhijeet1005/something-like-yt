import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary,removeFromCloudinary} from "../utils/cloudinary.js";
import {ApiResponse}  from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


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
    const loggedOutUser = await User.findByIdAndUpdate(req.user._id,{

        //Unset just removes the field from the fetched document
        $unset:{
            refreshToken: 1,
            password: 1
        }
    },
    {
        new: true,
    }
    )

    // Then we also delete the cookies to properly logout the user
    return res.status(200)
    .clearCookie("accessToken",cookieOptions)
    .clearCookie("refreshToken",cookieOptions)
    .json(new ApiResponse(
        200,"Logged out successfully",loggedOutUser
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

const getUser = asyncHandler(async (req,res)=>{
    if(!req.user){                                         //This check isnt necessary
        throw new ApiError(400, "Unable to find user")
    }

    return res.status(200)
    .json(new ApiResponse(
        200,
        "User found",
        req.user
    ))
})

const updateUser = asyncHandler(async (req,res)=>{
    const {fullName,email} = req.body

    if(!(fullName && email)){
        throw new ApiError(400, "All fields required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            fullName,
            email,
        },
        {
            new: true
        }
    )

    if(!user){
        throw new ApiError(401, "Unable to update user")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "User updated successfully",
            user
        )
    )
})

const updateAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    // const user  = User.findById(req.user?._id).select("-password -refreshToken")
    if(!req.user){
        throw new ApiError(401,"Unable to find user")
    }
    if(!avatarLocalPath){
        throw new ApiError(401,"Unable to find avatar file")
    }
    
    const avatarCloudinary = await uploadOnCloudinary(avatarLocalPath)
    if(!avatarCloudinary){
        throw new ApiError(500,"Avatar change failed, Please try again")
    }


    let user = await User.findById(req.user._id).select("-password -refreshToken")
    const oldAvatarUrl = user.avatar
    user.avatar = avatarCloudinary.url
    await user.save({validateBeforeSave: false}).then(
        newUser => {
            user = newUser
        }
    )
    await removeFromCloudinary(oldAvatarUrl)

    return res.status(200)
    .json(new ApiResponse(
        200,
        "Avatar upadate successfully",
        user
    ))
})

const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!req.user){
        throw new ApiError(401,"Unable to find user")
    }
    if(!coverImageLocalPath){
        throw new ApiError(401,"Unable to find Image file")
    }
    
    const coverImageCloudinary = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImageCloudinary){
        throw new ApiError(500,"Cover Image change failed, Please try again")
    }


    let user = await User.findById(req.user._id).select("-password -refreshToken")

    const oldCoverImage = user.coverImage
    console.log(oldCoverImage)
    user.coverImage = coverImageCloudinary.url
    await user.save({validateBeforeSave: false}).then(
        newUser => {
            user = newUser
        }
    )
    await removeFromCloudinary(oldCoverImage)
    return res.status(200)
    .json(new ApiResponse(
        200,
        "Cover Image upadate successfully",
        user
    ))
})

const fetchChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if(!username){
        throw new ApiError(401,"Username required")
    }

    const profile = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscibersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.body?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscibersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
            }
        }
    ]);
    
    // The profile then returns an array of documents (in above case there will be a single document inside that array because we are fetching single user)

    if(!profile?.length){
        throw new ApiError(404,"User does not exist")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "User fetched successfully",
            profile[0]
        )
    )
    
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    //Getting  req.user
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }, // will return [{user}]
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                //Will return watchHistory [{video},{video}]
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            //Will return video {owner}
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Watch history fetched successfully",
            user[0].watchHistory
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    tokenReset,
    resetPassword,
    getUser,
    updateAvatar,
    updateCoverImage,
    fetchChannelProfile,
    getWatchHistory,
    updateUser
}









