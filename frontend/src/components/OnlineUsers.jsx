import { useState } from "react";

export default function OnlineUsers({ users }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`online-panel ${open ? "open" : ""}`}>
      <button
        type="button"
        className="online-toggle"
        onClick={() => setOpen(!open)}
      >
        <span>Đang online</span>
        <strong>{users.length}/50</strong>
        <span className="online-arrow">{open ? "▲" : "▼"}</span>
      </button>

      <div className="online-body">
        <h3>Người đang online</h3>

        <div className="online-list">
          {users.length === 0 ? (
            <p className="empty-online">Chưa có ai online</p>
          ) : (
            users.map((user) => (
              <div className="online-user" key={user._id}>
                <div className="small-avatar">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} />
                  ) : (
                    <span>{user.displayName?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <strong>{user.displayName}</strong>
                  <small>@{user.username}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
