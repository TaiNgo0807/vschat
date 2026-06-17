import { useEffect, useRef, useState } from "react";

import Navbar from "../components/Navbar";
import OnlineUsers from "../components/OnlineUsers";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import GroupSidebar from "../components/GroupSidebar";
import WelcomeGuide from "../components/WelcomeGuide";
import MediaPanel from "../components/MediaPanel";
import NotificationPermissionModal from "../components/NotificationPermissionModal";
import { showMessageNotification } from "../utils/notification";
import PushPermissionBox from "../components/PushPermissionBox";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { createSocket } from "../services/socket";

export default function ChatPage() {
  const { token, user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketError, setSocketError] = useState("");
  const [sideOpen, setSideOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [showNotificationModal, setShowNotificationModal] = useState(() => {
    return Notification.permission !== "granted";
  });

  const socketRef = useRef(null);
  const selectedGroupRef = useRef(null);
  const seenTimerRef = useRef(null);

  function addLocalMessage(tempMessage) {
    setMessages((prev) => [...prev, tempMessage]);
  }

  function replaceTempMessage(tempId, realMessage) {
    const confirmedMessage = {
      ...realMessage,
      clientTempId: realMessage.clientTempId || tempId,
      isSending: false,
      isFailed: false,
    };

    setMessages((prev) => {
      let replaced = false;

      const next = prev.map((item) => {
        const itemId = String(item._id);
        const itemTempId = String(item.clientTempId || "");
        const realId = String(confirmedMessage._id);
        const realTempId = String(confirmedMessage.clientTempId || "");

        const isSameTemp =
          itemId === String(tempId) ||
          itemTempId === String(tempId) ||
          itemTempId === realTempId;

        const isSameReal = itemId === realId;

        if (isSameTemp || isSameReal) {
          replaced = true;
          return confirmedMessage;
        }

        return item;
      });

      if (!replaced) {
        next.push(confirmedMessage);
      }

      return next.filter((item, index, arr) => {
        return (
          arr.findIndex((x) => String(x._id) === String(item._id)) === index
        );
      });
    });
  }

  function markTempMessageFailed(tempId) {
    setMessages((prev) =>
      prev.map((item) =>
        item._id === tempId || item.clientTempId === tempId
          ? { ...item, isSending: false, isFailed: true }
          : item,
      ),
    );
  }

  function addMessage(newMessage) {
    const confirmedMessage = {
      ...newMessage,
      isSending: false,
      isFailed: false,
    };

    setMessages((prev) => {
      const existedById = prev.some(
        (item) => String(item._id) === String(confirmedMessage._id),
      );

      if (existedById) return prev;

      const clientTempId = confirmedMessage.clientTempId;

      if (clientTempId) {
        const tempIndex = prev.findIndex((item) => {
          return (
            String(item._id) === String(clientTempId) ||
            String(item.clientTempId || "") === String(clientTempId)
          );
        });

        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = confirmedMessage;
          return next;
        }
      }

      return [...prev, confirmedMessage];
    });
  }

  function updateMessage(updatedMessage) {
    setMessages((prev) =>
      prev.map((item) =>
        item._id === updatedMessage._id ? updatedMessage : item,
      ),
    );
  }

  function updateSeenMessages(updatedMessages) {
    setMessages((prev) =>
      prev.map((item) => {
        const found = updatedMessages.find((msg) => msg._id === item._id);
        return found || item;
      }),
    );
  }

  function addGroup(newGroup) {
    setGroups((prev) => {
      const existed = prev.some((item) => item._id === newGroup._id);
      if (existed) return prev;
      return [...prev, newGroup];
    });
  }

  function handleSelectGroup(group) {
    setSelectedGroup(group);
    selectedGroupRef.current = group;
    setMessages([]);
    setSideOpen(false);

    if (socketRef.current) {
      socketRef.current.emit("group:join", group._id);
    }
  }

  async function markUnseenMessagesAsSeen(currentMessages) {
    if (!user?._id) return;

    const unseenMessageIds = currentMessages
      .filter((message) => {
        const isMine = message.sender?._id === user._id;
        const isRevoked = message.isRevoked;

        const alreadySeen = message.seenBy?.some((seen) => {
          const seenUserId = seen.user?._id || seen.user;
          return seenUserId === user._id;
        });

        return !isMine && !isRevoked && !alreadySeen;
      })
      .map((message) => message._id)
      .filter((id) => !String(id).startsWith("temp-"));

    if (unseenMessageIds.length === 0) return;

    clearTimeout(seenTimerRef.current);

    seenTimerRef.current = setTimeout(async () => {
      try {
        await apiRequest("/api/messages/seen", {
          method: "POST",
          data: {
            messageIds: unseenMessageIds,
          },
        });
      } catch (error) {
        console.log("Mark seen error:", error.message);
      }
    }, 800);
  }

  useEffect(() => {
    async function loadGroupsAndUsers() {
      try {
        const cachedGroups = localStorage.getItem("vschat_groups");
        const cachedUsers = localStorage.getItem("vschat_users");

        if (cachedGroups) {
          const parsedGroups = JSON.parse(cachedGroups);
          setGroups(parsedGroups);

          if (parsedGroups.length > 0) {
            setSelectedGroup(parsedGroups[0]);
            selectedGroupRef.current = parsedGroups[0];
          }
        }

        if (cachedUsers) {
          setUsers(JSON.parse(cachedUsers));
        }

        setInitialLoading(!cachedGroups);

        const [groupData, userData] = await Promise.all([
          apiRequest("/api/groups"),
          apiRequest("/api/users"),
        ]);

        const loadedGroups = groupData.groups || [];
        const loadedUsers = userData.users || [];

        setGroups(loadedGroups);
        setUsers(loadedUsers);

        localStorage.setItem("vschat_groups", JSON.stringify(loadedGroups));
        localStorage.setItem("vschat_users", JSON.stringify(loadedUsers));

        if (!selectedGroupRef.current && loadedGroups.length > 0) {
          setSelectedGroup(loadedGroups[0]);
          selectedGroupRef.current = loadedGroups[0];
        }
      } catch (error) {
        alert(error.message);
      } finally {
        setInitialLoading(false);
      }
    }

    loadGroupsAndUsers();
  }, []);

  useEffect(() => {
    async function loadMessagesByGroup() {
      if (!selectedGroup?._id) return;

      try {
        const data = await apiRequest(
          `/api/messages?limit=30&groupId=${selectedGroup._id}`,
        );

        setMessages(data.messages || []);
        markUnseenMessagesAsSeen(data.messages || []);
      } catch (error) {
        alert(error.message);
      }
    }

    loadMessagesByGroup();
  }, [selectedGroup?._id]);

  useEffect(() => {
    if (!token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setSocketError("");

      if (selectedGroupRef.current?._id) {
        socket.emit("group:join", selectedGroupRef.current._id);
      }
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connect error:", err.message);
      setSocketError(err.message);
    });

    socket.on("room:full", (data) => {
      setSocketError(data.message);
    });

    socket.on("users:online", (users) => {
      setOnlineUsers(users);
    });

    socket.on("group:created", (group) => {
      addGroup(group);
      socket.emit("group:join", group._id);
    });

    socket.on("message:reaction", (message) => {
      const messageGroupId = message.group?._id || message.group;
      const currentGroupId = selectedGroupRef.current?._id;

      if (messageGroupId === currentGroupId) {
        updateMessage(message);
      }
    });

    socket.on("message:new", (message) => {
      const messageGroupId = message.group?._id || message.group;
      const currentGroupId = selectedGroupRef.current?._id;

      const isCurrentGroup = messageGroupId === currentGroupId;
      const isMine = message.sender?._id === user?._id;

      if (isCurrentGroup) {
        addMessage(message);
        markUnseenMessagesAsSeen([message]);
      }

      if (!isMine) {
        const senderName = message.sender?.displayName || "VSChat";
        const groupName = message.group?.name || "Nhóm chat";

        const body =
          message.text ||
          (message.file?.mimeType?.startsWith("image/")
            ? "Đã gửi một hình ảnh"
            : message.file
              ? `Đã gửi file: ${message.file.originalName || "Tệp đính kèm"}`
              : "Có tin nhắn mới");

        showMessageNotification({
          title: `${senderName} · ${groupName}`,
          body,
          icon: message.sender?.avatarUrl || "/favicon.ico",
          tag: message._id,
          onClick: () => {
            window.focus();
          },
        });
      }
    });

    socket.on("message:revoked", (message) => {
      const messageGroupId = message.group?._id || message.group;
      const currentGroupId = selectedGroupRef.current?._id;

      if (messageGroupId === currentGroupId) {
        updateMessage(message);
      }
    });

    socket.on("messages:seen", (data) => {
      const currentGroupId = selectedGroupRef.current?._id;

      const messagesInCurrentGroup = (data.messages || []).filter((message) => {
        const messageGroupId = message.group?._id || message.group;
        return messageGroupId === currentGroupId;
      });

      updateSeenMessages(messagesInCurrentGroup);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("room:full");
      socket.off("users:online");
      socket.off("group:created");
      socket.off("message:new");
      socket.off("message:revoked");
      socket.off("messages:seen");
      socket.off("message:reaction");

      clearTimeout(seenTimerRef.current);

      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <div className="chat-page">
      <Navbar />
      {initialLoading && (
        <div className="app-loading">
          <div className="loading-box">
            <strong>Đang tải VSChat...</strong>
            <span>Vui lòng chờ vài giây</span>
          </div>
        </div>
      )}

      {socketError && <div className="socket-error">{socketError}</div>}

      <section className="chat-layout drawer-layout">
        <button
          type="button"
          className="hamburger-btn"
          onClick={() => setSideOpen(true)}
        >
          ☰
        </button>

        {sideOpen && (
          <div className="drawer-backdrop" onClick={() => setSideOpen(false)}>
            <aside className="side-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <h3>VSChat</h3>

                <button
                  type="button"
                  className="drawer-close"
                  onClick={() => setSideOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="drawer-section">
                <GroupSidebar
                  groups={groups}
                  users={users}
                  selectedGroupId={selectedGroup?._id}
                  onSelectGroup={handleSelectGroup}
                  onGroupCreated={(group) => {
                    addGroup(group);
                    handleSelectGroup(group);

                    if (socketRef.current) {
                      socketRef.current.emit("group:join", group._id);
                    }
                  }}
                />
              </div>

              <div className="drawer-section">
                <OnlineUsers users={onlineUsers} />
              </div>
            </aside>
          </div>
        )}

        <main className="chat-panel full-chat-panel">
          <div className="chat-toolbar">
            <div>
              <strong>{selectedGroup?.name || "Đang tải nhóm..."}</strong>
              <small>Online: {onlineUsers.length}/50</small>
            </div>

            <button type="button" onClick={() => setMediaOpen(true)}>
              Ảnh/File
            </button>
          </div>
          <PushPermissionBox />

          <MessageList messages={messages} onMessageUpdated={updateMessage} />

          <MessageInput
            selectedGroup={selectedGroup}
            onLocalMessage={addLocalMessage}
            onMessageConfirmed={replaceTempMessage}
            onMessageFailed={markTempMessageFailed}
          />
        </main>
        <MediaPanel
          selectedGroup={selectedGroup}
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
        />
      </section>
      {showGuide && <WelcomeGuide onClose={() => setShowGuide(false)} />}
      {showNotificationModal && (
        <NotificationPermissionModal
          onDone={() => setShowNotificationModal(false)}
        />
      )}
    </div>
  );
}
