import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

function getSafeFileName(originalName = "file") {
  return originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

export function uploadToCloudinary(
  fileBuffer,
  folder = "vschat",
  originalName = "file",
) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        filename_override: originalName,
        public_id: getSafeFileName(originalName),
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}
