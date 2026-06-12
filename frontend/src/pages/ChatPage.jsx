import { useEffect, useRef, useState } from "react";

import Navbar from "../components/Navbar";
import OnlineUsers from "../components/OnlineUsers";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import GroupSidebar from "../components/GroupSidebar";
import WelcomeGuide from "../components/WelcomeGuide";

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

  const socketRef = useRef(null);
  const selectedGroupRef = useRef(null);

  function addMessage(newMessage) {
    setMessages((prev) => {
      const existed = prev.some((item) => item._id === newMessage._id);
      if (existed) return prev;
      return [...prev, newMessage];
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
      .map((message) => message._id);

    if (unseenMessageIds.length === 0) return;

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
  }

  useEffect(() => {
    async function loadGroupsAndUsers() {
      try {
        const groupData = await apiRequest("/api/groups");
        const userData = await apiRequest("/api/users");

        const loadedGroups = groupData.groups || [];

        setGroups(loadedGroups);
        setUsers(userData.users || []);

        if (loadedGroups.length > 0) {
          setSelectedGroup(loadedGroups[0]);
          selectedGroupRef.current = loadedGroups[0];
        }
      } catch (error) {
        alert(error.message);
      }
    }

    loadGroupsAndUsers();
  }, []);

  useEffect(() => {
    async function loadMessagesByGroup() {
      if (!selectedGroup?._id) return;

      try {
        const data = await apiRequest(
          `/api/messages?limit=50&groupId=${selectedGroup._id}`,
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

      if (messageGroupId === currentGroupId) {
        addMessage(message);
        markUnseenMessagesAsSeen([message]);
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
      updateSeenMessages(data.messages || []);
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

      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <div className="chat-page">
      <Navbar />

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
              <strong>{selectedGroup?.name || "Chưa chọn nhóm"}</strong>
              <small>Online: {onlineUsers.length}/50</small>
            </div>
          </div>

          <MessageList messages={messages} onMessageUpdated={updateMessage} />

          <MessageInput
            selectedGroup={selectedGroup}
            onMessageCreated={addMessage}
          />
        </main>
      </section>
      {showGuide && <WelcomeGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
