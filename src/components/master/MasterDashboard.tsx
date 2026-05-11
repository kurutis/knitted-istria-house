"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BlogPostCard from "@/components/blog/BlogPostCard";

// Импорт компонентов модальных окон
import AddProductModal from "@/components/modals/AddProductModal";
import AddPostModal from "@/components/modals/AddPostModal";
import AddClassModal from "@/components/modals/AddClassModal";

// Импорт остальных компонентов
import { AnimatedButton } from "@/components/ui/AnimatedButton";

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
  images?:
    | Array<{
        id: string;
        url?: string;
        image_url?: string;
        sort_order: number;
      }>
    | string[];
  main_image_url?: string;
  is_liked?: boolean;
  comments?: ApiCommentData[];
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
  images?:
    | Array<{
        id: string;
        url?: string;
        image_url?: string;
        sort_order: number;
      }>
    | string[];
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

type CategoryItem = {
  id: number;
  name: string;
  subcategories?: CategoryItem[];
};

// Вспомогательная функция для получения URL изображения
const getImageUrl = (
  img:
    | string
    | { id: string; url?: string; image_url?: string; sort_order: number },
): string => {
  if (typeof img === "string") {
    return img;
  }
  return img.url || img.image_url || "";
};

// Функция нормализации поста для BlogPostCard
const normalizePostForCard = (post: BlogPost) => {
  return {
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
      author_avatar: comment.author_avatar,
    })),
  };
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
  const [masterAvatar, setMasterAvatar] = useState("");
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
  const [activeTab, setActiveTab] = useState<"recent" | "my">("recent");

  // Состояния для модальных окон
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  // Данные для модальных окон
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [yarns, setYarns] = useState<
    { id: string; name: string; brand: string }[]
  >([]);

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

      if (!session?.user) {
        console.error("Нет сессии");
        window.location.href = "/auth/signin?callbackUrl=/master/dashboard";
        return;
      }

      // Запрос профиля
      const profileRes = await fetch("/api/master/profile", {
        credentials: "include",
      });
      const profileResponse = await profileRes.json();

      // Запрос свежих постов
      const recentPostsRes = await fetch("/api/blog/posts?limit=4", {
        credentials: "include",
      });
      const recentPostsData = await recentPostsRes.json();

      // Запрос моих постов
      let myPostsArray: BlogPost[] = [];
      try {
        const myPostsRes = await fetch("/api/master/blog", {
          credentials: "include",
        });

        if (myPostsRes.ok) {
          const myPostsData = await myPostsRes.json();
          if (
            myPostsData &&
            myPostsData.posts &&
            Array.isArray(myPostsData.posts)
          ) {
            myPostsArray = myPostsData.posts;
          }
        }
      } catch (apiError) {
        console.error("Ошибка при запросе /api/master/blog:", apiError);
        myPostsArray = [];
      }

      // Обработка профиля
      let profileData: {
        fullname?: string;
        full_name?: string;
        avatar_url?: string;
      } | null = null;
      if (profileResponse.success && profileResponse.profile) {
        profileData = profileResponse.profile;
      } else {
        profileData = profileResponse;
      }

      const userFullName =
        profileData?.fullname ||
        profileData?.full_name ||
        session.user.name ||
        session.user.email?.split("@")[0] ||
        "Мастер";
      const userAvatar = profileData?.avatar_url || "";

      setMasterName(userFullName);
      setMasterAvatar(userAvatar);

      // Обработка свежих постов
      let recentPostsArray: BlogPost[] = [];
      if (
        recentPostsData &&
        recentPostsData.posts &&
        Array.isArray(recentPostsData.posts)
      ) {
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
      }
      setRecentPosts(recentPostsArray);

      // Обработка моих постов
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
        comments: post.comments || [],
      }));

      setMyPosts(formattedMyPosts);

      setStats({
        total_orders: 0,
        new_orders: 0,
        total_products: 0,
        total_views: 0,
        total_followers: 0,
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
            <div className="flex items-center gap-4">
              {masterAvatar && (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 border-2 border-white">
                  <Image
                    src={masterAvatar}
                    alt={masterName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="font-['Montserrat_Alternates'] text-white font-bold text-3xl mb-2">
                  Добро пожаловать,{" "}
                  {masterName || session?.user?.name || "Мастер"}!
                </h1>
                <p className="text-white/80">
                  Вот что происходит с вашим магазином сегодня
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/master/chats" className="relative block">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
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
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
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
                          <div className="p-6 text-center text-gray-500">
                            Нет уведомлений
                          </div>
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
                                <span className="text-2xl">
                                  {getNotificationIcon(notif.type)}
                                </span>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {notif.title}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {notif.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {new Date(notif.created_at).toLocaleDateString(
                                      "ru-RU",
                                    )}
                                  </p>
                                </div>
                                {!notif.is_read && (
                                  <div className="w-2 h-2 bg-firm-orange rounded-full animate-pulse mt-2"></div>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                      <div className="p-3 bg-gray-50 text-center">
                        <Link
                          href="/master/notifications"
                          className="text-sm text-firm-orange hover:underline"
                        >
                          Все уведомления
                        </Link>
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
            {
              label: "Новые заказы",
              value: stats.new_orders,
              icon: "🆕",
              color: "from-blue-500 to-blue-600",
            },
            {
              label: "Всего заказов",
              value: stats.total_orders,
              icon: "📦",
              color: "from-green-500 to-green-600",
            },
            {
              label: "Товаров",
              value: stats.total_products,
              icon: "🧶",
              color: "from-orange-500 to-orange-600",
            },
            {
              label: "Просмотров",
              value: stats.total_views,
              icon: "👁️",
              color: "from-purple-500 to-purple-600",
            },
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
                  <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                    {stat.label}
                  </p>
                  <p
                    className={`text-3xl font-bold mt-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
                  >
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
              <div className="p-12 text-center text-gray-500">
                У вас пока нет заказов
              </div>
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
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                        <span className="text-sm text-gray-500">
                          №{order.order_number}
                        </span>
                      </div>
                      <p className="font-medium text-lg">{order.product_title}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        <span>👤 {order.buyer_name}</span>
                        <span>💰 {order.total_amount.toLocaleString()} ₽</span>
                        <span>
                          📅{" "}
                          {new Date(order.created_at).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </div>
                    <Link href={`/master/orders/${order.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 text-sm border-2 border-firm-orange text-firm-orange rounded-xl hover:bg-firm-orange hover:text-white transition-all duration-300"
                      >
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
              <Link
                href="/master/orders"
                className="text-sm text-firm-orange hover:underline"
              >
                Все заказы →
              </Link>
            </div>
          )}
        </motion.div>

        {/* Лента новостей с использованием BlogPostCard */}
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
                className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative ${
                  activeTab === "recent"
                    ? "text-firm-orange"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Свежие посты
                {activeTab === "recent" && (
                  <motion.div
                    layoutId="underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative ${
                  activeTab === "my"
                    ? "text-firm-pink"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Мои посты
                {activeTab === "my" && (
                  <motion.div
                    layoutId="underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-pink to-firm-orange"
                  />
                )}
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
                className="space-y-5 p-6"
              >
                {recentPosts.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p>Пока нет постов</p>
                  </div>
                ) : (
                  recentPosts.map((post) => (
                    <BlogPostCard
                      key={post.id}
                      post={normalizePostForCard(post)}
                      isOwner={true}
                      showComments={showComments === post.id}
                      onEdit={(postId) =>
                        router.push(`/master/blog/${postId}/edit`)
                      }
                      onDelete={(postId) => {
                        if (confirm("Удалить пост?")) {
                          fetch(`/api/master/blog/${postId}`, { method: "DELETE" })
                            .then(() => fetchMasterData());
                        }
                      }}
                    />
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
                className="space-y-5 p-6"
              >
                {myPosts.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p>У вас пока нет постов</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setShowAddPostModal(true)}
                      className="text-firm-orange hover:underline mt-2 inline-block"
                    >
                      Написать первый пост →
                    </motion.button>
                  </div>
                ) : (
                  myPosts.map((post) => (
                    <BlogPostCard
                      key={post.id}
                      post={normalizePostForCard(post)}
                      isOwner={true}
                      showComments={showComments === post.id}
                      onEdit={(postId) =>
                        router.push(`/master/blog/${postId}/edit`)
                      }
                      onDelete={(postId) => {
                        if (confirm("Удалить пост?")) {
                          fetch(`/api/master/blog/${postId}`, { method: "DELETE" })
                            .then(() => fetchMasterData());
                        }
                      }}
                    />
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