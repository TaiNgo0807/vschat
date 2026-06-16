import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { apiRequest } from "../services/api";

function isImage(mimeType = "") {
  return mimeType.startsWith("image/");
}

function getMessageFiles(message) {
  if (Array.isArray(message.files) && message.files.length > 0) {
    return message.files;
  }

  if (message.file) {
    return [message.file];
  }

  return [];
}

function getUserId(user) {
  return String(user?._id || user || "");
}

function getMessageSenderId(message) {
  return String(message.sender?._id || message.sender || "");
}

function getSeenUsers(message, myUserId) {
  const myId = String(myUserId || "");
  const senderId = getMessageSenderId(message);

  return (message.seenBy || []).filter((seen) => {
    const seenUserId = getUserId(seen.user);

    return seenUserId && seenUserId !== myId && seenUserId !== senderId;
  });
}

function hasOtherSeen(message, myUserId) {
  return getSeenUsers(message, myUserId).length > 0;
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

function renderFilesGrid(message, downloadFile, openImageViewer) {
  const files = getMessageFiles(message);

  if (files.length === 0) return null;

  const imageFiles = files.filter((file) => isImage(file.mimeType));
  const otherFiles = files.filter((file) => !isImage(file.mimeType));

  const total = imageFiles.length;
  const visibleImages = imageFiles.slice(0, 5);
  const galleryClass = `gallery-${Math.min(total, 5)}`;
  const imageUrls = imageFiles.map((file) => file.url);

  return (
    <>
      {imageFiles.length > 0 && (
        <div className={`chat-gallery ${galleryClass}`}>
          {visibleImages.map((file, index) => {
            const isDesktopMore = index === 4 && total > 5;
            const isMobileMore = index === 3 && total > 4;

            return (
              <button
                type="button"
                key={`${file.url}-${index}`}
                className={`chat-img-wrap gi-${index + 1}`}
                onClick={() => openImageViewer(imageUrls, index)}
              >
                <img src={file.url} alt={file.originalName || "Ảnh"} />

                {isDesktopMore && (
                  <span className="chat-img-more chat-img-more-desktop">
                    +{total - 5}
                  </span>
                )}

                {isMobileMore && (
                  <span className="chat-img-more chat-img-more-mobile">
                    +{total - 4}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {otherFiles.length > 0 && (
        <div className="multi-file-list">
          {otherFiles.map((file, index) =>
            file.isLocal ? (
              <a
                key={`${file.url}-${index}`}
                href={file.url}
                download={file.originalName || "vschat-file"}
                className="file-link-btn"
              >
                📎 {file.originalName || "File đang gửi..."}
              </a>
            ) : (
              <button
                key={`${file.url}-${index}`}
                type="button"
                className="file-link-btn"
                onClick={() => downloadFile(message)}
              >
                📎 {file.originalName || "Tải file"}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}

export default function MessageList({ messages, onMessageUpdated }) {
  const { user } = useAuth();

  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const lastMessageKeyRef = useRef("");

  const [seenModal, setSeenModal] = useState(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);

  const [imageViewer, setImageViewer] = useState({
    open: false,
    images: [],
    index: 0,
  });

  const lastMessage = messages[messages.length - 1];
  const lastMessageKey = lastMessage?._id || lastMessage?.clientTempId || "";

  function isNearBottom() {
    const el = listRef.current;
    if (!el) return true;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom < 160;
  }

  useEffect(() => {
    if (!lastMessageKey) return;

    const isNewMessage = lastMessageKey !== lastMessageKeyRef.current;
    lastMessageKeyRef.current = lastMessageKey;

    if (!isNewMessage) return;

    const isMyLastMessage =
      String(lastMessage?.sender?._id || lastMessage?.sender || "") ===
      String(user?._id || "");

    if (isMyLastMessage || isNearBottom()) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [lastMessageKey, user?._id]);

  useEffect(() => {
    if (!imageViewer.open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") closeImageViewer();
      if (e.key === "ArrowLeft") showPrevImage();
      if (e.key === "ArrowRight") showNextImage();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageViewer.open]);

  function openImageViewer(images, index) {
    setImageViewer({
      open: true,
      images,
      index,
    });
  }

  function closeImageViewer() {
    setImageViewer({
      open: false,
      images: [],
      index: 0,
    });
  }

  function showPrevImage() {
    setImageViewer((prev) => {
      if (prev.images.length <= 1) return prev;

      const nextIndex =
        prev.index - 1 < 0 ? prev.images.length - 1 : prev.index - 1;

      return {
        ...prev,
        index: nextIndex,
      };
    });
  }

  function showNextImage() {
    setImageViewer((prev) => {
      if (prev.images.length <= 1) return prev;

      const nextIndex =
        prev.index + 1 >= prev.images.length ? 0 : prev.index + 1;

      return {
        ...prev,
        index: nextIndex,
      };
    });
  }

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
      setActiveReactionMessageId(null);

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
    const cachedSeenBy = getSeenUsers(message, user?._id);

    setSeenModal({
      message,
      seenBy: cachedSeenBy,
      loading: true,
    });

    try {
      const data = await apiRequest(`/api/messages/${message._id}/seen`);

      setSeenModal((prev) => {
        if (!prev || prev.message._id !== message._id) return prev;

        const newMessage = {
          ...message,
          seenBy: data.seenBy || [],
        };

        return {
          ...prev,
          seenBy: getSeenUsers(newMessage, user?._id),
          loading: false,
        };
      });
    } catch (error) {
      console.log("Load seen error:", error);

      setSeenModal((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
            }
          : prev,
      );
    }
  }

  async function downloadFile(message) {
    try {
      const response = await api.get(`/api/messages/${message._id}/download`, {
        responseType: "blob",
      });

      const file = message.file || message.files?.[0];

      const blob = new Blob([response.data], {
        type: file?.mimeType || "application/octet-stream",
      });

      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file?.originalName || "vschat-file";
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.log("Download file error:", error);
      alert("Không tải được file");
    }
  }

  function renderSeenIndicator(message) {
    const seenUsers = getSeenUsers(message, user?._id);

    if (seenUsers.length === 0) return null;

    const visibleSeenUsers = seenUsers.slice(0, 3);
    const remainCount = seenUsers.length - visibleSeenUsers.length;

    return (
      <button
        type="button"
        className="seen-avatar-btn"
        onClick={() => openSeenModal(message)}
        title="Xem người đã xem"
      >
        {visibleSeenUsers.map((seen, index) => {
          const seenUser = seen.user;
          const key = getUserId(seenUser) || `${message._id}-seen-${index}`;

          return (
            <span className="seen-mini-avatar" key={key}>
              {seenUser?.avatarUrl ? (
                <img src={seenUser.avatarUrl} alt={seenUser.displayName} />
              ) : (
                <span>
                  {seenUser?.displayName?.charAt(0)?.toUpperCase() || "✓"}
                </span>
              )}
            </span>
          );
        })}

        {remainCount > 0 && (
          <span className="seen-more-count">+{remainCount}</span>
        )}
      </button>
    );
  }

  return (
    <div
      className="message-list"
      ref={listRef}
      onClick={() => setActiveReactionMessageId(null)}
    >
      {messages.length === 0 && (
        <div className="empty-chat">
          <div>
            <h3>Chưa có tin nhắn</h3>
            <p>Hãy gửi tin nhắn đầu tiên trong nhóm này.</p>
          </div>
        </div>
      )}

      {messages.map((message) => {
        const isMine =
          String(message.sender?._id || message.sender || "") ===
          String(user?._id || "");

        const seen = hasOtherSeen(message, user?._id);
        const reactionGroups = groupReactions(message.reactions || []);
        const isTemp = message.isSending || message.isFailed;

        const messageFiles = getMessageFiles(message);
        const hasFiles = messageFiles.length > 0;

        const showReactionPicker =
          activeReactionMessageId === message._id && !isTemp;

        return (
          <div
            className={`message-row ${isMine ? "mine" : ""}`}
            key={message._id || message.clientTempId}
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

            <div className={`message-stack ${hasFiles ? "media-stack" : ""}`}>
              <div
                className={`message-bubble ${
                  message.isFailed ? "failed" : ""
                } ${hasFiles ? "media-bubble" : ""}`}
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

                    {hasFiles && (
                      <div className="file-message">
                        {renderFilesGrid(
                          message,
                          downloadFile,
                          openImageViewer,
                        )}
                      </div>
                    )}

                    {!isTemp && (
                      <div
                        className={`reaction-area ${
                          showReactionPicker ? "active" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="reaction-toggle-btn"
                          onClick={() =>
                            setActiveReactionMessageId((currentId) =>
                              currentId === message._id ? null : message._id,
                            )
                          }
                          title="Thả cảm xúc"
                        >
                          😊
                        </button>

                        {showReactionPicker && (
                          <div className="reaction-picker">
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(
                              (emoji) => (
                                <button
                                  type="button"
                                  key={emoji}
                                  className="reaction-btn"
                                  onClick={() =>
                                    handleReact(message._id, emoji)
                                  }
                                  title={`Thả ${emoji}`}
                                >
                                  <span className="reaction-emoji">
                                    {emoji}
                                  </span>
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {message.reactions?.length > 0 && (
                      <div className="reaction-summary">
                        {Object.entries(reactionGroups).map(
                          ([emoji, users]) => (
                            <span
                              key={emoji}
                              title={users
                                .map((u) => u?.displayName)
                                .filter(Boolean)
                                .join(", ")}
                            >
                              {emoji} {users.length}
                            </span>
                          ),
                        )}
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

                  {isMine && !message.isRevoked && !isTemp && !seen && (
                    <span className="sent-status">Đã gửi</span>
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

              {isMine && !message.isRevoked && !isTemp && seen && (
                <div className="seen-indicator-row">
                  {renderSeenIndicator(message)}
                </div>
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

            {seenModal.loading && seenModal.seenBy.length === 0 ? (
              <p>Đang cập nhật...</p>
            ) : seenModal.seenBy.length === 0 ? (
              <p>Chưa có ai xem</p>
            ) : (
              <div className="seen-user-list">
                {seenModal.seenBy.map((seen, index) => (
                  <div
                    className="seen-user"
                    key={getUserId(seen.user) || `seen-user-${index}`}
                  >
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

      {imageViewer.open && (
        <div className="chat-image-viewer">
          <div
            className="chat-image-viewer-backdrop"
            onClick={closeImageViewer}
          />

          <button
            type="button"
            className="chat-image-viewer-close"
            onClick={closeImageViewer}
          >
            ✕
          </button>

          {imageViewer.images.length > 1 && (
            <button
              type="button"
              className="chat-image-viewer-prev"
              onClick={showPrevImage}
            >
              ‹
            </button>
          )}

          <img
            className="chat-image-viewer-img"
            src={imageViewer.images[imageViewer.index]}
            alt="Ảnh phóng to"
          />

          {imageViewer.images.length > 1 && (
            <button
              type="button"
              className="chat-image-viewer-next"
              onClick={showNextImage}
            >
              ›
            </button>
          )}

          <div className="chat-image-viewer-count">
            {imageViewer.index + 1} / {imageViewer.images.length}
          </div>
        </div>
      )}
    </div>
  );
}
