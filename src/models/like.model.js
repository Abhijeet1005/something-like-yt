import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({

    comment: {
        type: mongoose.Types.ObjectId,
        ref: "Comment"
    },

    video: {
        type: mongoose.Types.ObjectId,
        ref: "Video"
    },

    post: {
        type: mongoose.Types.ObjectId,
        ref: "Post"
    },

    likedBy: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    }


},{timestamps: true})

export const Like = mongoose.model("Like",likeSchema)