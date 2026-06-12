import { useState } from "react";
import { apiRequest } from "../services/api";

export default function GroupSidebar({
  groups = [],
  users = [],
  selectedGroupId,
  onSelectGroup,
  onGroupCreated,
}) {
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [creating, setCreating] = useState(false);

  function toggleMember(userId) {
    setMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  async function handleCreateGroup(e) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Nhập tên nhóm");
      return;
    }

    if (memberIds.length === 0) {
      alert("Chọn ít nhất 1 thành viên");
      return;
    }

    try {
      setCreating(true);

      const data = await apiRequest("/api/groups", {
        method: "POST",
        data: {
          name: name.trim(),
          memberIds,
        },
      });

      onGroupCreated(data.group);

      setName("");
      setMemberIds([]);
      setOpenCreate(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside className="group-sidebar">
      <div className="group-header">
        <h3>Nhóm chat</h3>

        <button type="button" onClick={() => setOpenCreate(!openCreate)}>
          +
        </button>
      </div>

      {openCreate && (
        <form className="create-group-box" onSubmit={handleCreateGroup}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên nhóm..."
          />

          <div className="member-picker">
            {users.length === 0 ? (
              <p className="empty-online">Chưa có user khác</p>
            ) : (
              users.map((user) => (
                <label key={user._id} className="member-item">
                  <input
                    type="checkbox"
                    checked={memberIds.includes(user._id)}
                    onChange={() => toggleMember(user._id)}
                  />
                  <span>{user.displayName}</span>
                </label>
              ))
            )}
          </div>

          <button disabled={creating}>
            {creating ? "Đang tạo..." : "Tạo nhóm"}
          </button>
        </form>
      )}

      <div className="group-list">
        {groups.map((group) => (
          <button
            type="button"
            key={group._id}
            className={`group-item ${
              selectedGroupId === group._id ? "active" : ""
            }`}
            onClick={() => onSelectGroup(group)}
          >
            <strong>{group.name}</strong>

            <small>
              {group.isDefault
                ? "Nhóm chung"
                : `${group.members?.length || 0} thành viên`}
            </small>
          </button>
        ))}
      </div>
    </aside>
  );
}
