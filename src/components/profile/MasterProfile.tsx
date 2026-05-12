"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import MasterProductsList, {
  Product,
} from "@/components/master/MasterProductsList";

interface MasterProfileProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string;
      role?: string;
    };
  } | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  product_title: string;
  buyer_name: string;
  total_amount: number;
}

interface BlogPost {
  id: string;
  title: string;
  status: string;
  created_at: string;
  excerpt?: string;
  content?: string;
  views_count?: number;
  comments_count?: number;
  likes_count?: number;
}

interface MasterClass {
  id: string;
  title: string;
  image_url?: string;
  type: string;
  status: string;
  price: number;
  current_participants?: number;
  max_participants: number;
  description: string;
  date_time: string;
  duration_minutes: number;
  location?: string;
  registrations?: Array<{
    id: string;
    user_name?: string;
    user_email: string;
    user_phone?: string;
    created_at: string;
    payment_status: string;
  }>;
}

interface ProfileApiResponse {
  success: boolean;
  profile: {
    id: string;
    email: string;
    role: string;
    registered_at: string;
    fullname: string;
    phone: string | null;
    city: string | null;
    address: string | null;
    avatar_url: string | null;
    newsletter_agreement: boolean;
    description: string | null;
    is_verified: boolean;
    is_partner: boolean;
    rating: number;
    total_sales: number;
    custom_orders_enabled: boolean;
    moderation_status: string;
    is_banned: boolean;
    followers: number;
    products_count: number;
  };
  meta: {
    cached: boolean;
    timestamp: string;
  };
}

interface ProductsApiResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface OrdersApiResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  stats: {
    total_orders: number;
    total_amount: number;
    status_counts: Record<string, number>;
  };
}

interface MasterClassesApiResponse {
  classes: MasterClass[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BlogPostFromApi {
  id: string;
  title: string;
  status: string;
  created_at: string;
  excerpt: string | null;
  content: string;
  views: number;
  stats?: {
    comments_count: number;
    likes_count: number;
  };
}

export default function MasterProfile({ session }: MasterProfileProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [masterClassFilter, setMasterClassFilter] = useState("all");
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedMasterClass, setSelectedMasterClass] = useState<{
    id: string;
    title: string;
    registrations?: Array<{
      id: string;
      user_name?: string;
      user_email: string;
      user_phone?: string;
      created_at: string;
      payment_status: string;
    }>;
  } | null>(null);

  const [profileData, setProfileData] = useState({
    fullname: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    avatarUrl: null as string | null,
    description: "",
    is_verified: false,
    is_partner: false,
    rating: 0,
    total_sales: 0,
    custom_orders_enabled: false,
    followers: 0,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [masterClasses, setMasterClasses] = useState<MasterClass[]>([]);
  const [stats, setStats] = useState({
    total_views: 0,
    total_orders: 0,
    total_revenue: 0,
    total_followers: 0,
    monthly_views: 0,
    monthly_orders: 0,
    monthly_revenue: 0,
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);

      const [profileRes, productRes, ordersRes, blogRes, classesRes] =
        await Promise.all([
          fetch("/api/master/profile"),
          fetch("/api/master/products"),
          fetch("/api/master/orders"),
          fetch("/api/master/blog"),
          fetch("/api/master/master-classes"),
        ]);

      // Profile
      let profileDataObj = {
        fullname: "",
        email: "",
        phone: "",
        city: "",
        address: "",
        avatarUrl: null as string | null,
        description: "",
        is_verified: false,
        is_partner: false,
        rating: 0,
        total_sales: 0,
        custom_orders_enabled: false,
        followers: 0,
      };

      if (profileRes.ok) {
        const profileJson: ProfileApiResponse = await profileRes.json();
        const p = profileJson.profile;
        profileDataObj = {
          fullname: p.fullname || "",
          email: p.email || "",
          phone: p.phone || "",
          city: p.city || "",
          address: p.address || "",
          avatarUrl: p.avatar_url || null,
          description: p.description || "",
          is_verified: p.is_verified || false,
          is_partner: p.is_partner || false,
          rating: p.rating || 0,
          total_sales: p.total_sales || 0,
          custom_orders_enabled: p.custom_orders_enabled || false,
          followers: p.followers || 0,
        };
      }
      setProfileData(profileDataObj);

      // Products
      let productsList: Product[] = [];
      if (productRes.ok) {
        const productJson: ProductsApiResponse = await productRes.json();
        productsList = productJson.products || [];
      }
      setProducts(productsList);

      // Orders
      let ordersList: Order[] = [];
      if (ordersRes.ok) {
        const ordersJson: OrdersApiResponse = await ordersRes.json();
        ordersList = ordersJson.orders || [];
      }
      setOrders(ordersList);

      // Blog
      let blogList: BlogPost[] = [];
      if (blogRes.ok) {
        const blogData = await blogRes.json();
        if (blogData.posts && Array.isArray(blogData.posts)) {
          blogList = blogData.posts.map((post: BlogPostFromApi) => ({
            id: post.id,
            title: post.title,
            status: post.status,
            created_at: post.created_at,
            excerpt: post.excerpt || post.content?.substring(0, 200),
            content: post.content,
            views_count: post.views || 0,
            comments_count: post.stats?.comments_count || 0,
            likes_count: post.stats?.likes_count || 0,
          }));
        } else if (Array.isArray(blogData)) {
          blogList = blogData;
        }
      }
      setBlogPosts(blogList);

      // Master Classes
      let classesList: MasterClass[] = [];
      if (classesRes.ok) {
        const classesJson: MasterClassesApiResponse = await classesRes.json();
        classesList = classesJson.classes || [];
      }
      setMasterClasses(classesList);

      // Stats
      const totalViews = productsList.reduce(
        (sum: number, p: Product) => sum + (p.views || 0),
        0,
      );
      const totalRevenue = ordersList.reduce(
        (sum: number, o: Order) => sum + (o.total_amount || 0),
        0,
      );

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyOrders = ordersList.filter(
        (o: Order) => new Date(o.created_at) > thirtyDaysAgo,
      );
      const monthlyRevenue = monthlyOrders.reduce(
        (sum: number, o: Order) => sum + (o.total_amount || 0),
        0,
      );

      setStats({
        total_views: totalViews,
        total_orders: ordersList.length,
        total_revenue: totalRevenue,
        total_followers: profileDataObj.followers,
        monthly_views: Math.round(totalViews * 0.3),
        monthly_orders: monthlyOrders.length,
        monthly_revenue: monthlyRevenue,
      });
    } catch (error) {
      console.error("Error fetching master data:", error);
      setProducts([]);
      setOrders([]);
      setBlogPosts([]);
      setMasterClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("fullname", profileData.fullname);
      formData.append("phone", profileData.phone || "");
      formData.append("city", profileData.city || "");
      formData.append("address", profileData.address || "");
      formData.append("description", profileData.description || "");
      formData.append(
        "custom_orders_enabled",
        String(profileData.custom_orders_enabled),
      );

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await fetch("/api/master/profile", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        await fetchMasterData();
        toast.success("Профиль успешно обновлен");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка при обновлении профиля");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Ошибка при обновлении профиля");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelMasterClass = async (classId: string) => {
    if (!confirm("Отменить мастер-класс? Участники получат уведомление."))
      return;

    try {
      const response = await fetch(
        `/api/master/master-classes/${classId}/cancel`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        fetchMasterData();
        toast.success("Мастер-класс отменен");
      } else {
        toast.error("Ошибка при отмене мастер-класса");
      }
    } catch (error) {
      console.error("Error canceling master class:", error);
      toast.error("Ошибка при отмене мастер-класса");
    }
  };

  const handleDeleteMasterClass = async (classId: string) => {
    if (!confirm("Удалить мастер-класс? Это действие нельзя отменить.")) return;

    try {
      const response = await fetch(`/api/master/master-classes/${classId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchMasterData();
        toast.success("Мастер-класс удален");
      } else {
        toast.error("Ошибка при удалении мастер-класса");
      }
    } catch (error) {
      console.error("Error deleting master class:", error);
      toast.error("Ошибка при удалении мастер-класса");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOrderStatusChange = async (
    orderId: string,
    newStatus: string,
  ) => {
    try {
      const response = await fetch(`/api/master/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order,
          ),
        );
        toast.success(`Статус заказа изменен на "${getStatusText(newStatus)}"`);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Ошибка при обновлении статуса");
    }
  };

  const handleProductDelete = async (productId: string) => {
    if (confirm("Вы уверены, что хотите удалить товар?")) {
      try {
        const response = await fetch(`/api/master/products/${productId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setProducts((prev) =>
            prev.filter((p: { id: string }) => p.id !== productId),
          );
          toast.success("Товар удален");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        toast.error("Ошибка при удалении товара");
      }
    }
  };

  const handleBlogPostDelete = async (postId: string) => {
    if (confirm("Вы уверены, что хотите удалить пост?")) {
      try {
        const response = await fetch(`/api/master/blog/${postId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setBlogPosts((prev) =>
            prev.filter((p: { id: string }) => p.id !== postId),
          );
          toast.success("Пост удален");
        }
      } catch (error) {
        console.error("Error deleting blog post:", error);
        toast.error("Ошибка при удалении поста");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "text-blue-600 bg-blue-50";
      case "confirmed":
        return "text-green-600 bg-green-50";
      case "shipped":
        return "text-purple-600 bg-purple-50";
      case "delivered":
        return "text-gray-600 bg-gray-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      case "moderation":
        return "text-yellow-600 bg-yellow-50";
      case "active":
        return "text-green-600 bg-green-50";
      case "published":
        return "text-green-600 bg-green-50";
      case "draft":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Новый";
      case "confirmed":
        return "Подтвержден";
      case "shipped":
        return "Отправлен";
      case "delivered":
        return "Доставлен";
      case "cancelled":
        return "Отменен";
      case "moderation":
        return "На модерации";
      case "active":
        return "Активен";
      case "published":
        return "Опубликован";
      case "draft":
        return "Черновик";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Toaster position="top-right" />
      
      <div className="mt-5 flex items-start justify-center py-8 px-4">
        <div className="flex flex-col gap-6 w-full max-w-7xl">
          {/* Header с приветствием */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 rounded-2xl p-6 backdrop-blur-sm"
          >
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl md:text-4xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                  Панель мастера
                </h1>
                <p className="text-gray-600 mt-2">
                  Добро пожаловать, {profileData.fullname || "Мастер"}!
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.is_verified && (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ Верифицированный мастер
                    </span>
                  )}
                  {profileData.is_partner && (
                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                      🤝 Партнер фабрики
                    </span>
                  )}
                  {profileData.custom_orders_enabled && (
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      ✨ Принимаю инд. заказы
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-6">
                <motion.div whileHover={{ scale: 1.05 }} className="text-right">
                  <p className="text-sm text-gray-500">Просмотры</p>
                  <p className="text-3xl font-bold text-firm-orange">
                    {stats.total_views}
                  </p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="text-right">
                  <p className="text-sm text-gray-500">Заказы</p>
                  <p className="text-3xl font-bold text-firm-pink">
                    {stats.total_orders}
                  </p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="text-right">
                  <p className="text-sm text-gray-500">Выручка</p>
                  <p className="text-3xl font-bold text-firm-green">
                    {stats.total_revenue.toLocaleString()} ₽
                  </p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="text-right">
                  <p className="text-sm text-gray-500">Подписчики</p>
                  <p className="text-3xl font-bold text-firm-orange">
                    {stats.total_followers}
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="md:w-1/3 lg:w-1/4">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-5 backdrop-blur-sm bg-white/95 border border-gray-100">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden border-4 border-white shadow-lg group">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : profileData.avatarUrl ? (
                      <img
                        src={`/api/proxy/avatar?url=${encodeURIComponent(profileData.avatarUrl)}`}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-['Montserrat_Alternates'] font-bold text-white">
                        {profileData.fullname?.charAt(0).toUpperCase() || "М"}
                      </span>
                    )}

                    {isEditing && (
                      <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-sm">Изменить</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    )}
                  </div>
                  <h3 className="mt-4 font-['Montserrat_Alternates'] font-semibold text-xl text-center">
                    {profileData.fullname}
                  </h3>
                  <p className="text-sm text-gray-500 text-center">
                    {profileData.email}
                  </p>
                  {profileData.city && (
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      📍 {profileData.city}
                    </p>
                  )}

                  <div className="flex items-center gap-1 mt-3">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(profileData.rating) ? "text-yellow-400" : "text-gray-300"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-sm font-semibold ml-1">
                      {profileData.rating}
                    </span>
                  </div>
                  <p className="text-m text-gray-600 mt-1">
                    {profileData.total_sales} продаж
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {stats.total_followers} подписчиков
                  </p>
                </div>

                <nav className="space-y-2">
                  {[
                    { id: "dashboard", icon: "📊", label: "Панель управления" },
                    { id: "products", icon: "🧶", label: "Мои товары", count: products.length },
                    { id: "orders", icon: "📦", label: "Заказы", count: orders.filter(o => o.status === "new").length },
                    { id: "blog", icon: "✍️", label: "Блог" },
                    { id: "master-classes", icon: "🎓", label: "Мастер-классы" },
                    { id: "profile", icon: "👤", label: "Профиль" },
                    { id: "settings", icon: "⚙️", label: "Настройки" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-lg"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <span className="text-xl">{tab.icon}</span>
                      <span className="flex-1">{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            activeTab === tab.id
                              ? "bg-white text-firm-orange"
                              : "bg-firm-orange/20 text-firm-orange"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                  
                  <div className="border-t border-gray-200 my-2 pt-2"></div>
                  
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 text-red-600 hover:bg-red-50"
                  >
                    <span className="text-xl">🚪</span>
                    <span>Выйти</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:w-2/3 lg:w-3/4">
              {/* Dashboard Tab */}
              {activeTab === "dashboard" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-md p-4">
                      <p className="text-gray-500 text-sm">Просмотры</p>
                      <p className="text-2xl font-bold text-firm-orange">
                        {stats.total_views}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4">
                      <p className="text-gray-500 text-sm">Заказы</p>
                      <p className="text-2xl font-bold text-firm-pink">
                        {stats.total_orders}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4">
                      <p className="text-gray-500 text-sm">Выручка</p>
                      <p className="text-2xl font-bold text-firm-green">
                        {stats.total_revenue.toLocaleString()} ₽
                      </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4">
                      <p className="text-gray-500 text-sm">Подписчики</p>
                      <p className="text-2xl font-bold text-firm-orange">
                        {stats.total_followers}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4">
                      Быстрые действия
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Link
                        href="/master/products/new"
                        className="px-4 py-2 bg-firm-orange text-white rounded-lg text-center hover:bg-opacity-90 transition"
                      >
                        + Добавить товар
                      </Link>
                      <Link
                        href="/master/blog/new"
                        className="px-4 py-2 bg-firm-pink text-white rounded-lg text-center hover:bg-opacity-90 transition"
                      >
                        + Новая запись
                      </Link>
                      <Link
                        href="/master/master-classes/new"
                        className="px-4 py-2 border-2 border-firm-orange text-firm-orange rounded-lg text-center hover:bg-firm-orange hover:text-white transition"
                      >
                        + Создать МК
                      </Link>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4">
                      Последние заказы
                    </h3>
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="border-b border-gray-100 py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{order.product_title}</p>
                          <p className="text-sm text-gray-500">{order.buyer_name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <p className="font-semibold text-firm-orange mt-1">
                            {order.total_amount} ₽
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Products Tab */}
              {activeTab === "products" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                      Мои товары
                    </h2>
                    <Link
                      href="/master/products/new"
                      className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition"
                    >
                      + Добавить товар
                    </Link>
                  </div>
                  <MasterProductsList
                    products={products}
                    onDelete={handleProductDelete}
                    masterName={profileData.fullname}
                    loading={loading}
                  />
                </motion.div>
              )}

              {/* Orders Tab */}
              {activeTab === "orders" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">
                    Заказы
                  </h2>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-xl p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-semibold">Заказ #{order.order_number}</span>
                            <span className={`ml-3 text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                        </div>
                        <p className="text-gray-600">{order.product_title}</p>
                        <div className="flex justify-between items-center mt-3">
                          <p className="text-sm text-gray-500">Покупатель: {order.buyer_name}</p>
                          <div className="flex gap-2">
                            {order.status === "new" && (
                              <>
                                <button
                                  onClick={() => handleOrderStatusChange(order.id, "confirmed")}
                                  className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
                                >
                                  Подтвердить
                                </button>
                                <button
                                  onClick={() => handleOrderStatusChange(order.id, "cancelled")}
                                  className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                                >
                                  Отклонить
                                </button>
                              </>
                            )}
                            {order.status === "confirmed" && (
                              <button
                                onClick={() => handleOrderStatusChange(order.id, "shipped")}
                                className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm"
                              >
                                Отправить
                              </button>
                            )}
                            <span className="font-bold text-firm-orange">{order.total_amount} ₽</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Blog Tab - упрощенный */}
              {activeTab === "blog" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Мой блог</h2>
                    <Link href="/master/blog/new" className="px-4 py-2 bg-firm-pink text-white rounded-xl">
                      + Новая запись
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {blogPosts.map((post) => (
                      <div key={post.id} className="border rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold">{post.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(post.status)}`}>
                            {getStatusText(post.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{formatDate(post.created_at)}</p>
                        <p className="text-gray-600 mt-2 line-clamp-2">{post.excerpt}</p>
                        <div className="flex justify-end gap-3 mt-3">
                          <Link href={`/master/blog/${post.id}/edit`} className="text-sm text-blue-600">
                            Редактировать
                          </Link>
                          <button onClick={() => handleBlogPostDelete(post.id)} className="text-sm text-red-600">
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Master Classes Tab - упрощенный */}
              {activeTab === "master-classes" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Мастер-классы</h2>
                    <Link href="/master/master-classes/new" className="px-4 py-2 bg-firm-orange text-white rounded-xl">
                      + Создать МК
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {masterClasses.map((mc) => (
                      <div key={mc.id} className="border rounded-xl p-4">
                        <div className="flex gap-4">
                          {mc.image_url && (
                            <img src={mc.image_url} alt={mc.title} className="w-20 h-20 object-cover rounded-lg" />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{mc.title}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {mc.type === "online" ? "Онлайн" : "Офлайн"}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(mc.status)}`}>
                                {getStatusText(mc.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{mc.price.toLocaleString()} ₽</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Profile Tab */}
              {activeTab === "profile" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Профиль мастера</h2>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 border-2 border-firm-pink rounded-lg hover:bg-firm-pink hover:text-white transition"
                      >
                        Редактировать
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        Отмена
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-1">Имя *</label>
                        <input
                          type="text"
                          name="fullname"
                          value={profileData.fullname}
                          onChange={handleInputChange}
                          required
                          className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Телефон</label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone || ""}
                          onChange={handleInputChange}
                          className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Город</label>
                        <input
                          type="text"
                          name="city"
                          value={profileData.city || ""}
                          onChange={handleInputChange}
                          className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Описание</label>
                        <textarea
                          name="description"
                          value={profileData.description || ""}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="custom_orders_enabled"
                          checked={profileData.custom_orders_enabled}
                          onChange={handleCheckboxChange}
                          className="w-5 h-5 accent-firm-orange"
                        />
                        <label>Принимаю индивидуальные заказы</label>
                      </div>
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-semibold disabled:opacity-50"
                      >
                        {saving ? "Сохранение..." : "Сохранить изменения"}
                      </button>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-gray-500 text-sm">Имя</p>
                        <p className="font-medium">{profileData.fullname}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-gray-500 text-sm">Email</p>
                        <p className="font-medium">{profileData.email}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-gray-500 text-sm">Телефон</p>
                        <p className="font-medium">{profileData.phone || "Не указано"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-gray-500 text-sm">Город</p>
                        <p className="font-medium">{profileData.city || "Не указано"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                        <p className="text-gray-500 text-sm">Описание</p>
                        <p className="font-medium">{profileData.description || "Не указано"}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl p-6"
                >
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Настройки</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Смена пароля</h3>
                      <form className="space-y-4 max-w-md">
                        <input type="password" placeholder="Текущий пароль" className="w-full p-3 rounded-xl bg-gray-100" />
                        <input type="password" placeholder="Новый пароль" className="w-full p-3 rounded-xl bg-gray-100" />
                        <input type="password" placeholder="Подтверждение" className="w-full p-3 rounded-xl bg-gray-100" />
                        <button className="px-6 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl">
                          Изменить пароль
                        </button>
                      </form>
                    </div>
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-lg mb-3 text-red-600">Опасная зона</h3>
                      <button className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition">
                        Удалить аккаунт
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}