import { useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { compressImage } from "../utils/compressImage";

const MAX_FILES = 10;

export default function MessageInput({
  selectedGroup,
  onLocalMessage,
  onMessageConfirmed,
  onMessageFailed,
}) {
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  function createTempId() {
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) {
      setFiles([]);
      return;
    }

    const limitedFiles = selectedFiles.slice(0, MAX_FILES);

    if (selectedFiles.length > MAX_FILES) {
      alert(`Chỉ được gửi tối đa ${MAX_FILES} file/lần`);
    }

    try {
      setCompressing(true);

      const processedFiles = [];

      for (const item of limitedFiles) {
        if (item.type?.startsWith("image/")) {
          const compressedFile = await compressImage(item, {
            maxWidth: 1280,
            maxHeight: 1280,
            quality: 0.72,
          });

          processedFiles.push(compressedFile);
        } else {
          processedFiles.push(item);
        }
      }

      setFiles(processedFiles);
    } catch (error) {
      console.log("Compress files error:", error);
      setFiles(limitedFiles);
    } finally {
      setCompressing(false);
    }
  }

  async function sendMessageInBackground({
    tempId,
    currentText,
    currentFiles,
    groupId,
  }) {
    const formData = new FormData();
    formData.append("text", currentText);
    formData.append("groupId", groupId);
    formData.append("clientTempId", tempId);

    currentFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setUploadingCount((prev) => prev + 1);

      const data = await apiRequest("/api/messages", {
        method: "POST",
        data: formData,
      });

      if (data.message) {
        onMessageConfirmed(tempId, data.message);
      }
    } catch (error) {
      onMessageFailed(tempId);
      alert(error.message);
    } finally {
      setUploadingCount((prev) => Math.max(prev - 1, 0));
    }
  }

  function createLocalFiles(currentFiles) {
    return currentFiles.map((file) => ({
      url: URL.createObjectURL(file),
      publicId: "",
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      resourceType: file.type?.startsWith("image/") ? "image" : "raw",
      isLocal: true,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!selectedGroup?._id) {
      alert("Chưa chọn nhóm chat");
      return;
    }

    if (compressing) {
      alert("Ảnh đang được tối ưu, vui lòng đợi một chút.");
      return;
    }

    const currentText = text.trim();
    const currentFiles = files;

    if (!currentText && currentFiles.length === 0) return;

    const tempId = createTempId();
    console.time("show-local-message");

    onLocalMessage({
      _id: tempId,
      clientTempId: tempId,
      group: selectedGroup,
      sender: user,
      text: currentText,
      file: createLocalFiles(currentFiles)[0] || null,
      files: createLocalFiles(currentFiles),
      seenBy: [],
      reactions: [],
      isRevoked: false,
      createdAt: new Date().toISOString(),
      isSending: true,
      isFailed: false,
    });
    console.timeEnd("show-local-message");

    setText("");
    setFiles([]);
    e.currentTarget.reset();

    sendMessageInBackground({
      tempId,
      currentText,
      currentFiles,
      groupId: selectedGroup._id,
    });
  }

  function getPlaceholder() {
    if (!selectedGroup) return "Chưa chọn nhóm...";
    if (compressing) return "Đang tự tối ưu ảnh...";

    if (files.length === 1) return `Đã chọn: ${files[0].name}`;
    if (files.length > 1) return `Đã chọn ${files.length} file`;

    return `Nhắn vào ${selectedGroup.name}...`;
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <label className="file-btn">
        📎
        <input type="file" hidden multiple onChange={handleFileChange} />
      </label>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={getPlaceholder()}
        disabled={!selectedGroup}
      />

      <button type="submit" disabled={!selectedGroup || compressing}>
        {compressing ? "Đợi..." : "Gửi"}
      </button>

      {uploadingCount > 0 && (
        <span className="uploading-status">Đang tải {uploadingCount}</span>
      )}
    </form>
  );
}
