import { useState } from "react";
import { apiRequest } from "../services/api";

export default function MessageInput({ onMessageCreated }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!text.trim() && !file) return;

    const formData = new FormData();
    formData.append("text", text.trim());

    if (file) {
      formData.append("file", file);
    }

    try {
      setSending(true);

      const data = await apiRequest("/api/messages", {
        method: "POST",
        data: formData,
      });

      // Quan trọng: tự thêm message vừa gửi lên giao diện
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
        placeholder={file ? `Đã chọn: ${file.name}` : "Nhập tin nhắn..."}
      />

      <button disabled={sending}>{sending ? "..." : "Gửi"}</button>
    </form>
  );
}
