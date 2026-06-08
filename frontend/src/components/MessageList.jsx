import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api, { apiRequest } from "../services/api";

function isImage(mimeType = "") {
  return mimeType.startsWith("image/");
}

function hasOtherSeen(message, myUserId) {
  return message.seenBy?.some((seen) => {
    const seenUserId = seen.user?._id || seen.user;
    return seenUserId !== myUserId;
  });
}

export default function MessageList({ messages, onMessageUpdated }) {
  const { user } = useAuth();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleRevoke(messageId) {
    const ok = confirm("Thu hồi tin nhắn này?");
    if (!ok) return;

    try {
      const res = await apiRequest(`/api/messages/${messageId}/revoke`, {
        method: "PATCH",
      });

      onMessageUpdated(res.data);
    } catch (error) {
      alert(error.message);
    }
  }

  async function downloadFile(message) {
    try {
      const response = await api.get(`/api/messages/${message._id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: message.file.mimeType || "application/octet-stream",
      });

      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = message.file.originalName || "vschat-file";
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert("Không tải được file", error);
    }
  }

  return (
    <div className="message-list">
      {messages.map((message) => {
        const isMine = message.sender?._id === user?._id;
        const seen = hasOtherSeen(message, user?._id);

        return (
          <div
            className={`message-row ${isMine ? "mine" : ""}`}
            key={message._id}
          >
            {!isMine && (
              <div className="small-avatar">
                {message.sender?.avatarUrl ? (
                  <img
                    src={message.sender.avatarUrl}
                    alt={message.sender.displayName}
                  />
                ) : (
                  <span>
                    {message.sender?.displayName?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
            )}

            <div className="message-bubble">
              {!isMine && (
                <strong className="sender-name">
                  {message.sender?.displayName}
                </strong>
              )}

              {message.isRevoked ? (
                <p className="revoked-message">Tin nhắn đã được thu hồi</p>
              ) : (
                <>
                  {message.text && <p>{message.text}</p>}

                  {message.file && (
                    <div className="file-message">
                      {isImage(message.file.mimeType) ? (
                        <a
                          href={message.file.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={message.file.url}
                            alt={message.file.originalName}
                          />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="file-link-btn"
                          onClick={() => downloadFile(message)}
                        >
                          📎 {message.file.originalName || "Tải file"}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="message-footer">
                <small>
                  {new Date(message.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>

                {isMine && !message.isRevoked && (
                  <small className="message-status">
                    {seen ? "Đã xem" : "Đã gửi"}
                  </small>
                )}
              </div>

              {isMine && !message.isRevoked && (
                <button
                  type="button"
                  className="revoke-btn"
                  onClick={() => handleRevoke(message._id)}
                >
                  Thu hồi
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
