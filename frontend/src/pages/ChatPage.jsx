import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import OnlineUsers from "../components/OnlineUsers";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { createSocket } from "../services/socket";

export default function ChatPage() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socketError, setSocketError] = useState("");
  const socketRef = useRef(null);

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

  async function markUnseenMessagesAsSeen(currentMessages) {
    if (!user?._id) return;

    const unseenMessageIds = currentMessages
      .filter((message) => {
        const isMine = message.sender?._id === user._id;
        const isRevoked = message.isRevoked;
        const alreadySeen = message.seenBy?.some(
          (seen) => seen.user?._id === user._id || seen.user === user._id,
        );

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
    async function loadMessages() {
      try {
        const data = await apiRequest("/api/messages?limit=50");
        setMessages(data.messages || []);
        markUnseenMessagesAsSeen(data.messages || []);
      } catch (error) {
        alert(error.message);
      }
    }

    loadMessages();
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setSocketError("");
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

    socket.on("message:new", (message) => {
      addMessage(message);
      markUnseenMessagesAsSeen([message]);
    });

    socket.on("message:revoked", (message) => {
      updateMessage(message);
    });

    socket.on("messages:seen", (data) => {
      updateSeenMessages(data.messages || []);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <div className="chat-page">
      <Navbar />

      {socketError && <div className="socket-error">{socketError}</div>}

      <section className="chat-layout">
        <OnlineUsers users={onlineUsers} />

        <main className="chat-panel">
          <MessageList messages={messages} onMessageUpdated={updateMessage} />
          <MessageInput onMessageCreated={addMessage} />
        </main>
      </section>
    </div>
  );
}
