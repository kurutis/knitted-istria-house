"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Chat {
  id: string;
  type: "support" | "master" | "buyer";
  participant_id: string;
  participant_name: string;
  participant_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  ticket_status?: "open" | "closed";
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  is_read: boolean;
  is_edited: boolean;
  attachments?: { type: string; url: string }[];
  created_at: string;
}

export default function ChatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/chats");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchChats();
    }
  }, [session]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      markAsRead(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await fetch("/api/chats");
      if (!response.ok) throw new Error("Ошибка загрузки");
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Ошибка загрузки чатов");
    } finally {
      setLoading(false);
    }
  };

  const refreshChats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/chats");
      if (!response.ok) throw new Error("Ошибка загрузки");
      const data = await response.json();
      setChats(data.chats || []);
      toast.success("Чаты обновлены");
    } catch (error) {
      console.error("Error refreshing chats:", error);
      toast.error("Ошибка обновления");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (!response.ok) throw new Error("Ошибка загрузки");
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Ошибка загрузки сообщений");
    }
  };

  const refreshMessages = async () => {
    if (!selectedChat) return;
    
    try {
      setRefreshingMessages(true);
      const response = await fetch(`/api/chats/${selectedChat.id}/messages`);
      if (!response.ok) throw new Error("Ошибка загрузки");
      const data = await response.json();
      setMessages(data.messages || []);
      toast.success("Сообщения обновлены");
    } catch (error) {
      console.error("Error refreshing messages:", error);
      toast.error("Ошибка обновления");
    } finally {
      setRefreshingMessages(false);
    }
  };

  const markAsRead = async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}/read`, { method: "POST" });
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, unread_count: 0 } : chat))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (attachments.length + files.length > 5) {
      toast.error("Можно загрузить не более 5 файлов за раз");
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 20MB`);
        return false;
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`Файл ${file.name} должен быть изображением или видео`);
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!messageText.trim() && attachments.length === 0) || !selectedChat) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("content", messageText);
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages((prev) => [...prev, newMessage]);
        setMessageText("");
        setAttachments([]);
        setAttachmentPreviews([]);
        fetchChats();
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка отправки");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Ошибка отправки сообщения");
    } finally {
      setSending(false);
    }
  };

  const startNewSupportTicket = async () => {
    setCreatingTicket(true);
    try {
      const response = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats((prev) => [newChat, ...prev]);
        setSelectedChat(newChat);
        toast.success("Тикет создан, ожидайте ответа");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка создания тикета");
      }
    } catch (error) {
      console.error("Error creating support ticket:", error);
      toast.error("Ошибка создания тикета");
    } finally {
      setCreatingTicket(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  const supportChat = chats.find((c) => c.type === "support");
  const otherChats = chats.filter((c) => c.type !== "support");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">Сообщения</h1>
        <button
          onClick={refreshChats}
          disabled={refreshing}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              Обновление...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Обновить чаты
            </>
          )}
        </button>
      </div>

      <div className="flex gap-6 h-[70vh]">
        {/* Список чатов */}
        <div className="w-1/3 bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg">Чаты</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {supportChat && (
              <button
                onClick={() => setSelectedChat(supportChat)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition border-b border-gray-100 ${
                  selectedChat?.id === supportChat.id ? "bg-orange-50" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold text-lg">
                  📞
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">Поддержка</p>
                    <span className="text-xs text-gray-400">
                      {supportChat.last_message_time && formatMessageTime(supportChat.last_message_time)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {supportChat.last_message || "Напишите нам"}
                  </p>
                </div>
                {supportChat.unread_count > 0 && (
                  <div className="w-5 h-5 bg-firm-orange rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">{supportChat.unread_count}</span>
                  </div>
                )}
              </button>
            )}

            {otherChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition border-b border-gray-100 ${
                  selectedChat?.id === chat.id ? "bg-orange-50" : ""
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                    {chat.participant_avatar ? (
                      <img src={chat.participant_avatar} alt={chat.participant_name} className="w-full h-full object-cover" />
                    ) : (
                      chat.participant_name?.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{chat.participant_name}</p>
                    <span className="text-xs text-gray-400">{formatMessageTime(chat.last_message_time)}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{chat.last_message}</p>
                </div>
                {chat.unread_count > 0 && (
                  <div className="w-5 h-5 bg-firm-orange rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">{chat.unread_count}</span>
                  </div>
                )}
              </button>
            ))}

            {chats.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p>У вас пока нет чатов</p>
                <button
                  onClick={startNewSupportTicket}
                  disabled={creatingTicket}
                  className="mt-3 px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {creatingTicket ? "Создание..." : "📞 Обратиться в поддержку"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 bg-white rounded-lg shadow-md flex flex-col">
          {selectedChat ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                      {selectedChat.type === "support" ? (
                        "📞"
                      ) : selectedChat.participant_avatar ? (
                        <img src={selectedChat.participant_avatar} alt={selectedChat.participant_name} className="w-full h-full object-cover" />
                      ) : (
                        selectedChat.participant_name?.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-['Montserrat_Alternates'] font-semibold">
                      {selectedChat.type === "support" ? "Служба поддержки" : selectedChat.participant_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={refreshMessages}
                  disabled={refreshingMessages}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-1"
                >
                  {refreshingMessages ? (
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "🔄 Обновить"
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    {selectedChat.type === "support" ? (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <p className="text-gray-600 mb-2">👋 Добро пожаловать в службу поддержки!</p>
                        <p className="text-gray-500 text-sm">Напишите ваше сообщение, и мы поможем вам.</p>
                      </div>
                    ) : (
                      <p className="text-gray-400">Напишите первое сообщение</p>
                    )}
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isMine = message.sender_id === session?.user?.id;
                    const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);

                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`flex gap-2 max-w-[70%] ${isMine ? "flex-row-reverse" : ""}`}>
                          {!isMine && showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                              {message.sender_avatar ? (
                                <img src={message.sender_avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                message.sender_name?.charAt(0).toUpperCase()
                              )}
                            </div>
                          )}
                          {!isMine && !showAvatar && <div className="w-8"></div>}

                          <div>
                            <div className={`rounded-lg p-3 ${isMine ? "bg-firm-orange text-white" : "bg-gray-100 text-gray-700"}`}>
                              <p className="break-words">{message.content}</p>

                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {message.attachments.map((att, idx) =>
                                    att.type === "image" ? (
                                      <img
                                        key={idx}
                                        src={att.url}
                                        alt="attachment"
                                        className="max-w-[200px] max-h-[150px] rounded-lg cursor-pointer"
                                        onClick={() => window.open(att.url, "_blank")}
                                      />
                                    ) : (
                                      <video key={idx} src={att.url} controls className="max-w-[200px] max-h-[150px] rounded-lg" />
                                    )
                                  )}
                                </div>
                              )}

                              {message.is_edited && <span className="text-xs opacity-70 mt-1 block">(изменено)</span>}
                            </div>

                            <div className={`flex items-center gap-2 mt-1 ${isMine ? "justify-end" : ""}`}>
                              <p className="text-xs text-gray-400">{formatMessageTime(message.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200">
                {attachmentPreviews.length > 0 && (
                  <div className="flex gap-2 mb-3 pb-3 border-b">
                    {attachmentPreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                  >
                    📎
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Написать сообщение..."
                    rows={1}
                    className="flex-1 p-2 rounded-lg bg-gray-100 outline-firm-orange resize-none"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || (!messageText.trim() && attachments.length === 0)}
                    className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                  >
                    {sending ? "..." : "Отправить"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>Выберите чат для начала общения</p>
                <button
                  onClick={startNewSupportTicket}
                  disabled={creatingTicket}
                  className="mt-4 px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
                >
                  Создать обращение в поддержку
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}