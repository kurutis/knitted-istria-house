"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Импорт компонентов модальных окон
import AddProductModal from "@/components/modals/AddProductModal";
import AddPostModal from "@/components/modals/AddPostModal";
import AddClassModal from "@/components/modals/AddClassModal";

// Импорт остальных компонентов
import { AnimatedButton } from "@/components/ui/AnimatedButton";

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
  comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    author_name: string;
    author_avatar?: string;
  }>;
  status?: string;
  stats?: {
    comments_count: number;
    likes_count: number;
  };
}

interface Order {
  id: string;
  order_number: string;
  status: "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  product_title: string;
  buyer_name: string;
  total_amount: number;
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
  comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    author_name: string;
    author_avatar?: string;
  }>;
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

type CategoryItem = {
  id: number;
  name: string;
  subcategories?: CategoryItem[];
};

// Вспомогательная функция для получения URL изображения
const getImageUrl = (img: string | { id: string; url?: string; image_url?: string; sort_order: number }): string => {
  if (typeof img === 'string') {
    return img;
  }
  return img.url || img.image_url || '';
};

export default function MasterDashboard({
  session,
}: {
  session: {
    user: { id: string; name: string; email: string; role: string };
  } | null;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [myPosts, setMyPosts] = useState<BlogPost[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [masterName, setMasterName] = useState("");
  const [stats, setStats] = useState<MasterStats>({
    total_orders: 0,
    new_orders: 0,
    total_products: 0,
    total_views: 0,
    total_followers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"recent" | "my">("recent");
  
  // Состояния для модальных окон
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  
  // Данные для модальных окон
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [yarns, setYarns] = useState<{ id: string; name: string; brand: string }[]>([]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (showAddProductModal) {
      loadCategories();
      loadYarns();
    }
  }, [showAddProductModal]);

  const fetchMasterData = async () => {
  try {
    setLoading(true);

    const [
      ordersRes,
      recentPostsRes,
      myPostsRes,
      notifRes,
      statsRes,
      profileRes,
    ] = await Promise.all([
      fetch("/api/master/orders"),
      fetch("/api/blog/posts?limit=4"),
      fetch("/api/master/blog"),
      fetch("/api/master/notifications"),
      fetch("/api/master/stats"),
      fetch("/api/master/profile"),
    ]);

    const ordersData = await ordersRes.json();
    const recentPostsData = await recentPostsRes.json();
    const myPostsData = await myPostsRes.json();
    const notifData = await notifRes.json();
    const statsData = await statsRes.json();
    const profileResponse = await profileRes.json();

    setOrders(Array.isArray(ordersData) ? ordersData : []);

    // ========== ОТЛАДКА ==========
    console.log("=== МОИ ПОСТЫ API ===");
    console.log("myPostsData:", myPostsData);
    console.log("myPostsData.posts:", myPostsData?.posts);
    if (myPostsData?.posts && myPostsData.posts[0]) {
      console.log("Первый пост из API:", myPostsData.posts[0]);
      console.log("images:", myPostsData.posts[0].images);
      console.log("main_image_url:", myPostsData.posts[0].main_image_url);
    }
    // ========== КОНЕЦ ОТЛАДКИ ==========

    // ========== ОБРАБОТКА СВЕЖИХ ПОСТОВ ==========
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
        comments: post.comments || [],
      }));
    } else if (Array.isArray(recentPostsData)) {
      recentPostsArray = recentPostsData.map((post: ApiPostData) => ({
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
        comments: post.comments || [],
      }));
    }
    setRecentPosts(recentPostsArray);

    // ========== ОБРАБОТКА МОИХ ПОСТОВ ==========
    let myPostsArray: BlogPost[] = [];
    
    if (myPostsData && myPostsData.posts && Array.isArray(myPostsData.posts)) {
      myPostsArray = myPostsData.posts.map((post: ApiPostData) => ({
        id: post.id,
        title: post.title || "Без названия",
        content: post.content || "",
        excerpt: post.excerpt || post.content?.substring(0, 200) || "",
        created_at: post.created_at || new Date().toISOString(),
        views_count: post.views || post.views_count || 0,
        likes_count: post.stats?.likes_count || post.likes_count || 0,
        comments_count: post.stats?.comments_count || post.comments_count || 0,
        master_id: post.master_id || session?.user?.id || "",
        author_name: post.author_name || session?.user?.name || "Мастер",
        author_avatar: post.author_avatar || "",
        images: post.images || [],
        main_image_url: post.main_image_url || "",
        is_liked: false,
        comments: [],
      }));
    } else if (Array.isArray(myPostsData)) {
      myPostsArray = myPostsData.map((post: ApiPostData) => ({
        id: post.id,
        title: post.title || "Без названия",
        content: post.content || "",
        excerpt: post.excerpt || post.content?.substring(0, 200) || "",
        created_at: post.created_at || new Date().toISOString(),
        views_count: post.views || post.views_count || 0,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        master_id: post.master_id || session?.user?.id || "",
        author_name: session?.user?.name || "Мастер",
        author_avatar: "",
        images: post.images || [],
        main_image_url: post.main_image_url || "",
        is_liked: false,
        comments: [],
      }));
    }
    
    console.log("myPostsArray итоговое количество:", myPostsArray.length);
    if (myPostsArray.length > 0) {
      console.log("Первый пост myPostsArray:", myPostsArray[0]);
    }
    
    setMyPosts(myPostsArray);

    setNotifications(Array.isArray(notifData) ? notifData : []);
    setStats(
      statsData || {
        total_orders: 0,
        new_orders: 0,
        total_products: 0,
        total_views: 0,
        total_followers: 0,
      },
    );

    // Получаем имя мастера из профиля
    let profileData: { fullname?: string; full_name?: string } | null = null;
    if (profileResponse.success && profileResponse.profile) {
      profileData = profileResponse.profile;
    } else {
      profileData = profileResponse;
    }

    if (profileData?.fullname) {
      setMasterName(profileData.fullname);
    } else if (profileData?.full_name) {
      setMasterName(profileData.full_name);
    } else if (session?.user?.name) {
      setMasterName(session.user.name);
    } else if (session?.user?.email) {
      setMasterName(session.user.email.split("@")[0]);
    } else {
      setMasterName("Мастер");
    }
  } catch (error) {
    console.error("Error fetching master data:", error);
    setOrders([]);
    setRecentPosts([]);
    setMyPosts([]);
    setNotifications([]);
    setStats({
      total_orders: 0,
      new_orders: 0,
      total_products: 0,
      total_views: 0,
      total_followers: 0,
    });
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

  const handleLike = async (postId: string, isFromMyPosts = false) => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/master/dashboard";
      return;
    }

    try {
      const post = isFromMyPosts
        ? myPosts.find((p) => p.id === postId)
        : recentPosts.find((p) => p.id === postId);
      const response = await fetch(`/api/blog/posts/${postId}/like`, {
        method: post?.is_liked ? "DELETE" : "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (isFromMyPosts) {
          setMyPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    is_liked: !p.is_liked,
                    likes_count: data.likes_count,
                  }
                : p,
            ),
          );
        } else {
          setRecentPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    is_liked: !p.is_liked,
                    likes_count: data.likes_count,
                  }
                : p,
            ),
          );
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async (postId: string, isFromMyPosts = false) => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/master/dashboard";
      return;
    }

    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      const response = await fetch(`/api/blog/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        const data = await response.json();
        const newComment = data.comment || data;

        const formattedComment = {
          id: newComment.id,
          content: newComment.content,
          created_at: newComment.created_at,
          author_name:
            newComment.author_name || session.user?.name || "Пользователь",
          author_avatar: newComment.author_avatar || "",
        };

        if (isFromMyPosts) {
          setMyPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    comments: [formattedComment, ...(p.comments || [])],
                    comments_count: (p.comments_count || 0) + 1,
                  }
                : p,
            ),
          );
        } else {
          setRecentPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    comments: [formattedComment, ...(p.comments || [])],
                    comments_count: (p.comments_count || 0) + 1,
                  }
                : p,
            ),
          );
        }
        setCommentText("");
        setShowComments(postId);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommentLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/master/notifications/${notificationId}`, {
        method: "PATCH",
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "confirmed":
        return "bg-green-100 text-green-700";
      case "shipped":
        return "bg-purple-100 text-purple-700";
      case "delivered":
        return "bg-gray-100 text-gray-700";
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
      case "confirmed":
        return "✅ Подтвержден";
      case "shipped":
        return "📦 Отправлен";
      case "delivered":
        return "🏠 Доставлен";
      case "cancelled":
        return "❌ Отменен";
      default:
        return status;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order":
        return "📦";
      case "comment":
        return "💬";
      case "review":
        return "⭐";
      default:
        return "🔔";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60);

    if (diff < 1) return "только что";
    if (diff < 24) return `${diff} ч назад`;
    return date.toLocaleDateString("ru-RU");
  };

  // Функция для рендеринга изображений поста
  const renderPostImages = (post: BlogPost) => {
    if (!post.images || post.images.length === 0) {
      if (post.main_image_url) {
        return (
          <div className="mb-6">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={post.main_image_url}
                alt={post.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        );
      }
      return null;
    }
    
    const imageUrls = post.images.map(img => getImageUrl(img)).filter(Boolean);
    if (imageUrls.length === 0 && !post.main_image_url) return null;
    
    const allImages = post.main_image_url ? [post.main_image_url, ...imageUrls] : imageUrls;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {allImages.slice(0, 3).map((url, idx) => (
          <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={url}
              alt={`${post.title} - фото ${idx + 1}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
        {allImages.length > 3 && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            <span className="text-gray-500">+{allImages.length - 3} фото</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
          />
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка кабинета мастера...
          </p>
        </div>
      </motion.div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Анимированный заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl p-8 mb-8 text-white shadow-xl"
        >
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="font-['Montserrat_Alternates'] text-white font-bold text-3xl mb-2">
                Добро пожаловать, {masterName || session?.user?.name || "Мастер"}!
              </h1>
              <p className="text-white/80">
                Вот что происходит с вашим магазином сегодня
              </p>
            </div>
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/master/chats" className="relative block">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  {stats.total_followers > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {stats.total_followers > 9 ? "9+" : stats.total_followers}
                    </span>
                  )}
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl z-50 border border-gray-100 overflow-hidden"
                    >
                      <div className="p-4 bg-gradient-to-r from-firm-orange to-firm-pink">
                        <h3 className="font-semibold text-white">Уведомления</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">Нет уведомлений</div>
                        ) : (
                          notifications.map((notif, idx) => (
                            <motion.div
                              key={notif.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-300 ${!notif.is_read ? "bg-gradient-to-r from-firm-orange/5 to-firm-pink/5" : ""}`}
                              onClick={() => {
                                markNotificationAsRead(notif.id);
                                if (notif.link) router.push(notif.link);
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{notif.title}</p>
                                  <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                  <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleDateString("ru-RU")}</p>
                                </div>
                                {!notif.is_read && <div className="w-2 h-2 bg-firm-orange rounded-full animate-pulse mt-2"></div>}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                      <div className="p-3 bg-gray-50 text-center">
                        <Link href="/master/notifications" className="text-sm text-firm-orange hover:underline">Все уведомления</Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Статистика */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Новые заказы", value: stats.new_orders, icon: "🆕", color: "from-blue-500 to-blue-600" },
            { label: "Всего заказов", value: stats.total_orders, icon: "📦", color: "from-green-500 to-green-600" },
            { label: "Товаров", value: stats.total_products, icon: "🧶", color: "from-orange-500 to-orange-600" },
            { label: "Просмотров", value: stats.total_views, icon: "👁️", color: "from-purple-500 to-purple-600" },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Быстрые действия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddProductModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            🧶 Добавить товар
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddClassModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-firm-pink to-purple-500 text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            🎓 Создать мастер-класс
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddPostModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
          >
            ✍️ Написать пост
          </motion.button>
        </motion.div>

        {/* Заказы */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl flex items-center gap-2">
              📦 Заказы
              {orders.filter((o) => o.status === "new").length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  {orders.filter((o) => o.status === "new").length} новых
                </span>
              )}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-gray-500">У вас пока нет заказов</div>
            ) : (
              orders.slice(0, 5).map((order, idx) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ backgroundColor: "#f9fafb" }}
                  className="p-6 transition-all duration-300"
                >
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <span className="text-sm text-gray-500">№{order.order_number}</span>
                      </div>
                      <p className="font-medium text-lg">{order.product_title}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span>👤 {order.buyer_name}</span>
                        <span>💰 {order.total_amount.toLocaleString()} ₽</span>
                        <span>📅 {new Date(order.created_at).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </div>
                    <Link href={`/master/orders/${order.id}`}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-4 py-2 text-sm border-2 border-firm-orange text-firm-orange rounded-xl hover:bg-firm-orange hover:text-white transition-all duration-300">
                        Подробнее
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          {orders.length > 5 && (
            <div className="p-4 text-center border-t bg-gray-50">
              <Link href="/master/orders" className="text-sm text-firm-orange hover:underline">Все заказы →</Link>
            </div>
          )}
        </motion.div>

        {/* Лента новостей */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-6 border-gray-200 border-b">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("recent")}
                className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative ${activeTab === "recent" ? "text-firm-orange" : "text-gray-500 hover:text-gray-700"}`}
              >
                Свежие посты
                {activeTab === "recent" && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink" />}
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative ${activeTab === "my" ? "text-firm-pink" : "text-gray-500 hover:text-gray-700"}`}
              >
                Мои посты
                {activeTab === "my" && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-pink to-firm-orange" />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "recent" && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="divide-y divide-gray-100"
              >
                {recentPosts.length === 0 ? (
                  <div className="p-12 text-center text-gray-500"><p>Пока нет постов</p></div>
                ) : (
                  recentPosts.map((post, idx) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ backgroundColor: "#f9fafb" }}
                      className="p-6 transition-all duration-300"
                    >
                      <div className="max-w-3xl mx-auto">
                        <Link href={`/masters/${post.master_id}`} className="flex items-center gap-3 group mb-4">
                          <motion.div whileHover={{ scale: 1.1 }} className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                            {post.author_avatar ? (
                              <Image src={post.author_avatar} alt={post.author_name} width={48} height={48} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{post.author_name?.charAt(0).toUpperCase() || "М"}</span>
                            )}
                          </motion.div>
                          <div>
                            <p className="font-semibold group-hover:text-firm-orange transition-colors">{post.author_name}</p>
                            <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
                          </div>
                        </Link>

                        <div>
                          <h3 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-3 hover:text-firm-orange transition-colors">
                            <Link href={`/blog/${post.id}`}>{post.title}</Link>
                          </h3>

                          {renderPostImages(post)}

                          <p className="text-gray-600 mt-4 line-clamp-3">{post.excerpt || post.content?.substring(0, 300)}...</p>

                          <Link href={`/blog/${post.id}`} className="text-firm-orange hover:underline text-sm mt-3 inline-flex items-center gap-1 group">
                            Читать полностью
                            <motion.span initial={{ x: 0 }} whileHover={{ x: 5 }} className="inline-block">→</motion.span>
                          </Link>
                        </div>

                        <div className="flex items-center gap-6 pt-4 mt-4 border-t border-gray-100">
                          <AnimatedButton
                            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill={post.is_liked ? "#D97C8E" : "none"} stroke={post.is_liked ? "#D97C8E" : "#F4A67F"} strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>}
                            count={post.likes_count}
                            isActive={post.is_liked || false}
                            onClick={() => handleLike(post.id, false)}
                            activeColor="text-firm-pink"
                          />
                          <AnimatedButton
                            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={showComments === post.id ? "#F97316" : "#9CA3AF"} strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>}
                            count={post.comments_count}
                            isActive={showComments === post.id}
                            onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                            activeColor="text-firm-orange"
                          />
                          <div className="flex-1"></div>
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            {post.views_count}
                          </span>
                        </div>

                        <AnimatePresence>
                          {showComments === post.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t bg-gray-50 rounded-xl p-4 overflow-hidden"
                            >
                              {session && (
                                <div className="flex gap-3 mb-4">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {session.user.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <textarea
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      placeholder="Написать комментарий..."
                                      rows={2}
                                      className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300"
                                    />
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleComment(post.id, false)}
                                      disabled={commentLoading || !commentText.trim()}
                                      className="mt-2 px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                    >
                                      {commentLoading ? "Отправка..." : "Отправить"}
                                    </motion.button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {!post.comments || post.comments.length === 0 ? (
                                  <p className="text-gray-400 text-sm text-center py-4">Будьте первым, кто оставит комментарий</p>
                                ) : (
                                  post.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                                        {comment.author_avatar ? (
                                          <Image src={comment.author_avatar} alt={comment.author_name} width={32} height={32} className="w-full h-full object-cover" />
                                        ) : (
                                          comment.author_name?.charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-white rounded-xl p-3 shadow-sm">
                                          <p className="font-semibold text-sm">{comment.author_name}</p>
                                          <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{formatDate(comment.created_at)}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "my" && (
              <motion.div
                key="my"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="divide-y divide-gray-100"
              >
                {myPosts.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p>У вас пока нет постов</p>
                    <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowAddPostModal(true)} className="text-firm-orange hover:underline mt-2 inline-block">
                      Написать первый пост →
                    </motion.button>
                  </div>
                ) : (
                  myPosts.map((post, idx) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ backgroundColor: "#f9fafb" }}
                      className="p-6 transition-all duration-300"
                    >
                      <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                            {post.author_avatar ? (
                              <Image src={post.author_avatar} alt={post.author_name} width={48} height={48} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{post.author_name?.charAt(0).toUpperCase() || "М"}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{post.author_name}</p>
                            <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-3 hover:text-firm-orange transition-colors">
                            <Link href={`/blog/${post.id}`}>{post.title}</Link>
                          </h3>

                          {renderPostImages(post)}

                          <p className="text-gray-600 mt-4 line-clamp-3">{post.excerpt || post.content?.substring(0, 300)}...</p>

                          <Link href={`/blog/${post.id}`} className="text-firm-orange hover:underline text-sm mt-3 inline-flex items-center gap-1 group">
                            Читать полностью
                            <motion.span initial={{ x: 0 }} whileHover={{ x: 5 }} className="inline-block">→</motion.span>
                          </Link>
                        </div>

                        <div className="flex items-center gap-6 pt-4 mt-4 border-t border-gray-100">
                          <AnimatedButton
                            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill={post.is_liked ? "#D97C8E" : "none"} stroke={post.is_liked ? "#D97C8E" : "#9CA3AF"} strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>}
                            count={post.likes_count}
                            isActive={post.is_liked || false}
                            onClick={() => handleLike(post.id, true)}
                            activeColor="text-firm-pink"
                          />
                          <AnimatedButton
                            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={showComments === post.id ? "#F4A67F" : "#9CA3AF"} strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>}
                            count={post.comments_count}
                            isActive={showComments === post.id}
                            onClick={() => setShowComments(showComments === post.id ? null : post.id)}
                            activeColor="text-firm-orange"
                          />
                          <div className="flex-1"></div>
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            {post.views_count}
                          </span>
                        </div>

                        <AnimatePresence>
                          {showComments === post.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t bg-gray-50 rounded-xl p-4 overflow-hidden"
                            >
                              {session && (
                                <div className="flex gap-3 mb-4">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {session.user.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <textarea
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      placeholder="Написать комментарий..."
                                      rows={2}
                                      className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300"
                                    />
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleComment(post.id, true)}
                                      disabled={commentLoading || !commentText.trim()}
                                      className="mt-2 px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                    >
                                      {commentLoading ? "Отправка..." : "Отправить"}
                                    </motion.button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {!post.comments || post.comments.length === 0 ? (
                                  <p className="text-gray-400 text-sm text-center py-4">Будьте первым, кто оставит комментарий</p>
                                ) : (
                                  post.comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                                        {comment.author_avatar ? (
                                          <Image src={comment.author_avatar} alt={comment.author_name} width={32} height={32} className="w-full h-full object-cover" />
                                        ) : (
                                          comment.author_name?.charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-white rounded-xl p-3 shadow-sm">
                                          <p className="font-semibold text-sm">{comment.author_name}</p>
                                          <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{formatDate(comment.created_at)}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Модальные окна */}
        <AddProductModal
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          onSuccess={fetchMasterData}
          categories={categories}
          yarns={yarns}
        />

        <AddPostModal
          isOpen={showAddPostModal}
          onClose={() => setShowAddPostModal(false)}
          onSuccess={fetchMasterData}
          session={session}
        />

        <AddClassModal
          isOpen={showAddClassModal}
          onClose={() => setShowAddClassModal(false)}
          onSuccess={fetchMasterData}
        />
      </div>
    </div>
  );
}