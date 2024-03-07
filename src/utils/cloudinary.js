import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

//Needed to do this otherwise the envs were not accessible with process.env
import dotenv from 'dotenv';
import { log } from "console";
dotenv.config({
    path: './.env'
})


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localPath) => {
    try {
        if (!localPath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        if(response){
            fs.unlinkSync(localPath)
        }
        console.log("file uploaded on cloudinary ", response.url);
        return response;

    } catch (error) {
        fs.unlinkSync(localPath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

const removeFromCloudinary = async (url)=>{
    try {
        if(!url) return null

        //Regex for public ID extraction 
        //It takes the ID between last / and . that way all extensions are supported
        const regex = /\/v\d+\/([^\/]+)\.[^\/]+$/;
        const match = url.match(regex);

        const response = await cloudinary.uploader.destroy(match[1],{resource_type: 'auto'})
        if(response){
            console.log("Old file removed")
        }
    } catch (error) {
        return null
    }

}



export {uploadOnCloudinary,removeFromCloudinary}