import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { JWTcheck } from "../middlewares/auth.middleware.js";
import { deleteVideo, getVideoById, updateVideo, uploadVideo } from "../controllers/video.controller.js";

const router  = Router();

router.use(JWTcheck) //This applies token check for all routes

router.route("/")
.get()
.post(upload.fields([
    {
        name: "videoFile",
        maxCount: 1
    },
    {
        name: "thumbnail",
        maxCount: 1
    }
]),uploadVideo)

router.route("/:videoId")
.get(getVideoById)
.patch(upload.single("thumbnail"),updateVideo)
.delete(deleteVideo)

export default router