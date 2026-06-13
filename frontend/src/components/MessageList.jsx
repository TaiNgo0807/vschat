import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { apiRequest } from "../services/api";

function isImage(mimeType = "") {
  return mimeType.startsWith("image/");
}

function hasOtherSeen(message, myUserId) {
  return message.seenBy?.some((seen) => {
    const seenUserId = seen.user?._id || seen.user;
    return seenUserId && seenUserId !== myUserId;
  });
}

function groupReactions(reactions = []) {
  return reactions.reduce((result, reaction) => {
    if (!result[reaction.emoji]) {
      result[reaction.emoji] = [];
    }

    result[reaction.emoji].push(reaction.user);
    return result;
  }, {});
}

export default function MessageList({ messages, onMessageUpdated }) {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [seenModal, setSeenModal] = useState(null);

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

  async function handleReact(messageId, emoji) {
    try {
      const res = await apiRequest(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        data: { emoji },
      });

      onMessageUpdated(res.data);
    } catch (error) {
      alert(error.message);
    }
  }

  async function openSeenModal(message) {
    try {
      const data = await apiRequest(`/api/messages/${message._id}/seen`);

      setSeenModal({
        message,
        seenBy: data.seenBy || [],
      });
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
      console.log("Download file error:", error);
      alert("Không tải được file");
    }
  }

  function renderFile(message) {
    const file = message.file;
    if (!file) return null;

    if (isImage(file.mimeType)) {
      if (file.isLocal) {
        return <img src={file.url} alt={file.originalName} />;
      }

      return (
        <a href={file.url} target="_blank" rel="noreferrer">
          <img src={file.url} alt={file.originalName} />
        </a>
      );
    }

    if (file.isLocal) {
      return (
        <a
          href={file.url}
          download={file.originalName || "vschat-file"}
          className="file-link-btn"
        >
          📎 {file.originalName || "File đang gửi..."}
        </a>
      );
    }

    return (
      <button
        type="button"
        className="file-link-btn"
        onClick={() => downloadFile(message)}
      >
        📎 {file.originalName || "Tải file"}
      </button>
    );
  }

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="empty-chat">
          <div>
            <h3>Chưa có tin nhắn</h3>
            <p>Hãy gửi tin nhắn đầu tiên trong nhóm này.</p>
          </div>
        </div>
      )}

      {messages.map((message) => {
        const isMine = message.sender?._id === user?._id;
        const seen = hasOtherSeen(message, user?._id);
        const reactionGroups = groupReactions(message.reactions || []);
        const isTemp = message.isSending || message.isFailed;

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

            <div
              className={`message-bubble ${message.isFailed ? "failed" : ""}`}
            >
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
                    <div className="file-message">{renderFile(message)}</div>
                  )}

                  {!isTemp && (
                    <div className="reaction-picker">
                      {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => handleReact(message._id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {message.reactions?.length > 0 && (
                    <div className="reaction-summary">
                      {Object.entries(reactionGroups).map(([emoji, users]) => (
                        <span
                          key={emoji}
                          title={users
                            .map((u) => u?.displayName)
                            .filter(Boolean)
                            .join(", ")}
                        >
                          {emoji} {users.length}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="message-footer">
                <small>
                  {message.isFailed
                    ? "Gửi thất bại"
                    : message.isSending
                      ? "Đang gửi..."
                      : new Date(message.createdAt).toLocaleTimeString(
                          "vi-VN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                </small>

                {isMine && !message.isRevoked && !isTemp && (
                  <button
                    type="button"
                    className="seen-btn"
                    onClick={() => openSeenModal(message)}
                  >
                    {seen ? "Đã xem" : "Đã gửi"}
                  </button>
                )}
              </div>

              {isMine && !message.isRevoked && !isTemp && (
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

      {seenModal && (
        <div className="seen-overlay" onClick={() => setSeenModal(null)}>
          <div className="seen-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seen-modal-header">
              <h3>Người đã xem</h3>

              <button type="button" onClick={() => setSeenModal(null)}>
                ✕
              </button>
            </div>

            {seenModal.seenBy.length === 0 ? (
              <p>Chưa có ai xem</p>
            ) : (
              <div className="seen-user-list">
                {seenModal.seenBy.map((seen) => (
                  <div className="seen-user" key={seen.user?._id || seen.user}>
                    <div className="small-avatar">
                      {seen.user?.avatarUrl ? (
                        <img
                          src={seen.user.avatarUrl}
                          alt={seen.user.displayName}
                        />
                      ) : (
                        <span>
                          {seen.user?.displayName?.charAt(0)?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <strong>{seen.user?.displayName}</strong>
                      <small>
                        {new Date(seen.seenAt).toLocaleString("vi-VN")}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
