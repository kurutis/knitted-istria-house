"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { RefreshIcon } from "@/components/icons/RefreshIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { SendIcon } from "@/components/icons/SendIcon";
import { AttachmentIcon } from "@/components/icons/AttachmentIcon";
import { UserIcon } from "@/components/icons/UserIcon";
import { MailIcon } from "@/components/icons/MailIcon";
import { ChatIcon } from "@/components/icons/ChatIcon";

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
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "admin") {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadTickets();
    }
  }, [filterStatus, searchQuery, session]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages();
      markAsRead();
      if (window.innerWidth < 768) {
        setIsMobileMenuOpen(false);
      }
    }
  }, [selectedTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filterStatus && filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      
      const url = `/api/admin/support/tickets${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
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
      const messagesArray = data.messages || data;
      setMessages(Array.isArray(messagesArray) ? messagesArray : []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Ошибка загрузки сообщений");
      setMessages([]);
    }
  };

  const refreshMessages = async () => {
    if (!selectedTicket) return;
    
    try {
      setRefreshingMessages(true);
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/messages`);
      const data = await response.json();
      const messagesArray = data.messages || data;
      setMessages(Array.isArray(messagesArray) ? messagesArray : []);
      toast.success("Сообщения обновлены");
    } catch (error) {
      console.error("Error refreshing messages:", error);
      toast.error("Ошибка обновления");
    } finally {
      setRefreshingMessages(false);
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
      attachments.forEach((file) => {formData.append("attachments", file);});

      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/messages`, {method: "POST", body: formData});

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
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/status`, {method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })});

      if (response.ok) {
        setSelectedTicket((prev) => prev ? { ...prev, status: status as "open" | "in_progress" | "closed" } : null);
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
      const response = await fetch(`/api/admin/support/tickets/${selectedTicket.id}/priority`, {method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority })});

      if (response.ok) {
        setSelectedTicket((prev) => prev ? { ...prev, priority: priority as "low" | "medium" | "high" } : null);
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
      const response = await fetch(`/api/admin/support/messages/${messageId}`, {method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editingMessageText })});

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
      const response = await fetch(`/api/admin/support/messages/${messageId}`, {method: "DELETE"});

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

    if (diff < 24 * 60 * 60 * 1000) {return date.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit",});}
    return date.toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit"});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-firm-orange/20 text-firm-orange";
      case "in_progress":
        return "bg-firm-pink/20 text-firm-pink";
      case "closed":
        return "bg-firm-green/20 text-firm-green";
      default:
        return "bg-forms text-firm-gray";
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
        return "bg-firm-red/20 text-firm-red";
      case "medium":
        return "bg-firm-orange/20 text-firm-orange";
      case "low":
        return "bg-firm-green/20 text-firm-green";
      default:
        return "bg-forms text-firm-gray";
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-[60vh] bg-main">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray flex items-center justify-center gap-2">Загрузка обращений...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-main min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Поддержка пользователей</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button onClick={refreshTickets} disabled={refreshing} className="px-3 sm:px-4 py-2 bg-forms text-firm-gray rounded-xl hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base">
            {refreshing ? (<><RefreshIcon size={16} color="#737682" className="animate-spin" />Обновление...</>) : (<><RefreshIcon size={16} color="#737682" />Обновить</>)}</button>
          <div className="relative flex-1 sm:flex-initial">
            <SearchIcon size={16} color="#737682" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Поиск..." value={searchQuery}  onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 pl-9 bg-forms text-text rounded-xl focus:outline-none focus:ring-2 focus:ring-firm-orange text-sm sm:text-base" />
          </div>
          <select  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 sm:px-4 py-2 bg-forms text-text rounded-xl focus:outline-none focus:ring-2 focus:ring-firm-pink text-sm sm:text-base cursor-pointer">
            <option value="all">Все</option>
            <option value="open">Открытые</option>
            <option value="in_progress">В работе</option>
            <option value="closed">Закрытые</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-auto md:h-[75vh]">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden w-full p-3 bg-forms rounded-xl flex items-center justify-between"><span className="font-semibold text-text">Список обращений ({tickets.length})</span><span className="text-firm-gray">{isMobileMenuOpen ? "▲" : "▼"}</span></button>

        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block md:w-96 w-full bg-white rounded-2xl shadow-md overflow-hidden flex flex-col`}>
          <div className="p-4 border-b border-gray-200 bg-forms flex justify-between items-center">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text">Обращения ({tickets.length})</h2>
            <button onClick={refreshTickets} disabled={refreshing} className="text-firm-gray hover:text-firm-orange transition" title="Обновить список"><RefreshIcon size={18} color="currentColor" /></button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[50vh] md:max-h-none">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-firm-gray">
                <ChatIcon size={48} color="#737682" className="mx-auto mb-4 opacity-50" />
                <p>Нет обращений</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <button key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`w-full p-3 sm:p-4 text-left hover:bg-forms transition border-b border-gray-100 ${selectedTicket?.id === ticket.id ? "bg-firm-orange/10" : ""}`}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden text-sm">
                      {ticket.user_avatar ? (<img src={ticket.user_avatar} alt="" className="w-full h-full object-cover" />) : (ticket.user_name?.charAt(0).toUpperCase() || "U")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-semibold truncate text-sm sm:text-base text-text">{ticket.user_name || ticket.user_email}</p>
                        <span className="text-xs text-firm-gray shrink-0">{formatMessageTime(ticket.last_message_time || ticket.created_at)}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-firm-gray truncate mb-1">
                        {ticket.subject || "Без темы"}
                      </p>
                      <p className="text-xs text-firm-gray truncate hidden sm:block">
                        {ticket.last_message}
                      </p>
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${getStatusColor(ticket.status)}`}>{getStatusText(ticket.status)}</span>
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>{getPriorityText(ticket.priority)}</span>
                        {ticket.unread_count > 0 && (<span className="px-1.5 sm:px-2 py-0.5 rounded-full text-xs bg-firm-orange text-main">{ticket.unread_count} нов.</span>)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-md flex flex-col h-[60vh] md:h-auto">
          {selectedTicket ? (
            <>
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-forms rounded-t-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden text-sm">
                        {selectedTicket.user_avatar ? (<img src={selectedTicket.user_avatar} alt="" className="w-full h-full object-cover" />) : (selectedTicket.user_name?.charAt(0).toUpperCase() || "U")}
                      </div>
                      <div>
                        <p className="font-['Montserrat_Alternates'] font-semibold text-sm sm:text-base text-text">{selectedTicket.user_name || selectedTicket.user_email}</p>
                        <p className="text-xs text-firm-gray hidden sm:block">ID: {selectedTicket.user_id?.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)}  className="md:hidden p-2 text-firm-gray">← Список</button>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button onClick={refreshMessages} disabled={refreshingMessages} className="p-2 text-firm-gray hover:text-firm-orange transition rounded-lg" title="Обновить сообщения"><RefreshIcon size={18} color="currentColor" className={refreshingMessages ? "animate-spin" : ""} /></button>
                    <select value={selectedTicket.status} onChange={(e) => updateTicketStatus(e.target.value)} className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-forms text-text rounded-xl focus:outline-none focus:ring-2 focus:ring-firm-orange cursor-pointer">
                      <option value="open">Открыт</option>
                      <option value="in_progress">В работе</option>
                      <option value="closed">Закрыт</option>
                    </select>
                    <select value={selectedTicket.priority} onChange={(e) => updateTicketPriority(e.target.value)} className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-forms text-text rounded-xl focus:outline-none focus:ring-2 focus:ring-firm-pink cursor-pointer">
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>
                  </div>
                </div>
                {selectedTicket.subject && (<p className="text-xs sm:text-sm text-firm-gray mt-2">Тема: {selectedTicket.subject}</p>)}
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-main">
                {messages.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="bg-forms rounded-xl p-4 sm:p-6">
                      <ChatIcon size={48} color="#737682" className="mx-auto mb-3 opacity-50" />
                      <p className="text-text mb-2 text-sm sm:text-base">Начните общение с пользователем</p>
                      <p className="text-firm-gray text-xs sm:text-sm">Ответьте на обращение в поле ниже</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isAdmin = message.sender_role === "admin";
                    const showAvatar = !isAdmin && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex gap-1 sm:gap-2 max-w-[85%] sm:max-w-[70%] ${isAdmin ? "flex-row-reverse" : ""}`}>
                          {!isAdmin && showAvatar && (
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                              {message.sender_avatar ? (<img src={message.sender_avatar} alt="" className="w-full h-full object-cover" />) : (message.sender_name?.charAt(0).toUpperCase())}
                            </div>
                          )}
                          {!isAdmin && !showAvatar && <div className="w-6 sm:w-8"></div>}

                          <div className="max-w-[calc(100%-32px)] sm:max-w-none">
                            {editingMessageId === message.id ? (
                              <div className="bg-main rounded-xl p-2 sm:p-3 border-2 border-firm-orange">
                                <textarea value={editingMessageText} onChange={(e) => setEditingMessageText(e.target.value)} className="w-full p-2 rounded-lg bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange text-sm" rows={3} autoFocus />
                                <div className="flex gap-2 mt-2">
                                  <button onClick={() => handleEditMessage(message.id)} className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-lg">Сохранить</button>
                                  <button onClick={() => {setEditingMessageId(null); setEditingMessageText("");}} className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg text-text">Отмена</button>
                                </div>
                              </div>
                            ) : (
                              <div className={`rounded-xl p-2 sm:p-3 text-sm sm:text-base ${isAdmin ? "bg-linear-to-r from-firm-orange to-firm-pink text-main" : "bg-forms text-text"}`}>
                                <p className="wrap-break-words">{message.content}</p>

                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {message.attachments.map((att, idx) =>
                                      att.type === "image" ? (
                                        <img key={idx} src={att.url} alt="attachment" className="max-w-30 sm:max-w-50 max-h-25 sm:max-h-37.5 rounded-lg cursor-pointer" onClick={() => window.open(att.url, "_blank")}  />
                                      ) : (
                                        <video key={idx} src={att.url} controls className="max-w-30 sm:max-w-50 max-h-25 sm:max-h-37.5 rounded-lg" />
                                      )
                                    )}
                                  </div>
                                )}
                                {message.is_edited && (<span className="text-xs opacity-70 mt-1 block">(изменено)</span>)}
                              </div>
                            )}

                            <div className={`flex items-center gap-2 mt-1 ${isAdmin ? "justify-end" : ""}`}>
                              <p className="text-xs text-firm-gray">{formatMessageTime(message.created_at)}</p>
                              {isAdmin && editingMessageId !== message.id && (
                                <div className="flex gap-2">
                                  <button onClick={() => {setEditingMessageId(message.id); setEditingMessageText(message.content) }}className="text-xs text-firm-gray hover:text-firm-orange"><EditIcon size={14} color="currentColor" /></button>
                                  <button onClick={() => handleDeleteMessage(message.id)} className="text-xs text-firm-gray hover:text-firm-red"><DeleteIcon size={14} color="currentColor" /></button>
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

              <div className="p-3 sm:p-4 border-t border-gray-200 bg-main rounded-b-2xl">
                {attachmentPreviews.length > 0 && (
                  <div className="flex gap-2 mb-3 pb-3 border-b border-gray-200 overflow-x-auto">
                    {attachmentPreviews.map((preview, idx) => (
                      <div key={idx} className="relative flex-shrink-0">
                        <img src={preview} alt="preview" className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg" />
                        <button onClick={() => removeAttachment(idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-firm-red text-main rounded-full text-xs flex items-center justify-center hover:bg-red-600"><CloseIcon size={10} color="#f9f9f9" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl bg-forms hover:bg-gray-200 transition shrink-0"><AttachmentIcon size={20} color="#737682" /></button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
                  <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => {if (e.key === "Enter" && !e.shiftKey) {e.preventDefault(); sendMessage();} }} placeholder="Написать сообщение..." rows={1} className="flex-1 p-2 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange resize-none text-sm sm:text-base" style={{ minHeight: "36px", maxHeight: "120px" }}    />
                  <button onClick={sendMessage} disabled={sending || (!messageText.trim() && attachments.length === 0)} className="px-3 sm:px-4 py-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition disabled:opacity-50 shrink-0 text-sm sm:text-base flex items-center gap-2">{sending ? (<RefreshIcon size={16} color="#f9f9f9" className="animate-spin" />) : (<SendIcon size={16} color="#f9f9f9" />)}Отправить</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-firm-gray p-8">
              <div className="text-center">
                <ChatIcon size={64} color="#737682" className="mx-auto mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Выберите обращение для ответа</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}