import {Router} from "express";
import { loginUser, registerUser , logoutUser, tokenReset, resetPassword, getUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { JWTcheck } from "../middlewares/auth.middleware.js";

const router = Router()

router.route('/register').post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]),registerUser)

router.route('/login').post(loginUser)

router.route('/logout').post(JWTcheck,logoutUser)

router.route('/resetToken').post(tokenReset)

router.route('/resetPassword').post(JWTcheck,resetPassword)

router.route('/getUser').post(JWTcheck,getUser)

export default router