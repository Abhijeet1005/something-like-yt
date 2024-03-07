import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req,res)=>{
    
    // Need to serve videos with pagination and with any sorting passed in query paramerter
    const { page = 1, limit = 5, sortBy, sortType, query, userId } = req.params


})

const uploadVideo = asyncHandler(async (req,res)=>{

    /*
    Need to check for the fields to be non-empty first,
    then check for video file and upload it to cloudinary,
    fetch the url and the video duration from cloudinary,
    verify the info then make a new document to store the details,
    return the new document in response
    */

    const {title,description} = req.body
    
    if(
        [title,description].some((field)=> field?.trim() === "") 
    ){
        throw new ApiError(400,"All fields are required")
    }
    
    const videoLocalPath = req.files.videoFile[0]?.path
    const thumbnailLocalPath = req.files.thumbnail[0]?.path


    if(!videoLocalPath && !thumbnailLocalPath){
        throw new ApiError(
            400,
            "All files are required"
        )
    }

    const videoCloudinary = await uploadOnCloudinary(videoLocalPath)
    if(!videoCloudinary){
        throw new ApiError(401, "Unable to upload the video")
    }

    const thumbnailCloudinary = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnailCloudinary){
        throw new ApiError(401, "Unable to upload thumbnail")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoCloudinary.url,
        thumbnail: thumbnailCloudinary.url,
        duration: videoCloudinary.duration,
        owner: req.user?._id,
    })
    
    if(!video){
        throw new ApiError(401, "Unable to upload video")
    }

    console.log(video)

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Video uploaded successfully",
            video
        )
    )
})


export {
    getAllVideos,
    uploadVideo
}