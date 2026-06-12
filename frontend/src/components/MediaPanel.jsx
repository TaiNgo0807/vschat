import { useEffect, useState } from "react";
import api, { apiRequest } from "../services/api";

function isImage(mimeType = "") {
  return mimeType.startsWith("image/");
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function groupByDate(items) {
  return items.reduce((result, item) => {
    const dateKey = formatDate(item.createdAt);

    if (!result[dateKey]) {
      result[dateKey] = [];
    }

    result[dateKey].push(item);
    return result;
  }, {});
}

export default function MediaPanel({ selectedGroup, open, onClose }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);

  async function downloadFile(message) {
    try {
      const response = await api.get(`/api/messages/${message._id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: message.file.mimeType || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = message.file.originalName || "vschat-file";
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Không tải được file", error);
    }
  }

  useEffect(() => {
    async function loadMedia() {
      if (!open || !selectedGroup?._id) return;

      try {
        setLoading(true);

        const data = await apiRequest(
          `/api/messages/media?groupId=${selectedGroup._id}`,
        );

        setMedia(data.media || []);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadMedia();
  }, [open, selectedGroup?._id]);

  if (!open) return null;

  const groupedMedia = groupByDate(media);

  return (
    <div className="media-overlay">
      <aside className="media-panel">
        <div className="media-header">
          <div>
            <h3>Ảnh & file đã gửi</h3>
            <p>{selectedGroup?.name}</p>
          </div>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading ? (
          <p className="media-empty">Đang tải...</p>
        ) : media.length === 0 ? (
          <p className="media-empty">Chưa có ảnh/file nào</p>
        ) : (
          <div className="media-body">
            {Object.entries(groupedMedia).map(([date, items]) => (
              <section className="media-date-group" key={date}>
                <h4>{date}</h4>

                <div className="media-grid">
                  {items.map((message) => (
                    <div className="media-card" key={message._id}>
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
                          className="media-file-card"
                          onClick={() => downloadFile(message)}
                        >
                          📎
                          <span>{message.file.originalName}</span>
                        </button>
                      )}

                      <small>
                        {message.sender?.displayName} ·{" "}
                        {new Date(message.createdAt).toLocaleTimeString(
                          "vi-VN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
