"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ChatIcon } from "@/components/icons/ChatIcon";
import { RefreshIcon } from "@/components/icons/RefreshIcon";
import { SupportIcon } from "@/components/icons/SupportIcon";
import { SendIcon } from "@/components/icons/SendIcon";
import { AttachmentIcon } from "@/components/icons/AttachmentIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";

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
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  // Состояния для редактирования/удаления
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [updatingMessage, setUpdatingMessage] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; messageId: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      if (isMobile) {
        setShowMobileChat(true);
      }
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

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
      setMessages(data.messages || data || []);
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
      setMessages(data.messages || data || []);
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

  // Функции для редактирования сообщения
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    setUpdatingMessage(true);
    try {
      const response = await fetch(`/api/chats/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });

      if (response.ok) {
        const updatedMessage = await response.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: updatedMessage.content, is_edited: true }
              : msg
          )
        );
        setEditingMessageId(null);
        setEditingMessageText("");
        toast.success("Сообщение изменено");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка редактирования");
      }
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Ошибка редактирования");
    } finally {
      setUpdatingMessage(false);
    }
  };

  // Функция для удаления сообщения
  const handleDeleteMessage = async (messageId: string) => {
    setDeletingMessageId(messageId);
    try {
      const response = await fetch(`/api/chats/messages/${messageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        toast.success("Сообщение удалено");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Ошибка удаления");
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Обработчики для долгого нажатия (мобильная версия)
  const handleTouchStart = (messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      // Показываем контекстное меню
      setContextMenu({
        visible: true,
        x: 0,
        y: 0,
        messageId: messageId,
      });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
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

  const goBackToChats = () => {
    setShowMobileChat(false);
    setSelectedChat(null);
    setEditingMessageId(null);
    closeContextMenu();
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

  const formatChatTime = (dateString: string) => {
    if (!dateString) return "";
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

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || "U";
  };

  // Компонент сообщения (общий для десктопа и мобилки)
  const MessageBubble = ({ message, isMine, showAvatar, index }: { 
    message: Message; 
    isMine: boolean; 
    showAvatar: boolean;
    index: number;
  }) => {
    const isEditing = editingMessageId === message.id;
    const isDeleting = deletingMessageId === message.id;

    if (isEditing) {
      return (
        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
          <div className={`flex gap-2 max-w-[70%] ${isMine ? "flex-row-reverse" : ""}`}>
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1">
              <div className="bg-main rounded-2xl p-3 border-2 border-firm-orange">
                <textarea
                  ref={editInputRef}
                  value={editingMessageText}
                  onChange={(e) => setEditingMessageText(e.target.value)}
                  className="w-full p-2 rounded-xl bg-main border border-gray-200 focus:outline-none focus:ring-2 focus:ring-firm-orange resize-none text-sm"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditingMessageText("");
                    }}
                    className="px-3 py-1 text-sm text-firm-gray hover:text-gray-700 transition"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleEditMessage(message.id, editingMessageText)}
                    disabled={updatingMessage || !editingMessageText.trim()}
                    className="px-3 py-1 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-lg text-sm hover:shadow-lg transition disabled:opacity-50"
                  >
                    {updatingMessage ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
      >
        <div 
          className={`flex gap-2 max-w-[70%] ${isMine ? "flex-row-reverse" : ""}`}
          onTouchStart={() => !isMobile ? null : handleTouchStart(message.id)}
          onTouchEnd={handleTouchEnd}
        >
          {!isMine && showAvatar && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-xs font-bold flex-shrink-0 overflow-hidden">
              {message.sender_avatar ? (
                <img src={message.sender_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(message.sender_name)
              )}
            </div>
          )}
          {!isMine && !showAvatar && <div className="w-8 flex-shrink-0" />}

          <div className="relative group">
            <div className={`rounded-2xl p-3 ${isMine ? "bg-gradient-to-r from-firm-orange to-firm-pink text-main" : "bg-gray-100 text-text"}`}>
              <p className="break-words text-sm">{message.content}</p>

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

            {/* Десктопные кнопки действий (при наведении) */}
            {!isMobile && isMine && (
              <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-main rounded-lg shadow-md p-1">
                <button
                  onClick={() => {
                    setEditingMessageId(message.id);
                    setEditingMessageText(message.content);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <EditIcon size={14} color="#D97C8E" />
                </button>
                <button
                  onClick={() => handleDeleteMessage(message.id)}
                  disabled={isDeleting}
                  className="p-1 hover:bg-gray-100 rounded transition"
                >
                  <DeleteIcon size={14} color="#EF4444" />
                </button>
              </div>
            )}

            <div className={`flex items-center gap-2 mt-1 ${isMine ? "justify-end" : ""}`}>
              <p className="text-xs text-firm-gray">{formatMessageTime(message.created_at)}</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray">Загрузка...</p>
        </div>
      </div>
    );
  }

  const supportChat = chats.find((c) => c.type === "support");
  const otherChats = chats.filter((c) => c.type !== "support");

  // Мобильное контекстное меню
  const contextMenuMessage = contextMenu.messageId ? messages.find(m => m.id === contextMenu.messageId) : null;
  const isContextMenuMine = contextMenuMessage?.sender_id === session?.user?.id;

  // Десктопная версия
  if (!isMobile) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent flex items-center gap-2">
            <ChatIcon size={28} color="#D97C8E" />
            Сообщения
          </h1>
          <motion.button
            onClick={refreshChats}
            disabled={refreshing}
            className="px-4 py-2 bg-main border-2 border-gray-200 text-firm-gray rounded-xl hover:border-firm-orange transition disabled:opacity-50 flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-firm-orange border-t-transparent rounded-full animate-spin" />
                <span>Обновление...</span>
              </>
            ) : (
              <>
                <RefreshIcon />
                <span>Обновить чаты</span>
              </>
            )}
          </motion.button>
        </div>

        <div className="flex gap-6 h-[70vh]">
          {/* Левая колонка - список чатов */}
          <div className="w-1/3 bg-main rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-firm-orange/5 to-firm-pink/5">
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text">Чаты</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Поддержка */}
              {supportChat && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedChat(supportChat)}
                  className={`w-full p-4 flex items-center gap-3 transition-all border-b border-gray-100 ${
                    selectedChat?.id === supportChat.id
                      ? "bg-gradient-to-r from-firm-orange/10 to-firm-pink/10"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center flex-shrink-0">
                    <SupportIcon size={22} color="white" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-semibold text-text truncate">Поддержка</p>
                      <span className="text-xs text-firm-gray flex-shrink-0">
                        {supportChat.last_message_time && formatChatTime(supportChat.last_message_time)}
                      </span>
                    </div>
                    <p className="text-sm text-firm-gray truncate">
                      {supportChat.last_message || "Напишите нам"}
                    </p>
                  </div>
                  {supportChat.unread_count > 0 && (
                    <div className="w-5 h-5 bg-firm-orange rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-main text-xs font-bold">{supportChat.unread_count}</span>
                    </div>
                  )}
                </motion.button>
              )}

              {/* Другие чаты */}
              {otherChats.map((chat, idx) => (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-4 flex items-center gap-3 transition-all border-b border-gray-100 ${
                    selectedChat?.id === chat.id
                      ? "bg-gradient-to-r from-firm-orange/10 to-firm-pink/10"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold overflow-hidden flex-shrink-0">
                    {chat.participant_avatar ? (
                      <img src={chat.participant_avatar} alt={chat.participant_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{getInitials(chat.participant_name)}</span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <p className="font-semibold text-text truncate">{chat.participant_name}</p>
                      <span className="text-xs text-firm-gray flex-shrink-0">{formatChatTime(chat.last_message_time)}</span>
                    </div>
                    <p className="text-sm text-firm-gray truncate">{chat.last_message}</p>
                  </div>
                  {chat.unread_count > 0 && (
                    <div className="w-5 h-5 bg-firm-orange rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-main text-xs font-bold">{chat.unread_count}</span>
                    </div>
                  )}
                </motion.button>
              ))}

              {chats.length === 0 && (
                <div className="p-8 text-center">
                  <ChatIcon size={48} color="#D4D4D4" className="mx-auto mb-3" />
                  <p className="text-firm-gray mb-4">У вас пока нет чатов</p>
                  <motion.button
                    onClick={startNewSupportTicket}
                    disabled={creatingTicket}
                    className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2 mx-auto"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <PlusIcon size={16} />
                    {creatingTicket ? "Создание..." : "Обратиться в поддержку"}
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка - сообщения */}
          <div className="flex-1 bg-main rounded-2xl shadow-lg border border-gray-100 flex flex-col">
            {selectedChat ? (
              <>
                {/* Header чата */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-firm-orange/5 to-firm-pink/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center flex-shrink-0">
                      {selectedChat.type === "support" ? (
                        <SupportIcon size={20} color="white" />
                      ) : (
                        <span className="text-main font-bold text-base">
                          {getInitials(selectedChat.participant_name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-['Montserrat_Alternates'] font-semibold text-text truncate">
                        {selectedChat.type === "support" ? "Служба поддержки" : selectedChat.participant_name}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={refreshMessages}
                    disabled={refreshingMessages}
                    className="px-3 py-1 text-sm bg-main border border-gray-200 text-firm-gray rounded-lg hover:border-firm-orange transition disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {refreshingMessages ? (
                      <div className="w-4 h-4 border-2 border-firm-orange border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RefreshIcon size={14} />
                    )}
                    <span className="hidden sm:inline">Обновить</span>
                  </motion.button>
                </div>

                {/* Список сообщений */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      {selectedChat.type === "support" ? (
                        <div className="bg-gray-50 rounded-2xl p-6">
                          <SupportIcon size={48} color="#D97C8E" className="mx-auto mb-3" />
                          <p className="text-text mb-2">Добро пожаловать в службу поддержки!</p>
                          <p className="text-firm-gray text-sm">Напишите ваше сообщение, и мы поможем вам.</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <ChatIcon size={48} color="#D4D4D4" className="mx-auto mb-3" />
                          <p className="text-firm-gray">Напишите первое сообщение</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const isMine = message.sender_id === session?.user?.id;
                      const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);
                      return (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isMine={isMine}
                          showAvatar={showAvatar}
                          index={index}
                        />
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="p-4 border-t border-gray-200">
                  {attachmentPreviews.length > 0 && (
                    <div className="flex gap-2 mb-3 pb-3 border-b overflow-x-auto">
                      {attachmentPreviews.map((preview, idx) => (
                        <div key={idx} className="relative flex-shrink-0">
                          <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-lg" />
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-firm-red text-main rounded-full text-xs flex items-center justify-center"
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
                      className="p-2 rounded-xl bg-main border-2 border-gray-200 hover:border-firm-orange transition flex-shrink-0 flex items-center justify-center w-10 h-10"
                    >
                      <AttachmentIcon size={18} color="#6B7280" />
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
                      className="flex-1 p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all resize-none text-sm"
                      style={{ minHeight: "44px", maxHeight: "120px" }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || (!messageText.trim() && attachments.length === 0)}
                      className="px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition disabled:opacity-50 flex-shrink-0"
                    >
                      {sending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <SendIcon />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ChatIcon size={64} color="#D4D4D4" className="mx-auto mb-4" />
                  <p className="text-firm-gray mb-4">Выберите чат для начала общения</p>
                  <button
                    onClick={startNewSupportTicket}
                    disabled={creatingTicket}
                    className="px-5 py-2.5 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition flex items-center gap-2 mx-auto"
                  >
                    <PlusIcon size={16} />
                    {creatingTicket ? "Создание..." : "Создать обращение в поддержку"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Мобильная версия
  return (
    <div className="min-h-screen bg-main">
      <div className="px-4">
        <AnimatePresence mode="wait">
          {!showMobileChat ? (
            // Список чатов (мобильный)
            <motion.div
              key="chats-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent flex items-center gap-2">
                  <ChatIcon size={24} color="#D97C8E" />
                  Сообщения
                </h1>
                <button
                  onClick={refreshChats}
                  disabled={refreshing}
                  className="p-2 bg-main border-2 border-gray-200 rounded-xl"
                >
                  <RefreshIcon size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {supportChat && (
                  <button                    onClick={() => setSelectedChat(supportChat)}
                    className="w-full p-4 bg-main rounded-2xl shadow-md border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center flex-shrink-0">
                      <SupportIcon size={22} color="white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <p className="font-semibold text-text truncate">Поддержка</p>
                        <span className="text-xs text-firm-gray flex-shrink-0">
                          {supportChat.last_message_time && formatChatTime(supportChat.last_message_time)}
                        </span>
                      </div>
                      <p className="text-sm text-firm-gray truncate">
                        {supportChat.last_message || "Напишите нам"}
                      </p>
                    </div>
                    {supportChat.unread_count > 0 && (
                      <div className="w-5 h-5 bg-firm-orange rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-main text-xs font-bold">{supportChat.unread_count}</span>
                      </div>
                    )}
                  </button>
                )}

                {otherChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className="w-full p-4 bg-main rounded-2xl shadow-md border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold overflow-hidden flex-shrink-0">
                      {chat.participant_avatar ? (
                        <img src={chat.participant_avatar} alt={chat.participant_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{getInitials(chat.participant_name)}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <p className="font-semibold text-text truncate">{chat.participant_name}</p>
                        <span className="text-xs text-firm-gray flex-shrink-0">{formatChatTime(chat.last_message_time)}</span>
                      </div>
                      <p className="text-sm text-firm-gray truncate">{chat.last_message}</p>
                    </div>
                    {chat.unread_count > 0 && (
                      <div className="w-5 h-5 bg-firm-orange rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-main text-xs font-bold">{chat.unread_count}</span>
                      </div>
                    )}
                  </button>
                ))}

                {chats.length === 0 && (
                  <div className="text-center py-12">
                    <ChatIcon size={48} color="#D4D4D4" className="mx-auto mb-3" />
                    <p className="text-firm-gray mb-4">У вас пока нет чатов</p>
                    <button
                      onClick={startNewSupportTicket}
                      disabled={creatingTicket}
                      className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition flex items-center gap-2 mx-auto"
                    >
                      <PlusIcon size={16} />
                      {creatingTicket ? "Создание..." : "Обратиться в поддержку"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // Область сообщений (мобильная)
            <motion.div
              key="chat-messages"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <button
                  onClick={goBackToChats}
                  className="p-2 -ml-2"
                >
                  <ArrowLeftIcon size={24} color="#D97C8E" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center flex-shrink-0">
                  {selectedChat?.type === "support" ? (
                    <SupportIcon size={20} color="white" />
                  ) : (
                    <span className="text-main font-bold text-base">
                      {getInitials(selectedChat?.participant_name || "")}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['Montserrat_Alternates'] font-semibold text-text truncate">
                    {selectedChat?.type === "support" ? "Служба поддержки" : selectedChat?.participant_name}
                  </p>
                </div>
                <button
                  onClick={refreshMessages}
                  disabled={refreshingMessages}
                  className="p-2 bg-main border border-gray-200 rounded-xl flex-shrink-0"
                >
                  <RefreshIcon size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    {selectedChat?.type === "support" ? (
                      <div className="bg-gray-50 rounded-2xl p-6">
                        <SupportIcon size={48} color="#D97C8E" className="mx-auto mb-3" />
                        <p className="text-text mb-2">Добро пожаловать в службу поддержки!</p>
                        <p className="text-firm-gray text-sm">Напишите ваше сообщение, и мы поможем вам.</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ChatIcon size={48} color="#D4D4D4" className="mx-auto mb-3" />
                        <p className="text-firm-gray">Напишите первое сообщение</p>
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isMine = message.sender_id === session?.user?.id;
                    const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isMine={isMine}
                        showAvatar={showAvatar}
                        index={index}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="pt-4 border-t border-gray-200">
                {attachmentPreviews.length > 0 && (
                  <div className="flex gap-2 mb-3 pb-3 border-b overflow-x-auto">
                    {attachmentPreviews.map((preview, idx) => (
                      <div key={idx} className="relative flex-shrink-0">
                        <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-lg" />
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-firm-red text-main rounded-full text-xs flex items-center justify-center"
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
                    className="p-2 rounded-xl bg-main border-2 border-gray-200 flex-shrink-0 flex items-center justify-center w-10 h-10"
                  >
                    <AttachmentIcon size={18} color="#6B7280" />
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
                    className="flex-1 p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all resize-none text-sm"
                    style={{ minHeight: "44px", maxHeight: "100px" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || (!messageText.trim() && attachments.length === 0)}
                    className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition disabled:opacity-50 flex-shrink-0"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SendIcon size={18} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Мобильное контекстное меню для сообщений */}
      <AnimatePresence>
        {contextMenu.visible && isContextMenuMine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={closeContextMenu}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 bg-main rounded-2xl shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (contextMenu.messageId) {
                      const message = messages.find(m => m.id === contextMenu.messageId);
                      if (message) {
                        setEditingMessageId(message.id);
                        setEditingMessageText(message.content);
                      }
                      closeContextMenu();
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                >
                  <EditIcon size={20} color="#D97C8E" />
                  <span className="text-text">Редактировать</span>
                </button>
                <button
                  onClick={() => {
                    if (contextMenu.messageId) {
                      handleDeleteMessage(contextMenu.messageId);
                      closeContextMenu();
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition"
                >
                  <DeleteIcon size={20} color="#EF4444" />
                  <span className="text-firm-red">Удалить</span>
                </button>
              </div>
              <button
                onClick={closeContextMenu}
                className="w-full mt-2 p-3 text-center text-firm-gray hover:bg-gray-50 rounded-xl transition"
              >
                Отмена
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}