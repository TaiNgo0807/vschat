export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    outputType = "image/jpeg",
    minSizeToCompress = 700 * 1024,
  } = options;

  if (!file || !file.type?.startsWith("image/")) {
    return file;
  }

  // GIF động thì bỏ qua, nén canvas sẽ làm mất animation
  if (file.type === "image/gif") {
    return file;
  }

  // Ảnh nhỏ rồi thì không cần nén
  if (file.size <= minSizeToCompress) {
    return file;
  }

  let imageBitmap;

  try {
    imageBitmap = await createImageBitmap(file);

    const { width, height } = imageBitmap;

    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

    const newWidth = Math.round(width * ratio);
    const newHeight = Math.round(height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext("2d");

    // Nếu ép PNG/WebP trong suốt sang JPEG thì đổ nền trắng trước
    if (outputType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, newWidth, newHeight);
    }

    ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, outputType, quality);
    });

    if (!blob) return file;

    // Nếu nén xong mà vẫn nặng hơn file gốc thì dùng file gốc
    if (blob.size >= file.size) {
      return file;
    }

    const originalName = file.name.replace(/\.[^/.]+$/, "");

    const extension =
      outputType === "image/webp"
        ? "webp"
        : outputType === "image/png"
          ? "png"
          : "jpg";

    const compressedName = `${originalName}.${extension}`;

    return new File([blob], compressedName, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Compress image failed:", error);
    return file;
  } finally {
    if (imageBitmap) {
      imageBitmap.close();
    }
  }
}
