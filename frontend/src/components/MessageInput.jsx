import { useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { compressImage } from "../utils/compressImage";

export default function MessageInput({
  selectedGroup,
  onLocalMessage,
  onMessageConfirmed,
  onMessageFailed,
}) {
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileLabel, setFileLabel] = useState("");
  const [uploadingCount, setUploadingCount] = useState(0);

  function createTempId() {
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files?.[0] || null;

    if (!selectedFile) {
      setFile(null);
      setFileLabel("");
      return;
    }

    // Chỉ lưu file, chưa nén ở đây
    setFile(selectedFile);
    setFileLabel(selectedFile.name);
  }

  async function sendMessageInBackground({
    tempId,
    currentText,
    currentFile,
    groupId,
  }) {
    try {
      setUploadingCount((prev) => prev + 1);

      let uploadFile = currentFile;

      // Nén ảnh trong background, không chặn UI
      if (currentFile && currentFile.type?.startsWith("image/")) {
        uploadFile = await compressImage(currentFile, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.72,
          outputType: "image/jpeg",
        });

        console.log("Ảnh gốc:", Math.round(currentFile.size / 1024), "KB");
        console.log("Ảnh sau nén:", Math.round(uploadFile.size / 1024), "KB");
      }

      const formData = new FormData();
      formData.append("text", currentText);
      formData.append("groupId", groupId);
      formData.append("clientTempId", tempId);

      if (uploadFile) {
        // Phải khớp với backend: upload.single("file")
        formData.append("file", uploadFile);
      }

      const data = await apiRequest("/api/messages", {
        method: "POST",
        data: formData,
      });

      if (data.message) {
        onMessageConfirmed(tempId, data.message);
      }
    } catch (error) {
      console.log("Send message error:", error);
      onMessageFailed(tempId);
      alert(error.message || "Gửi tin nhắn thất bại");
    } finally {
      setUploadingCount((prev) => Math.max(prev - 1, 0));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!selectedGroup?._id) {
      alert("Chưa chọn nhóm chat");
      return;
    }

    if (!text.trim() && !file) return;

    const currentText = text.trim();
    const currentFile = file;
    const tempId = createTempId();

    let localFile = null;

    if (currentFile) {
      localFile = {
        url: URL.createObjectURL(currentFile), // hiện ảnh local ngay
        publicId: "",
        originalName: currentFile.name,
        mimeType: currentFile.type || "application/octet-stream",
        size: currentFile.size,
        resourceType: currentFile.type?.startsWith("image/") ? "image" : "raw",
        isLocal: true,
      };
    }

    onLocalMessage({
      _id: tempId,
      clientTempId: tempId,
      group: selectedGroup,
      sender: user,
      text: currentText,
      file: localFile,
      seenBy: [],
      reactions: [],
      isRevoked: false,
      createdAt: new Date().toISOString(),
      isSending: true,
      isFailed: false,
    });

    // Clear input ngay
    setText("");
    setFile(null);
    setFileLabel("");
    e.currentTarget.reset();

    // Upload chạy nền
    sendMessageInBackground({
      tempId,
      currentText,
      currentFile,
      groupId: selectedGroup._id,
    });
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <label className="file-btn">
        📎
        <input type="file" hidden onChange={handleFileChange} />
      </label>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          selectedGroup
            ? file
              ? `Đã chọn: ${fileLabel}`
              : `Nhắn vào ${selectedGroup.name}...`
            : "Chưa chọn nhóm..."
        }
        disabled={!selectedGroup}
      />

      <button type="submit" disabled={!selectedGroup}>
        Gửi
      </button>

      {uploadingCount > 0 && (
        <span className="uploading-status">Đang tải {uploadingCount}</span>
      )}
    </form>
  );
}
