import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: Process.env.CLOUDINARY_CLOUD_NAME,
  api_key: Process.env.CLOUDINARY_API_KEY,
  api_secret: Process.env.CLOUDINARY_API_SECRET, // Click 'View Credentials' below to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("file uploaded successfully on cloudinary", response.url);
    return response;
  } catch (err) {
    fs.unlinkSync(localFilePath);
    console.log(err);
    return null;
  }
};

export { uploadOnCloudinary };
