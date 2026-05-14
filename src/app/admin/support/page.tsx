"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

interface SupportTicket {
  id: string;
  chat_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  subject: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high";
  category: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  sender_role: string;
  content: string;
  is_read: boolean;
  is_edited: boolean;
  attachments?: { type: string; url: string }[];
  created_at: string;
}

export default function AdminSupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Проверка прав доступа
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "admin") {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Загрузка тикетов при изменении фильтров
  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadTickets();
    }
  }, [filterStatus, searchQuery, session]);

  // Загрузка сообщений при выборе тикета
  useEffect(() => {
    if (selectedTicket) {
      loadMessages();
      markAsRead();
    }
  }, [selectedTicket]);

  // Скролл к последнему сообщению
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTickets = async () => {
    try {
        setLoading(true);
        const params = new URLSearchParams();
        
        // Исправлено: проверяем, что параметры имеют допустимые значения
        if (filterStatus && filterStatus !== 'all') {
            params.append('status', filterStatus);
        }
        if (searchQuery && searchQuery.trim()) {
            params.append('search', searchQuery.trim());
        }
        
        // Добавляем limit и page всегда
        params.append('limit', '20');
        params.append('page', '1');
        
        const response = await fetch(`/api/admin/support/tickets?${params.toString()}`);
        const data = await response.json();
        
        if (response.ok) {
            setTickets(data.tickets || []);
        } else {
            console.error('API error:', data);
            toast.error(data.error || 'Ошибка загрузки обращений');
        }
    } catch (error) {
        console.error("Error loading tickets:", error);
        toast.error("Ошибка загрузки обращений");
    } finally {
        setLoading(false);
    }
};

  const refreshTickets = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/admin/support/tickets?${params}`);
      const data = await response.json();
      setTickets(data.tickets || []);
      toast.success("Список обращений обновлён");
    } catch (error) {
      console.error("Error refreshing tickets:", error);
      toast.error("Ошибка обновления");
    } finally {
      setRefreshing(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedTicket) return;

    try {
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/messages`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Ошибка загрузки сообщений");
    }
  };

  const refreshMessages = async () => {
    if (!selectedTicket) return;

    try {
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/messages`);
      const data = await response.json();
      setMessages(data);
      toast.success("Сообщения обновлены");
    } catch (error) {
      console.error("Error refreshing messages:", error);
      toast.error("Ошибка обновления");
    }
  };

  const markAsRead = async () => {
    if (!selectedTicket) return;

    try {
      await fetch(`/api/admin/support/tickets/${selectedTicket.id}/read`, { method: "POST" });
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, unread_count: 0 } : t))
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
    if ((!messageText.trim() && attachments.length === 0) || !selectedTicket) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("content", messageText);
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages((prev) => [...prev, newMessage]);
        setMessageText("");
        setAttachments([]);
        setAttachmentPreviews([]);
        loadTickets();
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

  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;

    try {
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setSelectedTicket((prev) =>
          prev ? { ...prev, status: status as "open" | "in_progress" | "closed" } : null
        );
        loadTickets();
        toast.success(`Статус изменён на "${getStatusText(status)}"`);
      }
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Ошибка обновления статуса");
    }
  };

  const updateTicketPriority = async (priority: string) => {
    if (!selectedTicket) return;

    try {
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/priority`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });

      if (response.ok) {
        setSelectedTicket((prev) =>
          prev ? { ...prev, priority: priority as "low" | "medium" | "high" } : null
        );
        toast.success(`Приоритет изменён на "${getPriorityText(priority)}"`);
      }
    } catch (error) {
      console.error("Error updating ticket priority:", error);
      toast.error("Ошибка обновления приоритета");
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingMessageText.trim()) return;

    try {
      const response = await fetch(`/api/admin/support/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingMessageText }),
      });

      if (response.ok) {
        const updatedMessage = await response.json();
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updatedMessage : m)));
        setEditingMessageId(null);
        setEditingMessageText("");
        toast.success("Сообщение изменено");
      }
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Ошибка редактирования");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Удалить сообщение?")) return;

    try {
      const response = await fetch(`/api/admin/support/messages/${messageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        toast.success("Сообщение удалено");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Ошибка удаления");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Открыт";
      case "in_progress":
        return "В работе";
      case "closed":
        return "Закрыт";
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return "Высокий";
      case "medium":
        return "Средний";
      case "low":
        return "Низкий";
      default:
        return priority;
    }
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка обращений...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">
          Поддержка пользователей
        </h1>
        <div className="flex gap-3">
          <button
            onClick={refreshTickets}
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
                Обновить
              </>
            )}
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск по обращениям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 pl-9 border border-gray-300 rounded-lg focus:outline-none focus:border-firm-orange"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-firm-orange"
          >
            <option value="all">Все обращения</option>
            <option value="open">Открытые</option>
            <option value="in_progress">В работе</option>
            <option value="closed">Закрытые</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6 h-[75vh]">
        {/* Список тикетов */}
        <div className="w-96 bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg">
              Обращения ({tickets.length})
            </h2>
            <button
              onClick={refreshTickets}
              disabled={refreshing}
              className="text-gray-400 hover:text-gray-600 transition"
              title="Обновить список"
            >
              🔄
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Нет обращений</div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition border-b border-gray-100 ${
                    selectedTicket?.id === ticket.id ? "bg-orange-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                      {ticket.user_avatar ? (
                        <img src={ticket.user_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        ticket.user_name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold truncate">{ticket.user_name || ticket.user_email}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatMessageTime(ticket.last_message_time || ticket.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mb-1">{ticket.subject || "Без темы"}</p>
                      <p className="text-xs text-gray-500 truncate">{ticket.last_message}</p>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                          {getStatusText(ticket.status)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                          {getPriorityText(ticket.priority)}
                        </span>
                        {ticket.unread_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-firm-orange text-white">
                            {ticket.unread_count} нов.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 bg-white rounded-lg shadow-md flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                      {selectedTicket.user_avatar ? (
                        <img src={selectedTicket.user_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedTicket.user_name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <div>
                      <p className="font-['Montserrat_Alternates'] font-semibold">
                        {selectedTicket.user_name || selectedTicket.user_email}
                      </p>
                      <p className="text-xs text-gray-400">
                        ID: {selectedTicket.user_id} • Создано:{" "}
                        {new Date(selectedTicket.created_at).toLocaleString("ru-RU")}
                      </p>
                      {selectedTicket.subject && (
                        <p className="text-sm text-gray-600 mt-1">Тема: {selectedTicket.subject}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={refreshMessages}
                      className="p-2 text-gray-400 hover:text-gray-600 transition rounded-lg"
                      title="Обновить сообщения"
                    >
                      🔄
                    </button>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => updateTicketStatus(e.target.value)}
                      className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:border-firm-orange"
                    >
                      <option value="open">Открыт</option>
                      <option value="in_progress">В работе</option>
                      <option value="closed">Закрыт</option>
                    </select>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => updateTicketPriority(e.target.value)}
                      className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:border-firm-orange"
                    >
                      <option value="low">Низкий приоритет</option>
                      <option value="medium">Средний приоритет</option>
                      <option value="high">Высокий приоритет</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <p className="text-gray-600 mb-2">👋 Начните общение с пользователем</p>
                      <p className="text-gray-500 text-sm">Ответьте на обращение в поле ниже</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isAdmin = message.sender_role === "admin";
                    const showAvatar =
                      !isAdmin &&
                      (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-2 max-w-[70%] ${isAdmin ? "flex-row-reverse" : ""}`}>
                          {!isAdmin && showAvatar && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                              {message.sender_avatar ? (
                                <img src={message.sender_avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                message.sender_name?.charAt(0).toUpperCase()
                              )}
                            </div>
                          )}
                          {!isAdmin && !showAvatar && <div className="w-8"></div>}

                          <div>
                            {editingMessageId === message.id ? (
                              <div className="bg-white rounded-lg p-3 border border-firm-orange">
                                <textarea
                                  value={editingMessageText}
                                  onChange={(e) => setEditingMessageText(e.target.value)}
                                  className="w-full p-2 rounded-lg bg-gray-50 outline-firm-orange"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleEditMessage(message.id)}
                                    className="px-3 py-1 text-sm bg-firm-orange text-white rounded-lg"
                                  >
                                    Сохранить
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditingMessageText("");
                                    }}
                                    className="px-3 py-1 text-sm border rounded-lg"
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`rounded-lg p-3 ${isAdmin ? "bg-firm-orange text-white" : "bg-gray-100 text-gray-700"}`}
                              >
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
                                        <video
                                          key={idx}
                                          src={att.url}
                                          controls
                                          className="max-w-[200px] max-h-[150px] rounded-lg"
                                        />
                                      )
                                    )}
                                  </div>
                                )}
                                {message.is_edited && (
                                  <span className="text-xs opacity-70 mt-1 block">(изменено)</span>
                                )}
                              </div>
                            )}

                            <div className={`flex items-center gap-2 mt-1 ${isAdmin ? "justify-end" : ""}`}>
                              <p className="text-xs text-gray-400">{formatMessageTime(message.created_at)}</p>
                              {isAdmin && editingMessageId !== message.id && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(message.id);
                                      setEditingMessageText(message.content);
                                    }}
                                    className="text-xs text-gray-400 hover:text-blue-500"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-xs text-gray-400 hover:text-red-500"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636L9.172 14.828m0 0l-2.828-2.828m2.828 2.828l2.828 2.828M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Выберите обращение для ответа</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}