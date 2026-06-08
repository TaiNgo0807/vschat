import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("Thiếu biến môi trường Cloudinary:");
  console.error({
    CLOUDINARY_CLOUD_NAME: CLOUDINARY_CLOUD_NAME ? "OK" : "MISSING",
    CLOUDINARY_API_KEY: CLOUDINARY_API_KEY ? "OK" : "MISSING",
    CLOUDINARY_API_SECRET: CLOUDINARY_API_SECRET ? "OK" : "MISSING",
  });
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export default cloudinary;
