import { useState } from "react";
import { apiRequest } from "../services/api";

export default function MessageInput({ selectedGroup, onMessageCreated }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedGroup?._id) {
      alert("Chưa chọn nhóm chat");
      return;
    }

    if (!text.trim() && !file) return;

    const formData = new FormData();
    formData.append("text", text.trim());
    formData.append("groupId", selectedGroup._id);

    if (file) {
      formData.append("file", file);
    }

    try {
      setSending(true);

      const data = await apiRequest("/api/messages", {
        method: "POST",
        data: formData,
      });

      if (data.message) {
        onMessageCreated(data.message);
      }

      setText("");
      setFile(null);
      e.target.reset();
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
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

      <button disabled={sending || !selectedGroup}>
        {sending ? "..." : "Gửi"}
      </button>
    </form>
  );
}
