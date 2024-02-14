import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

const uploadOnClodinary = async function (localPath) {
    
    try {
        if(!localPath) return null;
        //Else proceed with file upload
        const response  = await cloudinary.uploader.upload(localPath,{resource_type: auto})
        console.log('File uploaded successfully',response.url)
        return response
    } catch (error) {
        //Now if we encounter an error and were unable to upload the file to cloudinary then at least we can unlink the file in our server
        fs.unlinkSync(localPath)
        return null;
    }
}

export {uploadOnClodinary}