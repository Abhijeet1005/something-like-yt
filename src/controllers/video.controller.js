import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

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
        thumbnail: thumbnailCloudinary.url,
        videoFile: videoCloudinary.url,
        duration: videoCloudinary.duration,
        owner: req.user?._id,
    })
    
    if(!video){
        throw new ApiError(401, "Unable to upload video")
    }
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Video uploaded successfully",
            video
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400,"Video ID needed")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(401, "Unable to fetch the video")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Video fetched from database",
            video
        )
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    /*
    check the video ID in params,
    fetch the video,
    check for video document
    check for owner and logged in user to be same,
    if same then delete the files from cloudinary, 
    then delete the document,
    send a response back
    */
    
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400,"Video ID needed")
    }

    const video = await Video.findById(videoId)
    // console.log(req.user._id.toString())
    // console.log(video.owner.toString())


    if(!(req.user._id.toString() === video.owner.toString())){
        
        throw new ApiError(401,"Only owner can delete the video")
    }

    await removeFromCloudinary(video.videoFile)
    await removeFromCloudinary(video.thumbnail)

    await Video.findByIdAndDelete(videoId)

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Video deleted successfully"
        )
    )
})

const updateVideo = asyncHandler(async (req, res)=>{
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400,"Video ID needed")
    }

    const {title, description,} = req.body

    if(
        [title,description].some((field)=> field?.trim() === "") 
    ){
        throw new ApiError(400,"All fields are required")
    }

    const thumbnailLocalPath = req.file?.path

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail not provided")
    }
    
    const video = await Video.findById(videoId)

    const oldThumbnailCloudinary = video.thumbnail

    if(!video){
        throw new ApiError(401, "Unable to fetch the video")
    }
    
    const thumbnailCloudinary = await uploadOnCloudinary(thumbnailLocalPath)

    if(!thumbnailCloudinary){
        throw new ApiError(401, "Unable to upload thumbnail")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            title,
            description,
            thumbnail: thumbnailCloudinary.url,
        },
        {
            new: true
        }
    )

    if(!updatedVideo){
        throw new ApiError(401, "Unable to update video details")
    }

    await removeFromCloudinary(oldThumbnailCloudinary)

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Video updated successfully",
            updatedVideo
        )
    )

})


export {
    getAllVideos,
    uploadVideo,
    getVideoById,
    deleteVideo,
    updateVideo
}