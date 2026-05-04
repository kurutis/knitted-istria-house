"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
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
  // другие поля заказа
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
  // другие поля поста
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
      let profileData = {
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
        profileData = {
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
      setProfileData(profileData);

      // Products
      let products: Product[] = [];
      if (productRes.ok) {
        const productJson: ProductsApiResponse = await productRes.json();
        products = productJson.products || [];
      }
      setProducts(products);

      // Orders
      let orders: Order[] = [];
      if (ordersRes.ok) {
        const ordersJson: OrdersApiResponse = await ordersRes.json();
        orders = ordersJson.orders || [];
      }
      setOrders(orders);

      // Blog
      let blog: BlogPost[] = [];
      if (blogRes.ok) {
        blog = await blogRes.json();
        if (!Array.isArray(blog)) blog = [];
      }
      setBlogPosts(blog);

      // Master Classes
      let classes: MasterClass[] = [];
      if (classesRes.ok) {
        const classesJson: MasterClassesApiResponse = await classesRes.json();
        classes = classesJson.classes || [];
      }
      setMasterClasses(classes);

      // Stats
      const totalViews = products.reduce(
        (sum: number, p: Product) => sum + (p.views || 0),
        0,
      );
      const totalRevenue = orders.reduce(
        (sum: number, o: Order) => sum + (o.total_amount || 0),
        0,
      );

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyOrders = orders.filter(
        (o: Order) => new Date(o.created_at) > thirtyDaysAgo,
      );
      const monthlyRevenue = monthlyOrders.reduce(
        (sum: number, o: Order) => sum + (o.total_amount || 0),
        0,
      );

      setStats({
        total_views: totalViews,
        total_orders: orders.length,
        total_revenue: totalRevenue,
        total_followers: profileData.followers,
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
        alert("Профиль успешно обновлен");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при обновлении профиля");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Ошибка при обновлении профиля");
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
        alert("Мастер-класс отменен");
      } else {
        alert("Ошибка при отмене мастер-класса");
      }
    } catch (error) {
      console.error("Error canceling master class:", error);
      alert("Ошибка при отмене мастер-класса");
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
        alert("Мастер-класс удален");
      } else {
        alert("Ошибка при удалении мастер-класса");
      }
    } catch (error) {
      console.error("Error deleting master class:", error);
      alert("Ошибка при удалении мастер-класса");
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
      }
    } catch (error) {
      console.error("Error updating order:", error);
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
        }
      } catch (error) {
        console.error("Error deleting product:", error);
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
        }
      } catch (error) {
        console.error("Error deleting blog post:", error);
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
    return new Date(dateString).toLocaleDateString("ru-Ru", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-Ru", {
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
    <div className="mt-5 flex items-start justify-center">
      <div className="flex flex-col gap-5 w-[90%] max-w-7xl">
        <div className="flex gap-4 flex-wrap">
          {profileData.is_verified && (
            <div className="bg-firm-green text-main px-4 py-2 rounded-full text-sm font-['Montserrat_Alternates'] flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Верифицированный мастер
            </div>
          )}
          {profileData.is_partner && (
            <div className="bg-firm-orange bg-opacity-10 text-main px-4 py-2 rounded-full text-sm font-['Montserrat_Alternates'] flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Партнер фабрики
            </div>
          )}
          {profileData.custom_orders_enabled && (
            <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-['Montserrat_Alternates'] flex items-center gap-2">
              <svg
                className="w-4 h-4"
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
              Принимаю индивидуальные заказы
            </div>
          )}
        </div>
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-1/5">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-5">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden border-2 border-white shadow-lg group">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : profileData.avatarUrl ? (
                    <img
                      src={profileData.avatarUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-['Montserrat_Alternates'] font-semibold text-white">
                      {profileData.fullname?.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {isEditing && (
                    <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-white text-xs">Изменить</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  )}
                </div>
                <h3 className="mt-3 font-['Montserrat_Alternates'] font-semibold text-lg text-center">
                  {profileData.fullname}
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  {profileData.email}
                </p>

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
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === "dashboard" ? "bg-firm-orange text-white" : "hover:bg-[#eaeaea]"}`}
                >
                  <span>📊</span> Панель управления
                </button>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === "products" ? "bg-firm-pink text-white" : "hover:bg-[#eaeaea]"}`}
                >
                  <span>🧶</span> Мои товары{" "}
                  {products.length > 0 && (
                    <span className="ml-auto bg-white text-firm-pink text-xs px-2 py-1 rounded-full">
                      {products.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === "orders" ? "bg-firm-orange text-white" : "hover:bg-[#eaeaea]"}`}
                >
                  {" "}
                  <span>📦</span> Заказы{" "}
                  {orders.filter((o: Order) => o.status === "new").length >
                    0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {orders.filter((o: Order) => o.status === "new").length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("blog")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === "blog" ? "bg-firm-pink text-white" : "hover:bg-[#eaeaea]"}`}
                >
                  {" "}
                  <span>✍️</span> Блог
                </button>
                <button
                  onClick={() => setActiveTab("master-classes")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === "master-classes" ? "bg-firm-orange text-white" : "hover:bg-[#eaeaea]"}`}
                >
                  <span>🎓</span> Мастер-классы
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === "profile" ? "bg-firm-pink text-white" : "hover:bg-[#eaeaea]"}`}
                >
                  {" "}
                  <span>👤</span> Профиль
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === "settings" ? "bg-firm-orange text-white" : "hover:bg-[#eaeaea]"}`}
                >
                  <span>⚙️</span> Настройки
                </button>
                <div className="border-t border-gray-200 my-2"></div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 text-red-600 hover:bg-red-50"
                >
                  <span>🚪</span> Выйти
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-4/5">
            {/* Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="flex gap-4 justify-between">
                  <div className="bg-white rounded-lg shadow-md p-6 w-full">
                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                      Просмотры
                    </p>
                    <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-firm-orange">
                      {stats.total_views}
                    </p>
                    <p className="text-xs text-firm-green mt-1">
                      +{stats.monthly_views} за месяц
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6 w-full">
                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                      Заказы
                    </p>
                    <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-firm-pink">
                      {stats.total_orders}
                    </p>
                    <p className="text-xs text-firm-green mt-1">
                      +{stats.monthly_orders} за месяц
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6 w-full">
                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                      Выручка
                    </p>
                    <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-firm-green">
                      {stats.total_revenue.toLocaleString()} ₽
                    </p>
                    <p className="text-xs text-firm-green mt-1">
                      +{stats.monthly_revenue.toLocaleString()} ₽ за месяц
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6 w-full">
                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                      Подписчики
                    </p>
                    <p className="text-3xl font-bold font-['Montserrat_Alternates'] text-firm-orange">
                      {stats.total_followers}
                    </p>
                    <p className="text-xs text-firm-green mt-1">+12 за месяц</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4">
                    Быстрые действия
                  </h3>
                  <div className="flex justify-between gap-5">
                    <Link
                      href="/master/products/new"
                      className="w-full px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 text-center"
                    >
                      + Добавить товар
                    </Link>
                    <Link
                      href="/master/blog/new"
                      className="w-full px-4 py-2 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 text-center"
                    >
                      + Новая запись в блоге
                    </Link>
                    <Link
                      href="/master/master-classes/new"
                      className="w-full px-4 py-2 border-2 border-firm-orange text-firm-orange rounded-lg hover:bg-firm-orange hover:text-white transition-all duration-300 text-center"
                    >
                      + Создать мастер-класс
                    </Link>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">
                      Последние заказы
                    </h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-sm text-firm-orange hover:underline"
                    >
                      Все заказы →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((order: Order) => (
                      <div
                        key={order.id}
                        className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div>
                          <p className="font-semibold">{order.product_title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-gray-500">
                              {order.buyer_name}
                            </p>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-sm text-gray-500">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                          >
                            {getStatusText(order.status)}
                          </span>
                          <span className="font-semibold text-firm-orange">
                            {order.total_amount} ₽
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">
                      Популярные товары
                    </h3>
                    <button
                      onClick={() => setActiveTab("products")}
                      className="text-sm text-firm-pink hover:underline"
                    >
                      Все товары →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {products
                      .filter((p: Product) => p.status === "active")
                      .sort((a: Product, b: Product) => b.views - a.views)
                      .slice(0, 3)
                      .map((product: Product) => (
                        <div
                          key={product.id}
                          className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div>
                            <p className="font-semibold">{product.title}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {product.views} просмотров
                            </p>
                          </div>
                          <span className="font-semibold text-firm-pink">
                            {product.price} ₽
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                    Мои товары
                  </h2>
                  <Link
                    href="/master/products/new"
                    className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2"
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
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">
                  Заказы
                </h2>
                <div className="space-y-4">
                  {orders.map(
                    (order: {
                      id: string;
                      order_number: string;
                      status: string;
                      created_at: string;
                      product_title: string;
                      buyer_name: string;
                      total_amount: number;
                    }) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-['Montserrat_Alternates'] font-semibold text-lg">
                                Заказ #{order.order_number}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                              >
                                {getStatusText(order.status)}
                              </span>
                            </div>
                            <p className="font-medium">{order.product_title}</p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(order.created_at)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <p className="text-gray-500">Покупатель</p>
                            <p className="font-medium">{order.buyer_name}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            {order.status === "new" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleOrderStatusChange(
                                      order.id,
                                      "confirmed",
                                    )
                                  }
                                  className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                                >
                                  Подтвердить
                                </button>
                                <button
                                  onClick={() =>
                                    handleOrderStatusChange(
                                      order.id,
                                      "cancelled",
                                    )
                                  }
                                  className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                                >
                                  Отклонить
                                </button>
                              </>
                            )}
                            {order.status === "confirmed" && (
                              <button
                                onClick={() =>
                                  handleOrderStatusChange(order.id, "shipped")
                                }
                                className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                              >
                                Отметить как отправлено
                              </button>
                            )}
                            {order.status === "shipped" && (
                              <button
                                onClick={() =>
                                  handleOrderStatusChange(order.id, "delivered")
                                }
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                              >
                                Подтвердить доставку
                              </button>
                            )}
                          </div>
                          <span className="font-['Montserrat_Alternates'] font-bold text-firm-pink text-xl">
                            {order.total_amount} ₽
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Blog Tab */}
            {activeTab === "blog" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">
                    Мой блог
                  </h2>
                  <Link
                    href="/master/blog/new"
                    className="px-4 py-2 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2"
                  >
                    + Новая запись
                  </Link>
                </div>
                <div className="space-y-4">
                  {blogPosts.map((post: BlogPost) => (
                    <div
                      key={post.id}
                      className="border rounded-lg p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">
                            {post.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}
                        >
                          {getStatusText(post.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {post.excerpt || post.content?.substring(0, 200)}...
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>👁️ {post.views_count || 0} просмотров</span>
                          <span>
                            💬 {post.comments_count || 0} комментариев
                          </span>
                          <span>❤️ {post.likes_count || 0} лайков</span>
                        </div>
                        <div className="flex gap-3">
                          <Link
                            href={`/master/blog/${post.id}/edit`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Редактировать
                          </Link>
                          <button
                            onClick={() => handleBlogPostDelete(post.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Master Classes Tab */}
            {activeTab === "master-classes" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">
                    Мои мастер-классы
                  </h2>
                  <Link
                    href="/master/master-classes/new"
                    className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2"
                  >
                    + Создать мастер-класс
                  </Link>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  <button
                    onClick={() => setMasterClassFilter("all")}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${masterClassFilter === "all" ? "bg-firm-orange text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                  >
                    Все ({masterClasses.length})
                  </button>
                  <button
                    onClick={() => setMasterClassFilter("published")}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${masterClassFilter === "published" ? "bg-firm-orange text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                  >
                    Опубликованные (
                    {
                      masterClasses.filter(
                        (mc: { status: string }) => mc.status === "published",
                      ).length
                    }
                    )
                  </button>
                  <button
                    onClick={() => setMasterClassFilter("draft")}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${masterClassFilter === "draft" ? "bg-firm-orange text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                  >
                    Черновики (
                    {
                      masterClasses.filter(
                        (mc: { status: string }) => mc.status === "draft",
                      ).length
                    }
                    )
                  </button>
                  <button
                    onClick={() => setMasterClassFilter("cancelled")}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${masterClassFilter === "cancelled" ? "bg-firm-orange text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                  >
                    Отмененные (
                    {
                      masterClasses.filter(
                        (mc: { status: string }) => mc.status === "cancelled",
                      ).length
                    }
                    )
                  </button>
                </div>

                {masterClasses.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">
                      У вас нет созданных мастер-классов
                    </p>
                    <Link
                      href="/master/master-classes/new"
                      className="inline-block px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
                    >
                      Создать первый мастер-класс →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {masterClasses
                      .filter(
                        (mc: { status: string }) =>
                          masterClassFilter === "all" ||
                          mc.status === masterClassFilter,
                      )
                      .map(
                        (mc: {
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
                        }) => (
                          <div
                            key={mc.id}
                            className="border border-gray-100 rounded-lg p-5 hover:shadow-md transition-shadow"
                          >
                            <div className="flex gap-4">
                              {mc.image_url && (
                                <div className="w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                  <Image
                                    src={mc.image_url}
                                    alt={mc.title}
                                    className="w-full h-full object-cover"
                                    width={160}
                                    height={160}
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">
                                      {mc.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs ${mc.type === "online" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                                      >
                                        {mc.type === "online"
                                          ? "🖥️ Онлайн"
                                          : "📍 Офлайн"}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(mc.status)}`}
                                      >
                                        {getStatusText(mc.status)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-firm-orange">
                                      {mc.price} ₽
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {mc.current_participants || 0}/
                                      {mc.max_participants} участников
                                    </div>
                                  </div>
                                </div>
                                <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                                  {mc.description}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    📅 {formatDate(mc.date_time)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    ⏰ {formatTime(mc.date_time)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    ⏱️ {mc.duration_minutes} мин
                                  </div>
                                  {mc.type === "offline" && mc.location && (
                                    <div className="flex items-center gap-1">
                                      📍 {mc.location}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedMasterClass(mc);
                                      setShowParticipantsModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
                                  >
                                    👥 Участники (
                                    {mc.registrations?.length || 0})
                                  </button>
                                  {mc.status === "published" &&
                                    new Date(mc.date_time) > new Date() && (
                                      <button
                                        onClick={() =>
                                          handleCancelMasterClass(mc.id)
                                        }
                                        className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-500 hover:text-white transition"
                                      >
                                        Отменить
                                      </button>
                                    )}
                                  {mc.status === "draft" && (
                                    <>
                                      <Link
                                        href={`/master/master-classes/${mc.id}/edit`}
                                        className="px-3 py-1.5 bg-firm-orange text-white rounded-lg text-sm hover:bg-opacity-90 transition"
                                      >
                                        Редактировать
                                      </Link>
                                      <button
                                        onClick={() =>
                                          handleDeleteMasterClass(mc.id)
                                        }
                                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                                      >
                                        Удалить
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                  </div>
                )}
              </div>
            )}

            {/* Participants Modal */}
            {showParticipantsModal && selectedMasterClass && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowParticipantsModal(false)}
              >
                <div
                  className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">
                      Участники: {selectedMasterClass.title}
                    </h2>
                    <button
                      onClick={() => setShowParticipantsModal(false)}
                      className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedMasterClass.registrations?.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Нет записавшихся участников
                      </p>
                    ) : (
                      selectedMasterClass.registrations?.map(
                        (reg: {
                          id: string;
                          user_name?: string;
                          user_email: string;
                          user_phone?: string;
                          created_at: string;
                          payment_status: string;
                        }) => (
                          <div key={reg.id} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">
                                  {reg.user_name || reg.user_email}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {reg.user_email}
                                </p>
                                {reg.user_phone && (
                                  <p className="text-sm text-gray-500">
                                    {reg.user_phone}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400">
                                  Записан: {formatDate(reg.created_at)}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs ${reg.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                                >
                                  {reg.payment_status === "paid"
                                    ? "Оплачено"
                                    : "Ожидает оплаты"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">
                    Профиль мастера
                  </h2>
                  {!isEditing ? (
                    <button
                      className="px-4 py-2 border-2 border-firm-pink rounded-lg hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white transition-all duration-300 font-['Montserrat_Alternates']"
                      onClick={() => setIsEditing(true)}
                    >
                      Редактировать
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-['Montserrat_Alternates']"
                      onClick={() => {
                        setIsEditing(false);
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                    >
                      Отмена
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                        Имя <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2"
                        type="text"
                        name="fullname"
                        value={profileData.fullname}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                        Телефон
                      </label>
                      <input
                        className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink focus:outline-2"
                        type="tel"
                        name="phone"
                        value={profileData.phone || ""}
                        onChange={handleInputChange}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                        Город
                      </label>
                      <input
                        className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2"
                        type="text"
                        name="city"
                        value={profileData.city || ""}
                        onChange={handleInputChange}
                        placeholder="Москва"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                        Адрес
                      </label>
                      <input
                        className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink focus:outline-2"
                        type="text"
                        name="address"
                        value={profileData.address || ""}
                        onChange={handleInputChange}
                        placeholder="ул. Примерная, д. 1"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                        Описание
                      </label>
                      <textarea
                        className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2"
                        name="description"
                        value={profileData.description || ""}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Расскажите о себе и своем творчестве..."
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          name="custom_orders_enabled"
                          checked={profileData.custom_orders_enabled}
                          onChange={handleCheckboxChange}
                          className="w-5 h-5 appearance-none border-2 border-firm-pink rounded-md bg-[#EAEAEA] checked:bg-firm-pink checked:border-firm-pink transition-all duration-200 cursor-pointer"
                        />
                        {profileData.custom_orders_enabled && (
                          <svg
                            className="absolute w-4 h-4 text-white left-0.5 top-0.5 pointer-events-none"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <label className="text-gray-700 cursor-pointer select-none font-['Montserrat_Alternates']">
                        Принимаю индивидуальные заказы
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full mt-6 p-3 bg-firm-pink text-white rounded-lg hover:scale-105 transition-all duration-300 font-['Montserrat_Alternates'] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Сохранение..." : "Сохранить изменения"}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-b border-gray-400 pb-4">
                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                          Имя
                        </p>
                        <p className="text-lg font-medium">
                          {profileData.fullname}
                        </p>
                      </div>
                      <div className="border-b border-gray-400 pb-4">
                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                          Email
                        </p>
                        <p className="text-lg font-medium">
                          {profileData.email}
                        </p>
                      </div>
                      <div className="border-b border-gray-400 pb-4">
                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                          Телефон
                        </p>
                        <p className="text-lg font-medium">
                          {profileData.phone || "Не указано"}
                        </p>
                      </div>
                      <div className="border-b border-gray-400 pb-4">
                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                          Город
                        </p>
                        <p className="text-lg font-medium">
                          {profileData.city || "Не указано"}
                        </p>
                      </div>
                      <div className="col-span-2 border-gray-400 border-b pb-4">
                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                          Описание
                        </p>
                        <p className="text-lg font-medium">
                          {profileData.description || "Не указано"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                          Индивидуальные заказы
                        </p>
                        <p className="text-lg font-medium">
                          {profileData.custom_orders_enabled
                            ? "✅ Принимаю"
                            : "❌ Не принимаю"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">
                  Настройки
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">
                      Смена пароля
                    </h3>
                    <form className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                          Текущий пароль
                        </label>
                        <input
                          type="password"
                          className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                          Новый пароль
                        </label>
                        <input
                          type="password"
                          className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink"
                          placeholder="не менее 6 символов"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">
                          Подтверждение
                        </label>
                        <input
                          type="password"
                          className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange"
                          placeholder="повторите пароль"
                        />
                      </div>
                      <button className="px-4 py-2 border-2 border-firm-orange rounded-lg hover:scale-105 transition-all duration-300 font-['Montserrat_Alternates']">
                        Изменить пароль
                      </button>
                    </form>
                  </div>
                  <div className="border-t border-gray-400 pt-6">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">
                      Уведомления
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-firm-orange"
                          defaultChecked
                        />
                        <span className="font-['Montserrat_Alternates']">
                          О новых заказах
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-firm-pink"
                          defaultChecked
                        />
                        <span className="font-['Montserrat_Alternates']">
                          О сообщениях от покупателей
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-firm-orange"
                        />
                        <span className="font-['Montserrat_Alternates']">
                          О новых отзывах
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="border-t border-gray-400 pt-6">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">
                      Магазин
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-firm-pink"
                          defaultChecked
                        />
                        <span className="font-['Montserrat_Alternates']">
                          Автоматически подтверждать заказы
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-firm-orange"
                        />
                        <span className="font-['Montserrat_Alternates']">
                          Отображать мои товары в поиске
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="border-t border-gray-400 pt-6">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 text-red-600">
                      Опасная зона
                    </h3>
                    <button className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300">
                      Удалить аккаунт
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
