"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BlogPostCard from "@/components/blog/BlogPostCard";
import toast from 'react-hot-toast';
import ConfirmModal from "@/components/ui/ConfirmModal";

import AddProductModal from "@/components/modals/AddProductModal";
import AddPostModal from "@/components/modals/AddPostModal";
import AddClassModal from "@/components/modals/AddClassModal";

import { CartIcon } from "../icons/CartIcon";
import { ProductsIcon } from "../icons/ProductsIcon";
import { BlogIcon } from "../icons/BlogIcon";
import { NotificateIcon } from "../icons/NotificateIcon";
import { ChatIcon } from "../icons/ChatIcon";
import { RefreshIcon } from "../icons/RefreshIcon";
import { CommentIcon } from "../icons/CommentIcon";
import { LocateIcon } from "../icons/LocateIcon";
import { CalendarIcon } from "../icons/CalendarIcon";
import { UserIcon } from "../icons/UserIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { ViewsIcon } from "../icons/ViewsIcon";
import { CatalogPinkIcon } from "../icons/CatalogPinkIcon";
import { EditIcon } from "../icons/EditIcon";
import { ClassesIcon } from "../icons/ClassesIcon";

const FilterIcon = ({ className = "", color = "#242424", size = 20 }: { className?: string; color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 6H20M7 12H17M10 18H14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StarIcon = ({ className = "", color = "#242424", size = 20 }: { className?: string; color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface ApiCommentData {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  author_id?: string;
  author_name: string;
  author_avatar?: string;
}

interface ApiPostData {
  id: string;
  title?: string;
  content?: string;
  excerpt?: string;
  created_at?: string;
  views_count?: number;
  views?: number;
  likes_count?: number;
  comments_count?: number;
  master_id?: string;
  master_name?: string;
  master_avatar?: string;
  author_name?: string;
  author_avatar?: string;
  images?: Array<{ id: string; url?: string; image_url?: string; sort_order: number }> | string[];
  main_image_url?: string;
  is_liked?: boolean;
  comments?: ApiCommentData[];
  status?: string;
  stats?: { comments_count: number; likes_count: number };
}

interface OrderItem {
  id: number;
  product_id: string;
  product_title: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  status: "new" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_status: "pending" | "paid" | "failed";
  created_at: string;
  updated_at?: string;
  buyer_name: string;
  buyer_email: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_address: string;
  shipping_postal_code?: string;
  buyer_comment: string | null;
  tracking_number: string | null;
  total_amount: number;
  items: OrderItem[];
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  images?: Array<{ id: string; url?: string; image_url?: string; sort_order: number }> | string[];
  main_image_url?: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  author_name: string;
  author_avatar?: string;
  master_id: string;
  master_name?: string;
  master_avatar?: string;
  is_liked?: boolean;
  comments?: ApiCommentData[];
}

interface Notification {
  id: string;
  type: "order" | "comment" | "review" | "system";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

interface MasterStats {
  total_orders: number;
  new_orders: number;
  total_products: number;
  total_views: number;
  total_followers: number;
}

interface OrderStats {
  new: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  total: number;
}

interface OrderPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

type CategoryItem = {
  id: number;
  name: string;
  subcategories?: CategoryItem[];
};

const normalizePostForCard = (post: BlogPost) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  excerpt: post.excerpt || post.content?.substring(0, 200) || "",
  images: post.images || [],
  main_image_url: post.main_image_url,
  created_at: post.created_at,
  views_count: post.views_count,
  likes_count: post.likes_count,
  comments_count: post.comments_count,
  author_name: post.author_name,
  author_avatar: post.author_avatar,
  master_id: post.master_id,
  master_name: post.master_name,
  master_avatar: post.master_avatar,
  is_liked: post.is_liked || false,
  comments: (post.comments || []).map((comment) => ({
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    updated_at: comment.updated_at || comment.created_at,
    is_edited: comment.is_edited || false,
    author_id: comment.author_id || "",
    author_name: comment.author_name,
    author_avatar: comment.author_avatar
  }))
});

export default function MasterDashboard({ session }: { session: { user: { id: string; name: string; email: string; role: string } } | null }) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [myPosts, setMyPosts] = useState<BlogPost[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [masterName, setMasterName] = useState("");
  const [masterAvatar, setMasterAvatar] = useState("");
  const [stats, setStats] = useState<MasterStats>({ total_orders: 0, new_orders: 0, total_products: 0, total_views: 0, total_followers: 0 });
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recent" | "my">("recent");

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  // Состояния для заказов
  const [masterOrders, setMasterOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderPage, setOrderPage] = useState(1);
  const [orderPagination, setOrderPagination] = useState<OrderPagination>({ total: 0, page: 1, limit: 20, totalPages: 1, hasMore: false });
  const [orderStats, setOrderStats] = useState<OrderStats>({ new: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, total: 0 });
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<{ [key: string]: string }>({});
  const [showTrackingModal, setShowTrackingModal] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [yarns, setYarns] = useState<{ id: string; name: string; brand: string }[]>([]);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    postId?: string;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' });

  useEffect(() => {
    fetchMasterData();
    fetchMasterOrders();
  }, []);

  useEffect(() => {
    if (showAddProductModal) {
      loadCategories();
      loadYarns();
    }
  }, [showAddProductModal]);

  // Функции для заказов
  const fetchMasterOrders = async (status: string = orderStatusFilter, pageNum: number = orderPage) => {
    try {
      const response = await fetch(`/api/master/orders?status=${status}&page=${pageNum}&limit=20`);
      const data = await response.json();

      if (data.orders) {
        setMasterOrders(data.orders);
        setOrderPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1, hasMore: false });
        if (data.stats) {
          setOrderStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching master orders:', error);
      toast.error('Ошибка загрузки заказов');
    }
  };

  const filterOrdersByStatus = async (status: string) => {
    setOrderStatusFilter(status);
    setOrderPage(1);
    await fetchMasterOrders(status, 1);
  };

  const handleOrderPageChange = (newPage: number) => {
    setOrderPage(newPage);
    fetchMasterOrders(orderStatusFilter, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, tracking?: string) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/master/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, tracking_number: tracking })
      });

      if (response.ok) {
        await fetchMasterOrders(orderStatusFilter, orderPage);
        toast.success(`Статус заказа обновлен на "${getStatusText(newStatus)}"`);
        setShowTrackingModal(null);
        setTrackingNumber(prev => ({ ...prev, [orderId]: '' }));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Ошибка при обновлении статуса');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const fetchMasterData = async () => {
    try {
      setLoading(true);

      if (!session?.user) {
        router.push("/auth/signin?callbackUrl=/master/dashboard");
        return;
      }

      const profileRes = await fetch("/api/master/profile", { credentials: "include" });
      const profileResponse = await profileRes.json();

      const recentPostsRes = await fetch("/api/blog/posts?limit=4", { credentials: "include" });
      const recentPostsData = await recentPostsRes.json();

      let myPostsArray: BlogPost[] = [];
      try {
        const myPostsRes = await fetch("/api/master/blog", { credentials: "include" });
        if (myPostsRes.ok) {
          const myPostsData = await myPostsRes.json();
          if (myPostsData && myPostsData.posts && Array.isArray(myPostsData.posts)) {
            myPostsArray = myPostsData.posts;
          }
        }
      } catch (apiError) {
        console.error("Ошибка при запросе /api/master/blog:", apiError);
        myPostsArray = [];
      }

      let profileData: { fullname?: string; full_name?: string; avatar_url?: string } | null = null;
      if (profileResponse.success && profileResponse.profile) {
        profileData = profileResponse.profile;
      } else {
        profileData = profileResponse;
      }

      const userFullName = profileData?.fullname || profileData?.full_name || session.user.name || session.user.email?.split("@")[0] || "Мастер";
      const userAvatar = profileData?.avatar_url || "";

      setMasterName(userFullName);
      setMasterAvatar(userAvatar);

      let recentPostsArray: BlogPost[] = [];
      if (recentPostsData && recentPostsData.posts && Array.isArray(recentPostsData.posts)) {
        recentPostsArray = recentPostsData.posts.map((post: ApiPostData) => ({
          id: post.id,
          title: post.title || "Без названия",
          content: post.content || "",
          excerpt: post.excerpt || post.content?.substring(0, 200) || "",
          created_at: post.created_at || new Date().toISOString(),
          views_count: post.views_count || post.views || 0,
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          master_id: post.master_id || "",
          author_name: post.author_name || post.master_name || "Мастер",
          author_avatar: post.author_avatar || post.master_avatar,
          images: post.images || [],
          main_image_url: post.main_image_url || "",
          is_liked: post.is_liked || false,
          comments: post.comments || []
        }));
      }
      setRecentPosts(recentPostsArray);

      const formattedMyPosts: BlogPost[] = myPostsArray.map((post: ApiPostData) => ({
        id: post.id,
        title: post.title || "Без названия",
        content: post.content || "",
        excerpt: post.excerpt || post.content?.substring(0, 200) || "",
        created_at: post.created_at || new Date().toISOString(),
        views_count: post.views || post.views_count || 0,
        likes_count: post.stats?.likes_count || post.likes_count || 0,
        comments_count: post.stats?.comments_count || post.comments_count || 0,
        master_id: post.master_id || session.user.id,
        author_name: userFullName,
        author_avatar: userAvatar,
        images: post.images || [],
        main_image_url: post.main_image_url || "",
        is_liked: false,
        comments: post.comments || []
      }));

      setMyPosts(formattedMyPosts);

      setStats({
        total_orders: 0,
        new_orders: 0,
        total_products: 0,
        total_views: 0,
        total_followers: 0
      });
      setOrders([]);
      setNotifications([]);
    } catch (error) {
      console.error("Error fetching master data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/catalog/categories");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    }
  };

  const loadYarns = async () => {
    try {
      const response = await fetch("/api/catalog/yarn");
      const data = await response.json();
      setYarns(data || []);
    } catch (error) {
      console.error("Ошибка загрузки пряжи:", error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/master/notifications/${notificationId}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "processing":
        return "bg-yellow-100 text-yellow-700";
      case "shipped":
        return "bg-purple-100 text-purple-700";
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "🆕 Новый";
      case "processing":
        return "⏳ В обработке";
      case "shipped":
        return "📦 Отправлен";
      case "delivered":
        return "✅ Доставлен";
      case "cancelled":
        return "❌ Отменен";
      default:
        return status;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order":
        return <CartIcon className="w-5 h-5" color="#F97316" size={20} />;
      case "comment":
        return <CommentIcon className="w-5 h-5" color="#F97316" size={20} />;
      case "review":
        return <StarIcon className="w-5 h-5" color="#F97316" size={20} />;
      default:
        return <NotificateIcon className="w-5 h-5" color="#F97316" size={20} />;
    }
  };

  const handleDeletePost = (postId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление поста',
      message: 'Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.',
      type: 'danger',
      postId: postId,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/master/blog/${postId}`, { method: "DELETE" });
          if (response.ok) {
            await fetchMasterData();
            toast.success("Пост удален");
          } else {
            const error = await response.json();
            toast.error(error.error || "Ошибка при удалении поста");
          }
        } catch (error) {
          console.error("Error deleting post:", error);
          toast.error("Ошибка при удалении поста");
        }
      }
    });
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 font-['Montserrat_Alternates'] text-text">Загрузка кабинета мастера...</p>
        </div>
      </motion.div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-main to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 text-main shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                {masterAvatar && (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-main/20 border-2 border-main shrink-0">
                    <Image src={masterAvatar} alt={masterName} width={64} height={64} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h1 className="font-['Montserrat_Alternates'] text-main font-bold text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">
                    Добро пожаловать, {masterName || session?.user?.name || "Мастер"}!
                  </h1>
                  <p className="text-main/80 text-sm sm:text-base">Вот что происходит с вашим магазином сегодня</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/chats" className="relative block">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-main/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-main/30 transition-colors">
                      <ChatIcon className="w-5 h-5 sm:w-6 sm:h-6 text-main" color="#FFFFFF" size={24} />
                    </div>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-10 h-10 sm:w-12 sm:h-12 bg-main/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-main/30 transition-colors">
                    <NotificateIcon className="w-5 h-5 sm:w-6 sm:h-6 text-main" color="#FFFFFF" size={24} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-200 text-main text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-2 w-72 sm:w-80 bg-main rounded-2xl shadow-2xl z-50 border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-linear-to-r from-firm-orange to-firm-pink">
                          <h3 className="font-semibold text-main">Уведомления</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-firm-gray">Нет уведомлений</div>
                          ) : (
                            notifications.map((notif, idx) => (
                              <motion.div key={notif.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-300 ${!notif.is_read ? "bg-linear-to-r from-firm-orange/5 to-firm-pink/5" : ""}`} onClick={() => { markNotificationAsRead(notif.id); if (notif.link) router.push(notif.link); setShowNotifications(false); }}>
                                <div className="flex items-start gap-3">
                                  <span className="text-firm-orange">{getNotificationIcon(notif.type)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{notif.title}</p>
                                    <p className="text-xs text-firm-gray mt-1 line-clamp-2">{notif.message}</p>
                                    <p className="text-xs text-firm-gray mt-2">{new Date(notif.created_at).toLocaleDateString("ru-RU")}</p>
                                  </div>
                                  {!notif.is_read && (<div className="w-2 h-2 bg-firm-orange rounded-full shrink-0 mt-2"></div>)}
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                        <div className="p-3 bg-main text-center">
                          <Link href="/notifications" className="text-sm text-firm-orange hover:underline">Все уведомления</Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            {[
              { label: "Новые заказы", value: orderStats.new, icon: <CartIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#D97C8E" size={32} />, color: "#D97C8E" },
              { label: "Всего заказов", value: orderStats.total, icon: <CartIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#94D06C" size={32} />, color: "#94D06C" },
              { label: "Товаров", value: stats.total_products, icon: <ProductsIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#F4A67F" size={32} />, color: "#F4A67F" },
              { label: "Просмотров", value: stats.total_views, icon: <ViewsIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#D77C7C" size={32} />, color: "#D77C7C" }
            ].map((stat, idx) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} whileHover={{ y: -5 }} className="bg-main rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-firm-gray text-xs sm:text-sm font-['Montserrat_Alternates']">{stat.label}</p>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1`} style={{ color: stat.color }}>{stat.value.toLocaleString()}</p>
                  </div>
                  <div>{stat.icon}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddProductModal(true)} className="px-4 sm:px-6 py-2 sm:py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm sm:text-base">
              <CatalogPinkIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#F9f9f9" size={20} />
              Добавить товар
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddClassModal(true)} className="px-4 sm:px-6 py-2 sm:py-3 bg-firm-pink text-main rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm sm:text-base">
              <ClassesIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#F9f9f9" size={20} />
              Создать мастер-класс
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddPostModal(true)} className="px-4 sm:px-6 py-2 sm:py-3 bg-linear-to-r from-firm-pink to-firm-orange text-main rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm sm:text-base">
              <EditIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FFFFFF" size={20} />
              Написать пост
            </motion.button>
          </motion.div>

          {/* Orders Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-main rounded-xl sm:rounded-2xl shadow-xl mb-6 sm:mb-8 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl flex items-center gap-2">
                  Заказы на мои товары
                  {orderStats.new > 0 && (
                    <span className="bg-firm-red text-main text-xs px-2 py-1 rounded-full">{orderStats.new} новых</span>
                  )}
                </h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <select value={orderStatusFilter} onChange={(e) => filterOrdersByStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm appearance-none bg-main pr-8">
                      <option value="all">Все заказы</option>
                      <option value="new">🆕 Новые</option>
                      <option value="processing">⏳ В обработке</option>
                      <option value="shipped">📦 Отправленные</option>
                      <option value="delivered">✅ Доставленные</option>
                      <option value="cancelled">❌ Отмененные</option>
                    </select>
                    <FilterIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-firm-gray pointer-events-none" />
                  </div>
                  <button onClick={() => fetchMasterOrders(orderStatusFilter, orderPage)} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <RefreshIcon className="w-4 h-4" color="#242424" size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {masterOrders.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-firm-gray">
                  <div className="flex justify-center mb-4">
                    <CartIcon className="w-12 h-12 sm:w-16 sm:h-16 text-firm-gray" color="#737682" size={64} />
                  </div>
                  <p>У вас пока нет заказов на товары</p>
                  <Link href="/catalog" className="text-firm-orange hover:underline mt-2 inline-block">Перейти в каталог →</Link>
                </div>
              ) : (
                masterOrders.map((order, idx) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const isUpdating = updatingOrderId === order.id;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 sm:p-6 hover:bg-gray-50/50 transition-all duration-300"
                    >
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                            <span className="text-xs sm:text-sm text-firm-gray font-mono">№{order.order_number}</span>
                            {order.payment_status === 'paid' ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">✅ Оплачен</span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">⏳ Ожидает оплаты</span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-firm-gray">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#737682" size={14} />
                              {order.buyer_name || order.shipping_full_name || 'Не указан'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-medium">₽</span>
                              {order.total_amount.toLocaleString()} ₽
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#737682" size={14} />
                              {new Date(order.created_at).toLocaleDateString("ru-RU")}
                            </span>
                            <span className="flex items-center gap-1">
                              📦 {order.items?.length || 0} товаров
                            </span>
                          </div>

                          {order.shipping_city && order.shipping_address && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-firm-gray">
                              <LocateIcon className="w-3 h-3 shrink-0" color="#737682" size={14} />
                              <span className="truncate">{order.shipping_city}, {order.shipping_address}</span>
                            </div>
                          )}

                          {order.tracking_number && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                              <span>📮</span>
                              <span>Трек-номер: {order.tracking_number}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto">
                          <button
                            onClick={() => toggleOrderExpand(order.id)}
                            className="px-3 py-2 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-1"
                          >
                            {isExpanded ? 'Свернуть ▲' : 'Подробнее ▼'}
                          </button>

                          <select
                            value={order.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              if (newStatus === 'shipped') {
                                setShowTrackingModal(order.id);
                              } else {
                                updateOrderStatus(order.id, newStatus);
                              }
                            }}
                            disabled={isUpdating}
                            className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:border-firm-orange focus:outline-none disabled:opacity-50"
                          >
                            <option value="new">🆕 Новый</option>
                            <option value="processing">⏳ В обработку</option>
                            <option value="shipped">📦 Отправлен</option>
                            <option value="delivered">✅ Доставлен</option>
                            <option value="cancelled">❌ Отменить</option>
                          </select>

                          {isUpdating && (
                            <div className="flex justify-center items-center">
                              <div className="w-4 h-4 border-2 border-firm-orange border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-gray-100"
                          >
                            <div className="mb-4">
                              <h4 className="font-semibold text-sm mb-2">Товары в заказе:</h4>
                              <div className="space-y-2">
                                {order.items?.map((item, i) => (
                                  <div key={i} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg">
                                    <div className="flex-1">
                                      <span className="font-medium">{item.product_title}</span>
                                      <span className="text-firm-gray ml-2">× {item.quantity} шт.</span>
                                    </div>
                                    <span className="font-semibold text-firm-orange">{item.total.toLocaleString()} ₽</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <h4 className="font-semibold text-sm mb-2">👤 Покупатель</h4>
                                <p className="text-sm">{order.buyer_name || order.shipping_full_name}</p>
                                <p className="text-sm text-firm-gray">{order.buyer_email}</p>
                                <p className="text-sm text-firm-gray">{order.shipping_phone}</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <h4 className="font-semibold text-sm mb-2">📍 Адрес доставки</h4>
                                <p className="text-sm">{order.shipping_city}</p>
                                <p className="text-sm">{order.shipping_address}</p>
                                {order.shipping_postal_code && <p className="text-sm text-firm-gray">{order.shipping_postal_code}</p>}
                              </div>
                            </div>

                            {order.buyer_comment && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <h4 className="font-semibold text-sm mb-2">💬 Комментарий покупателя</h4>
                                <p className="text-sm">{order.buyer_comment}</p>
                              </div>
                            )}

                            <div className="flex justify-end pt-3 border-t border-gray-100">
                              <div className="text-right">
                                <p className="text-sm text-firm-gray">Итого к оплате: <span className="font-bold text-firm-orange text-lg">{order.total_amount.toLocaleString()} ₽</span></p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>

            {orderPagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOrderPageChange(orderPage - 1)}
                    disabled={orderPage <= 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Страница {orderPage} из {orderPagination.totalPages}
                  </span>
                  <button
                    onClick={() => handleOrderPageChange(orderPage + 1)}
                    disabled={orderPage >= orderPagination.totalPages}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Blog Posts Section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-main rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6 border-gray-200 border-b">
              <div className="flex gap-4 sm:gap-6">
                <button onClick={() => setActiveTab("recent")} className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative text-sm sm:text-base ${activeTab === "recent" ? "text-firm-orange" : "text-firm-gray hover:text-text"}`}>
                  Свежие посты
                  {activeTab === "recent" && (<motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-firm-orange to-firm-pink" />)}
                </button>
                <button onClick={() => setActiveTab("my")} className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative text-sm sm:text-base ${activeTab === "my" ? "text-firm-pink" : "text-gray-500 hover:text-text"}`}>
                  Мои посты
                  {activeTab === "my" && (<motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-firm-pink to-firm-orange" />)}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "recent" && (
                <motion.div key="recent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-5 p-4 sm:p-6">
                  {recentPosts.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center text-text">
                      <BlogIcon className="w-12 h-12 mx-auto text-firm-gray mb-3" color="#737682" size={48} />
                      <p>Пока нет постов</p>
                    </div>
                  ) : (
                    recentPosts.map((post) => (
                      <BlogPostCard key={post.id} post={normalizePostForCard(post)} isOwner={true} showComments={showComments === post.id} onEdit={(postId) => router.push(`/master/blog/${postId}/edit`)} onDelete={() => handleDeletePost(post.id)} />
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === "my" && (
                <motion.div key="my" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-5 p-4 sm:p-6">
                  {myPosts.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center text-text">
                      <BlogIcon className="w-12 h-12 mx-auto text-firm-gray mb-3" color="#D1D5DB" size={48} />
                      <p>У вас пока нет постов</p>
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowAddPostModal(true)} className="text-firm-orange hover:underline mt-2 inline-block">Написать первый пост →</motion.button>
                    </div>
                  ) : (
                    myPosts.map((post) => (
                      <BlogPostCard key={post.id} post={normalizePostForCard(post)} isOwner={true} showComments={showComments === post.id} onEdit={(postId) => router.push(`/master/blog/${postId}/edit`)} onDelete={() => handleDeletePost(post.id)} />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AddProductModal isOpen={showAddProductModal} onClose={() => setShowAddProductModal(false)} onSuccess={fetchMasterData} categories={categories} yarns={yarns} />
      <AddPostModal isOpen={showAddPostModal} onClose={() => setShowAddPostModal(false)} onSuccess={fetchMasterData} session={session} />
      <AddClassModal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} onSuccess={fetchMasterData} />

      {/* Tracking Modal */}
      <AnimatePresence>
        {showTrackingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-main rounded-2xl max-w-md w-full p-4 sm:p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl font-semibold">Отправка заказа</h3>
                <button onClick={() => setShowTrackingModal(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <CloseIcon className="w-5 h-5 text-firm-gray" color="#737682" size={20} />
                </button>
              </div>
              <p className="text-firm-gray mb-4 text-sm">Укажите трек-номер для отслеживания посылки</p>
              <input
                type="text"
                value={trackingNumber[showTrackingModal] || ''}
                onChange={(e) => setTrackingNumber(prev => ({ ...prev, [showTrackingModal]: e.target.value }))}
                placeholder="Трек-номер"
                className="w-full p-3 border border-gray-200 rounded-xl mb-4 focus:border-firm-orange focus:outline-none text-sm"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => updateOrderStatus(showTrackingModal, 'shipped', trackingNumber[showTrackingModal])}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-colors text-sm font-medium"
                >
                  Подтвердить отправку
                </button>
                <button
                  onClick={() => setShowTrackingModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}