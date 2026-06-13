import { useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MessageInput({
  selectedGroup,
  onLocalMessage,
  onMessageConfirmed,
  onMessageFailed,
}) {
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  function createTempId() {
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function sendMessageInBackground({
    tempId,
    currentText,
    currentFile,
    groupId,
  }) {
    const formData = new FormData();
    formData.append("text", currentText);
    formData.append("groupId", groupId);
    formData.append("clientTempId", tempId);

    if (currentFile) {
      formData.append("file", currentFile);
    }

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
        url: URL.createObjectURL(currentFile),
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

    setText("");
    setFile(null);
    e.currentTarget.reset();

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
        <input
          type="file"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          selectedGroup
            ? file
              ? `Đã chọn: ${file.name}`
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
