"use client";

import { signOut } from "next-auth/react";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import MasterProductsList, { Product } from "@/components/master/MasterProductsList";
import AddProductModal from "@/components/modals/AddProductModal";
import AddPostModal from "@/components/modals/AddPostModal";
import AddClassModal from "@/components/modals/AddClassModal";
import EditProductModal from "@/components/modals/EditProductModal";
import BlogPostCard from "@/components/blog/BlogPostCard";
import EditPostModal from "@/components/modals/EditPostModal";
import EditClassModal from "@/components/modals/EditClassModal";
import { StarRating } from "@/components/ui/StarRating";

import { DashboardIcon } from "@/components/icons/DashboardIcon";
import { ProductsIcon } from "@/components/icons/ProductsIcon";
import { CartIcon } from "@/components/icons/CartIcon";
import { BlogIcon } from "@/components/icons/BlogIcon";
import { ClassesIcon } from "@/components/icons/ClassesIcon";
import { UserIcon } from "@/components/icons/UserIcon";
import { SettingsIcon } from "@/components/icons/SettingsIcon";
import { ExitIcon } from "@/components/icons/ExitIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { SaveIcon } from "@/components/icons/SaveIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { LocateIcon } from "@/components/icons/LocateIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { CalendarIcon } from "@/components/icons/CalendarIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";
import { OnlineIcon } from "@/components/icons/OnlineIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { UsersIcon } from "@/components/icons/UsersIcon";
import { MasterIcon } from "@/components/icons/MasterIcon";
import { CatalogPinkIcon } from "@/components/icons/CatalogPinkIcon";
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon";
import { StarIcon } from "@/components/icons/StarIcon";
import { ViewsIcon } from "../icons/ViewsIcon";

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
  items?: OrderItem[];
}

interface OrderItem {
  id: number;
  product_id: string;
  product_title: string;
  quantity: number;
  price: number;
  total: number;
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
  category?: string;
  tags?: string;
  main_image_url?: string;
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
  online_link?: string;
  materials?: string;
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
  main_image_url: string;
}

interface CategoryItem {
  id: number;
  name: string;
  subcategories?: CategoryItem[];
}

interface EditProductData {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  technique: string;
  size: string;
  care_instructions: string;
  color: string;
  main_image_url?: string;
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
}

interface EditPostData {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string;
}

interface EditClassData {
  id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  max_participants: number;
  date_time: string;
  duration_minutes: number;
  location?: string;
  online_link?: string;
  materials?: string;
  image_url?: string;
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
  const [selectedMasterClass, setSelectedMasterClass] = useState<{id: string; title: string; registrations?: Array<{id: string; user_name?: string; user_email: string; user_phone?: string; created_at: string; payment_status: string;}>;} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditProductData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditPostData | null>(null);
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<EditClassData | null>(null);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [yarns, setYarns] = useState<{ id: string; name: string; brand: string }[]>([]);

  const [profileData, setProfileData] = useState({fullname: "", email: "", phone: "", city: "", address: "", avatarUrl: null as string | null, description: "", is_verified: false, is_partner: false, rating: 0, total_sales: 0, custom_orders_enabled: false, followers: 0});

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [masterClasses, setMasterClasses] = useState<MasterClass[]>([]);
  const [stats, setStats] = useState({ total_views: 0, total_orders: 0, total_revenue: 0, total_followers: 0, monthly_views: 0, monthly_orders: 0, monthly_revenue: 0, total_products: 0});

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info'}>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });

  const [orderStats, setOrderStats] = useState({new: 0, processing: 0,shipped: 0, delivered: 0, cancelled: 0, total: 0});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchMasterData();
    loadCategories();
    loadYarns();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);

      const [profileRes, productRes, ordersRes, blogRes, classesRes] = await Promise.all([fetch("/api/master/profile"), fetch("/api/master/products"), fetch("/api/master/orders"), fetch("/api/master/blog"), fetch("/api/master/master-classes")]);

      let profileDataObj = {fullname: "", email: "", phone: "", city: "", address: "", avatarUrl: null as string | null, description: "", is_verified: false, is_partner: false, rating: 0, total_sales: 0, custom_orders_enabled: false, followers: 0};

      if (profileRes.ok) {
        const profileJson: ProfileApiResponse = await profileRes.json();
        const p = profileJson.profile;
        profileDataObj = {fullname: p.fullname || "", email: p.email || "", phone: p.phone || "", city: p.city || "", address: p.address || "", avatarUrl: p.avatar_url || null, description: p.description || "", is_verified: p.is_verified || false, is_partner: p.is_partner || false, rating: p.rating || 0, total_sales: p.total_sales || 0, custom_orders_enabled: p.custom_orders_enabled || false, followers: p.followers || 0}
      }
      setProfileData(profileDataObj);

      let productsList: Product[] = [];
      if (productRes.ok) {
        const productJson: ProductsApiResponse = await productRes.json();
        productsList = productJson.products || [];
      }
      setProducts(productsList);

      let ordersList: Order[] = [];
      if (ordersRes.ok) {
        const ordersJson: OrdersApiResponse = await ordersRes.json();
        ordersList = ordersJson.orders || [];
      }
      setOrders(ordersList);

      const totalSoldItems = ordersList.reduce((sum, order) => {return sum + (order.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0)}, 0);

      setProfileData(prev => ({...prev, total_sales: totalSoldItems}));

      const orderStatsObj = {new: ordersList.filter((o: Order) => o.status === 'new').length, processing: ordersList.filter((o: Order) => o.status === 'processing').length, shipped: ordersList.filter((o: Order) => o.status === 'shipped').length, delivered: ordersList.filter((o: Order) => o.status === 'delivered').length, cancelled: ordersList.filter((o: Order) => o.status === 'cancelled').length, total: ordersList.length};
      setOrderStats(orderStatsObj);

      let blogList: BlogPost[] = [];
      if (blogRes.ok) {
        const blogData = await blogRes.json();
        if (blogData.posts && Array.isArray(blogData.posts)) {blogList = blogData.posts.map((post: BlogPostFromApi) => ({id: post.id, title: post.title,  status: post.status, created_at: post.created_at, excerpt: post.excerpt || post.content?.substring(0, 200), content: post.content, views_count: post.views || 0, comments_count: post.stats?.comments_count || 0, likes_count: post.stats?.likes_count || 0, category: "", tags: "", main_image_url: post.main_image_url}));
        } else if (Array.isArray(blogData)) {
          blogList = blogData;
        }
      }
      setBlogPosts(blogList);

      let classesList: MasterClass[] = [];
      if (classesRes.ok) {
        const classesJson: MasterClassesApiResponse = await classesRes.json();
        classesList = classesJson.classes || [];
      }
      setMasterClasses(classesList);

      const totalViews = productsList.reduce((sum: number, p: Product) => sum + (p.views || 0), 0);
      const totalRevenue = ordersList.reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyOrders = ordersList.filter((o: Order) => new Date(o.created_at) > thirtyDaysAgo);
      const monthlyRevenue = monthlyOrders.reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0);

      let followersCount = profileDataObj.followers;
      try {
        const followersRes = await fetch(`/api/masters/${session?.user?.id}/followers-count`);
        if (followersRes.ok) {
          const followersData = await followersRes.json();
          followersCount = followersData.count || followersData.followers_count || 0;
        }
      } catch (error) {
        console.error("Error fetching followers count:", error);
      }

      setStats({total_views: totalViews, total_orders: ordersList.length, total_revenue: totalRevenue, total_followers: followersCount, monthly_views: Math.round(totalViews * 0.3), monthly_orders: monthlyOrders.length, monthly_revenue: monthlyRevenue, total_products: productsList.length});
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
      formData.append("custom_orders_enabled", String(profileData.custom_orders_enabled));

      if (avatarFile) {formData.append("avatar", avatarFile)}

      const response = await fetch("/api/master/profile", {method: "PUT", body: formData});

      if (response.ok) {
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

  const handleCustomOrdersToggle = async () => {
    const newValue = !profileData.custom_orders_enabled;
    setProfileData(prev => ({ ...prev, custom_orders_enabled: newValue }));

    try {
      const formData = new FormData();
      formData.append("custom_orders_enabled", String(newValue));

      const response = await fetch("/api/master/profile", {method: "PUT", body: formData});

      if (!response.ok) {
        setProfileData(prev => ({ ...prev, custom_orders_enabled: !newValue }));
        const error = await response.json();
        toast.error(error.error || 'Ошибка обновления статуса');
      } else {
        toast.success(newValue ? 'Вы теперь принимаете индивидуальные заказы' : 'Вы больше не принимаете индивидуальные заказы');
        await fetchMasterData();
      }
    } catch (error) {
      setProfileData(prev => ({ ...prev, custom_orders_enabled: !newValue }));
      toast.error('Ошибка при обновлении статуса');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setAvatarPreview(reader.result as string)};
      reader.readAsDataURL(file);
    }
  };

  const handleEditProduct = (product: Product) => {setEditingProduct({id: product.id, title: product.title, description: product.description || "", price: product.price, category: product.category || "", technique: product.technique || "", size: product.size || "", care_instructions: product.care_instructions || "", color: product.color || "", main_image_url: product.main_image_url || undefined, images: product.images || []}); setIsEditModalOpen(true)};

  const handleEditPost = (post: BlogPost) => {
    setEditingPost({id: post.id, title: post.title, content: post.content || "", excerpt: post.excerpt || "", category: post.category || "", tags: post.tags || ""});
    setIsEditPostModalOpen(true);
  };

  const handleEditClass = (mc: MasterClass) => {
    setEditingClass({id: mc.id, title: mc.title, description: mc.description, type: mc.type, price: mc.price, max_participants: mc.max_participants, date_time: mc.date_time, duration_minutes: mc.duration_minutes, location: mc.location,  online_link: mc.online_link || "", materials: mc.materials || "", image_url: mc.image_url}); 
    setIsEditClassModalOpen(true)
  };

  const handleCancelMasterClass = async (classId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Отмена мастер-класса',
      message: 'Отменить мастер-класс? Участники получат уведомление.',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/master/master-classes/${classId}/cancel`, { method: "POST" });
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
      }
    });
  };

  const handleDeleteMasterClass = async (classId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление мастер-класса',
      message: 'Вы уверены, что хотите удалить этот мастер-класс? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/master/master-classes/${classId}`, { method: "DELETE" });
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
      }
    });
  };

  const handleProductDelete = async (productId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление товара',
      message: 'Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/master/products/${productId}`, { method: "DELETE" });
          if (response.ok) {
            setProducts((prev) => prev.filter((p: Product) => p.id !== productId));
            toast.success("Товар удален");
          }
        } catch (error) {
          console.error("Error deleting product:", error);
          toast.error("Ошибка при удалении товара");
        }
      }
    });
  };

  const handleBlogPostDelete = async (postId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление поста',
      message: 'Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/master/blog/${postId}`, { method: "DELETE" });
          if (response.ok) {
            setBlogPosts((prev) => prev.filter((p: BlogPost) => p.id !== postId));
            toast.success("Пост удален");
          }
        } catch (error) {
          console.error("Error deleting blog post:", error);
          toast.error("Ошибка при удалении поста");
        }
      }
    });
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/master/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus })});

      if (response.ok) {
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)),
        );
        toast.success(`Статус заказа изменен на "${getStatusText(newStatus)}"`);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Ошибка при обновлении статуса");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {return new Date(dateString).toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric"})};

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "text-blue-600 bg-blue-50";
      case "confirmed": return "text-green-600 bg-green-50";
      case "shipped": return "text-purple-600 bg-purple-50";
      case "delivered": return "text-gray-600 bg-gray-50";
      case "cancelled": return "text-red-600 bg-red-50";
      case "moderation": return "text-yellow-600 bg-yellow-50";
      case "active": return "text-green-600 bg-green-50";
      case "published": return "text-green-600 bg-green-50";
      case "draft": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new": return "Новый";
      case "confirmed": return "Подтвержден";
      case "shipped": return "Отправлен";
      case "delivered": return "Доставлен";
      case "cancelled": return "Отменен";
      case "moderation": return "На модерации";
      case "active": return "Активен";
      case "published": return "Опубликован";
      case "draft": return "Черновик";
      default: return status;
    }
  };

  const navItems = [{id: "dashboard", icon: <DashboardIcon />, label: "Панель управления", count: null }, { id: "products", icon: <ProductsIcon />, label: "Мои товары", count: products.length }, { id: "orders", icon: <CartIcon />, label: "Заказы", count: orders.filter((o) => o.status === "new").length }, { id: "blog", icon: <BlogIcon />, label: "Блог", count: blogPosts.length },  { id: "master-classes", icon: <ClassesIcon />, label: "Мастер-классы", count: masterClasses.length }, { id: "profile", icon: <UserIcon />, label: "Профиль", count: null }, { id: "settings", icon: <SettingsIcon />, label: "Настройки", count: null }];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 font-montserrat text-firm-gray text-sm sm:text-base">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main">
      <Toaster position="top-right" />

      <div className="mt-3 sm:mt-5 flex items-start justify-center py-6 sm:py-8 px-3 sm:px-4">
        <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-7xl">
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-linear-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="font-montserrat font-bold text-2xl sm:text-3xl md:text-4xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Панель мастера</h1>
                <p className="text-firm-gray mt-1 sm:mt-2 text-xs sm:text-sm">Добро пожаловать, {profileData.fullname || session?.user?.name || "Мастер"}!</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.is_verified && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-firm-green rounded-full text-xs"><CheckCircleIcon className="w-3 h-3" color="#94D06C" />Верифицированный мастер</span>)}
                  {profileData.is_partner && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-firm-orange/10 text-firm-orange rounded-full text-xs"><StarIcon className="w-3 h-3" color="#F4A67F" />Партнер фабрики</span>)}
                  {profileData.custom_orders_enabled && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-firm-pink/10 text-firm-pink rounded-full text-xs"><CartIcon className="w-3 h-3" color="#D97C8E" />Принимаю инд. заказы</span>)}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                {[{ label: "Новые заказы", value: orderStats.new, icon: <CartIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#D97C8E" size={32} />, color: "#D97C8E", bg: "bg-pink-50" }, { label: "Всего заказов", value: orderStats.total, icon: <CartIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#94D06C" size={32} />, color: "#94D06C", bg: "bg-green-50" }, { label: "Товаров", value: stats.total_products, icon: <ProductsIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#F4A67F" size={32} />, color: "#F4A67F", bg: "bg-orange-50" }, { label: "Просмотров", value: stats.total_views, icon: <ViewsIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#D77C7C" size={32} />, color: "#D77C7C", bg: "bg-red-50" }].map((stat, idx) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} whileHover={{ y: -5 }} className={`bg-main rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300 ${stat.bg} border border-gray-100`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-firm-gray text-xs sm:text-sm font-['Montserrat_Alternates']">{stat.label}</p>
                        <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.1, type: "spring" }} className="text-xl sm:text-2xl md:text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value.toLocaleString()}</motion.p>
                      </div>
                      <div className="opacity-80">{stat.icon}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-4 sm:gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="md:w-1/3 lg:w-1/4">
              <div className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 sticky top-5 border border-gray-100">
                <div className="flex flex-col items-center mb-4 sm:mb-6">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden border-4 border-main shadow-lg group">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                    ) : profileData.avatarUrl ? (
                      <img src={`/api/proxy/avatar?url=${encodeURIComponent(profileData.avatarUrl)}`} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl sm:text-3xl md:text-4xl font-montserrat font-bold text-main">
                        {profileData.fullname?.charAt(0).toUpperCase() || session?.user?.name?.charAt(0).toUpperCase() || "М"}
                      </span>
                    )}

                    {isEditing && (
                      <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-main text-[10px] sm:text-xs">Изменить</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                    )}
                  </div>
                  <h3 className="mt-3 sm:mt-4 font-montserrat font-semibold text-base sm:text-lg md:text-xl text-center line-clamp-1">{profileData.fullname || session?.user?.name}</h3>
                  <p className="text-xs sm:text-sm text-firm-gray text-center line-clamp-1">{profileData.email || session?.user?.email}</p>
                  {profileData.city && (<p className="text-[10px] sm:text-xs text-firm-gray mt-1 sm:mt-2 flex items-center gap-1"><LocateIcon color="#D97C8E" className="w-2 h-2 sm:w-3 sm:h-3" /><span className="truncate">{profileData.city}</span></p>)}

                  <div className="flex items-center gap-1 mt-2 sm:mt-3">
                    <StarRating rating={profileData.rating} size="md" />
                    <span className="text-xs sm:text-sm font-semibold ml-1 text-text">{profileData.rating}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text mt-1">{profileData.total_sales || 0} продаж</p>
                  <p className="text-xs sm:text-sm text-firm-gray mt-1">{stats.total_followers || 0} подписчиков</p>
                </div>

                <nav className="space-y-1 sm:space-y-2">
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const iconColor = item.id === 'dashboard' ? '#D97C8E' :  item.id === 'products' ? '#D97C8E' : item.id === 'orders' ? '#D97C8E' : item.id === 'blog' ? '#D97C8E' : item.id === 'master-classes' ? '#D97C8E' : item.id === 'profile' ? '#D97C8E' : '#D97C8E';
                    
                    return (<motion.button key={item.id} whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab(item.id)} className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-montserrat flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${activeTab === item.id ? "bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-lg" : "hover:bg-gray-100 text-text"}`}>{React.cloneElement(IconComponent, {color: activeTab === item.id ? "#f9f9f9" : iconColor, className: "w-4 h-4 sm:w-5 sm:h-5"})}<span className="flex-1 truncate">{item.label}</span>{item.count !== null && item.count > 0 && (<span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${activeTab === item.id ? "bg-main text-firm-orange" : "bg-firm-orange/20 text-firm-orange"}`}>{item.count}</span>)}</motion.button>);
                  })}

                  <div className="border-t border-gray-200 my-2 pt-2" />

                  <motion.button whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-montserrat flex items-center gap-2 sm:gap-3 text-firm-red hover:bg-red-50 text-sm sm:text-base"><ExitIcon color="#D77C7C" className="w-4 h-4 sm:w-5 sm:h-5" /><span>Выйти</span></motion.button>
                </nav>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:w-2/3 lg:w-3/4"
            >
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                      <div className="bg-main rounded-xl p-3 sm:p-4 border border-gray-100">
                        <p className="text-firm-gray text-xs sm:text-sm">Просмотры</p>
                        <p className="text-xl sm:text-2xl font-bold text-firm-orange">{stats.total_views.toLocaleString()}</p>
                      </div>
                      <div className="bg-main rounded-xl p-3 sm:p-4 border border-gray-100">
                        <p className="text-firm-gray text-xs sm:text-sm">Заказы</p>
                        <p className="text-xl sm:text-2xl font-bold text-firm-pink">{stats.total_orders}</p>
                      </div>
                      <div className="bg-main rounded-xl p-3 sm:p-4 border border-gray-100">
                        <p className="text-firm-gray text-xs sm:text-sm">Выручка</p>
                        <p className="text-xl sm:text-2xl font-bold text-firm-green">{stats.total_revenue.toLocaleString()} ₽</p>
                      </div>
                      <div className="bg-main rounded-xl p-3 sm:p-4 border border-gray-100">
                        <p className="text-firm-gray text-xs sm:text-sm">Подписчики</p>
                        <p className="text-xl sm:text-2xl font-bold text-firm-orange">{stats.total_followers}</p>
                      </div>
                    </div>

                    <div className="bg-main rounded-xl p-4 sm:p-6 border border-gray-100 mb-6">
                      <h3 className="font-montserrat font-semibold text-lg text-text mb-4">Быстрые действия</h3>
                      <div className="flex flex-wrap gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAddProductModal(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl text-sm hover:shadow-lg transition"
                        >
                          <PlusIcon className="w-4 h-4" color="#f9f9f9" />
                          Добавить товар
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAddPostModal(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-main rounded-xl text-sm hover:shadow-lg transition"
                        >
                          <PlusIcon className="w-4 h-4" color="#f9f9f9" />
                          Новая запись
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAddClassModal(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-firm-orange text-firm-orange rounded-xl text-sm hover:bg-firm-orange hover:text-main transition"
                        >
                          <PlusIcon className="w-4 h-4" color="#F4A67F" />
                          Создать МК
                        </motion.button>
                      </div>
                    </div>

                    <div className="bg-main rounded-xl p-4 sm:p-6 border border-gray-100">
                      <h3 className="font-montserrat font-semibold text-lg text-text mb-4">Последние заказы</h3>
                      <div className="space-y-3">
                        {orders.slice(0, 5).map((order, idx) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                          >
                            <div>
                              <p className="font-medium text-text">{order.product_title}</p>
                              <p className="text-xs text-firm-gray">{order.buyer_name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                              <p className="font-semibold text-firm-orange text-sm">{order.total_amount.toLocaleString()} ₽</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "products" && (
                  <motion.div
                    key="products"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <h2 className="font-montserrat font-semibold text-xl sm:text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Мои товары
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddProductModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl text-sm hover:shadow-lg transition"
                      >
                        <PlusIcon className="w-4 h-4" color="#f9f9f9" />
                        Добавить товар
                      </motion.button>
                    </div>

                    <MasterProductsList
                      products={products}
                      onDelete={handleProductDelete}
                      onProductAdded={fetchMasterData}
                      masterName={profileData.fullname}
                      loading={false}
                      categories={categories}
                      yarns={yarns}
                    />
                  </motion.div>
                )}

                {activeTab === "orders" && (
                  <motion.div
                    key="orders"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
                  >
                    <h2 className="font-montserrat font-semibold text-xl sm:text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                      Заказы
                    </h2>

                    {orders.length === 0 ? (
                      <div className="text-center py-8 sm:py-12 bg-main rounded-xl">
                        <CartIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-firm-gray opacity-50" />
                        <p className="text-firm-gray mt-3 mb-4">У вас пока нет заказов</p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {orders.map((order, idx) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border border-gray-200 rounded-xl p-3 sm:p-5 hover:shadow-lg transition-all"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-montserrat font-semibold text-sm sm:text-base">Заказ #{order.order_number}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(order.status)}`}>
                                  {getStatusText(order.status)}
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm text-firm-gray">{formatDate(order.created_at)}</span>
                            </div>

                            <p className="text-xs sm:text-sm text-firm-gray mb-2">{order.product_title}</p>

                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <p className="text-xs sm:text-sm text-firm-gray">Покупатель: {order.buyer_name}</p>
                              <div className="flex gap-2">
                                {order.status === "new" && (
                                  <>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleOrderStatusChange(order.id, "confirmed")}
                                      className="px-3 py-1 bg-firm-green text-main rounded-lg text-xs hover:shadow-md transition"
                                    >
                                      Подтвердить
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => handleOrderStatusChange(order.id, "cancelled")}
                                      className="px-3 py-1 bg-firm-red text-main rounded-lg text-xs hover:shadow-md transition"
                                    >
                                      Отклонить
                                    </motion.button>
                                  </>
                                )}
                                {order.status === "confirmed" && (
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleOrderStatusChange(order.id, "shipped")}
                                    className="px-3 py-1 bg-firm-pink text-main rounded-lg text-xs hover:shadow-md transition"
                                  >
                                    Отправить
                                  </motion.button>
                                )}
                                <span className="font-montserrat font-bold text-base sm:text-lg text-firm-orange">
                                  {order.total_amount.toLocaleString()} ₽
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "blog" && (
                  <motion.div
                    key="blog"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <h2 className="font-montserrat font-semibold text-xl sm:text-2xl bg-gradient-to-r from-firm-pink to-firm-orange bg-clip-text text-transparent">
                        Мой блог
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddPostModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-main rounded-xl text-sm hover:shadow-lg transition"
                      >
                        <PlusIcon className="w-4 h-4" color="#f9f9f9" />
                        Новая запись
                      </motion.button>
                    </div>

                    {blogPosts.length === 0 ? (
                      <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl">
                        <BlogIcon className="w-12 h-12 mx-auto text-firm-gray opacity-50" />
                        <p className="text-firm-gray mt-3 mb-4">У вас пока нет постов</p>
                        <button onClick={() => setShowAddPostModal(true)} className="text-firm-orange hover:underline text-sm">
                          Написать первый пост →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {blogPosts.map((post) => {
                          const normalizedPost = {
                            id: post.id,
                            title: post.title,
                            content: post.content || "",
                            excerpt: post.excerpt || "",
                            images: [],
                            main_image_url: post.main_image_url || undefined,
                            created_at: post.created_at,
                            views_count: post.views_count || 0,
                            likes_count: post.likes_count || 0,
                            comments_count: post.comments_count || 0,
                            author_name: profileData.fullname,
                            author_avatar: profileData.avatarUrl || undefined,
                            master_id: session?.user?.id || "",
                            master_name: profileData.fullname,
                            master_avatar: profileData.avatarUrl || undefined,
                            is_liked: false,
                            comments: [],
                          };
                          return (
                            <BlogPostCard
                              key={post.id}
                              post={normalizedPost}
                              isOwner={true}
                              onEdit={() => handleEditPost(post)}
                              onDelete={() => handleBlogPostDelete(post.id)}
                              variant="default"
                            />
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "master-classes" && (
                  <motion.div
                    key="master-classes"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <h2 className="font-montserrat font-semibold text-xl sm:text-2xl bg-gradient-to-r from-firm-pink to-firm-orange bg-clip-text text-transparent">
                        Мои мастер-классы
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddClassModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-firm-pink to-purple-500 text-main rounded-xl text-sm hover:shadow-lg transition"
                      >
                        <PlusIcon className="w-4 h-4" color="#f9f9f9" />
                        Создать МК
                      </motion.button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { id: "all", label: "Все", count: masterClasses.length },
                        { id: "published", label: "Опубликованные", count: masterClasses.filter((mc) => mc.status === "published").length },
                        { id: "draft", label: "Черновики", count: masterClasses.filter((mc) => mc.status === "draft").length },
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setMasterClassFilter(filter.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition whitespace-nowrap ${
                            masterClassFilter === filter.id
                              ? "bg-gradient-to-r from-firm-orange to-firm-pink text-main shadow-md"
                              : "border border-gray-200 hover:bg-gray-50 text-firm-gray"
                          }`}
                        >
                          {filter.label} ({filter.count})
                        </button>
                      ))}
                    </div>

                    {masterClasses.length === 0 ? (
                      <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl">
                        <ClassesIcon className="w-12 h-12 mx-auto text-firm-gray opacity-50" />
                        <p className="text-firm-gray mt-3 mb-4">У вас нет созданных мастер-классов</p>
                        <button onClick={() => setShowAddClassModal(true)} className="text-firm-orange hover:underline text-sm">
                          Создать первый мастер-класс →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {masterClasses
                          .filter((mc) => masterClassFilter === "all" || mc.status === masterClassFilter)
                          .map((mc, idx) => (
                            <motion.div
                              key={mc.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
                            >
                              <div className="flex flex-col sm:flex-row gap-4">
                                {mc.image_url && (
                                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                    <img src={mc.image_url} alt={mc.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                    <div>
                                      <h3 className="font-montserrat font-semibold text-base sm:text-lg text-text">{mc.title}</h3>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                          mc.type === "online" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                                        }`}>
                                          {mc.type === "online" ? <OnlineIcon className="w-3 h-3" /> : <LocateIcon className="w-3 h-3" />}
                                          {mc.type === "online" ? "Онлайн" : "Офлайн"}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(mc.status)}`}>
                                          {getStatusText(mc.status)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg sm:text-xl font-bold text-firm-orange">{mc.price.toLocaleString()} ₽</div>
                                      <div className="text-xs text-firm-gray">{mc.current_participants || 0}/{mc.max_participants} участников</div>
                                    </div>
                                  </div>
                                  <p className="text-firm-gray text-sm mt-2 line-clamp-2">{mc.description}</p>
                                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-firm-gray">
                                    <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{formatDate(mc.date_time)}</span>
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{formatTime(mc.date_time)}</span>
                                    <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{mc.duration_minutes} мин</span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => {
                                        setSelectedMasterClass(mc);
                                        setShowParticipantsModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-firm-gray rounded-lg text-xs hover:bg-gray-200 transition"
                                    >
                                      <UsersIcon className="w-3 h-3" />
                                      Участники ({mc.registrations?.length || 0})
                                    </motion.button>
                                    {mc.status === "published" && new Date(mc.date_time) > new Date() && (
                                      <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleCancelMasterClass(mc.id)}
                                        className="px-3 py-1 border border-firm-red text-firm-red rounded-lg text-xs hover:bg-firm-red hover:text-main transition"
                                      >
                                        Отменить
                                      </motion.button>
                                    )}
                                    {mc.status === "draft" && (
                                      <>
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleEditClass(mc)}
                                          className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-lg text-xs hover:shadow-md transition"
                                        >
                                          <EditIcon className="w-3 h-3" color="#f9f9f9" />
                                          Редактировать
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleDeleteMasterClass(mc.id)}
                                          className="inline-flex items-center gap-1 px-3 py-1 bg-firm-red text-main rounded-lg text-xs hover:shadow-md transition"
                                        >
                                          <DeleteIcon className="w-3 h-3" color="#f9f9f9" />
                                          Удалить
                                        </motion.button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <h2 className="font-montserrat font-semibold text-xl sm:text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Профиль мастера
                      </h2>
                      {!isEditing ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 border-2 border-firm-orange text-firm-orange rounded-xl font-montserrat font-medium hover:bg-firm-orange hover:text-main transition"
                        >
                          <EditIcon className="w-4 h-4 inline mr-2" color="#F4A67F" />
                          Редактировать
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setIsEditing(false);
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                          className="px-4 py-2 bg-firm-gray text-main rounded-xl font-montserrat font-medium hover:bg-firm-gray transition"
                        >
                          Отмена
                        </motion.button>
                      )}
                    </div>

                    {isEditing ? (
                      <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-text mb-1 font-montserrat text-sm">Имя *</label>
                            <input
                              type="text"
                              name="fullname"
                              value={profileData.fullname}
                              onChange={handleInputChange}
                              required
                              className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-text mb-1 font-montserrat text-sm">Телефон</label>
                            <input
                              type="tel"
                              name="phone"
                              value={profileData.phone || ""}
                              onChange={handleInputChange}
                              className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-text mb-1 font-montserrat text-sm">Город</label>
                            <input
                              type="text"
                              name="city"
                              value={profileData.city || ""}
                              onChange={handleInputChange}
                              className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-text mb-1 font-montserrat text-sm">Адрес</label>
                            <input
                              type="text"
                              name="address"
                              value={profileData.address || ""}
                              onChange={handleInputChange}
                              className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-text mb-1 font-montserrat text-sm">Описание</label>
                          <textarea
                            name="description"
                            value={profileData.description || ""}
                            onChange={handleInputChange}
                            rows={4}
                            className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm resize-none"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-montserrat font-medium text-text">Индивидуальные заказы</p>
                            <p className="text-xs text-firm-gray">Принимать заказы на индивидуальные изделия</p>
                            {profileData.custom_orders_enabled && (
                              <p className="text-xs text-firm-green mt-1">
                                На странице мастера появится кнопка &quot;Обсудить заказ&quot;
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleCustomOrdersToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-firm-orange focus:ring-offset-2 ${
                              profileData.custom_orders_enabled ? "bg-firm-orange" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                profileData.custom_orders_enabled ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={saving}
                          className="w-full py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl font-montserrat font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                        >
                          <SaveIcon className="w-4 h-4 inline mr-2" color="#f9f9f9" />
                          {saving ? "Сохранение..." : "Сохранить изменения"}
                        </motion.button>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-main rounded-xl p-4 border border-gray-100">
                          <p className="text-firm-gray text-sm mb-1">Имя</p>
                          <p className="font-medium text-text">{profileData.fullname}</p>
                        </div>
                        <div className="bg-main rounded-xl p-4 border border-gray-100">
                          <p className="text-firm-gray text-sm mb-1">Email</p>
                          <p className="font-medium text-text">{profileData.email}</p>
                        </div>
                        <div className="bg-main rounded-xl p-4 border border-gray-100">
                          <p className="text-firm-gray text-sm mb-1">Телефон</p>
                          <p className="font-medium text-text">{profileData.phone || "Не указано"}</p>
                        </div>
                        <div className="bg-main rounded-xl p-4 border border-gray-100">
                          <p className="text-firm-gray text-sm mb-1">Город</p>
                          <p className="font-medium text-text">{profileData.city || "Не указано"}</p>
                        </div>
                        <div className="bg-main rounded-xl p-4 border border-gray-100 md:col-span-2">
                          <p className="text-firm-gray text-sm mb-1">Адрес</p>
                          <p className="font-medium text-text">{profileData.address || "Не указано"}</p>
                        </div>
                        <div className="bg-main rounded-xl p-4 border border-gray-100 md:col-span-2">
                          <p className="text-firm-gray text-sm mb-1">Описание</p>
                          <p className="font-medium text-text">{profileData.description || "Не указано"}</p>
                        </div>
                        <div className="bg-main rounded-xl p-4 border border-gray-100">
                          <p className="text-firm-gray text-sm mb-1">Индивидуальные заказы</p>
                          <p className="font-medium text-text">{profileData.custom_orders_enabled ? "Принимаю" : "Не принимаю"}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "settings" && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8"
                  >
                    <h2 className="font-montserrat font-semibold text-xl sm:text-2xl mb-6 flex items-center gap-2">
                      <SettingsIcon className="w-5 h-5" />
                      Настройки
                    </h2>

                    <div className="mb-8">
                      <h3 className="font-montserrat font-semibold text-base sm:text-lg mb-4">Смена пароля</h3>
                      <form className="space-y-4 max-w-md">
                        <input
                          type="password"
                          placeholder="Текущий пароль"
                          className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm"
                        />
                        <input
                          type="password"
                          placeholder="Новый пароль"
                          className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm"
                        />
                        <input
                          type="password"
                          placeholder="Подтверждение"
                          className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm"
                        />
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="px-6 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl text-sm font-montserrat font-medium hover:shadow-lg transition"
                        >
                          Изменить пароль
                        </motion.button>
                      </form>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="font-montserrat font-semibold text-base sm:text-lg mb-3 text-firm-red flex items-center gap-2">
                        <DeleteIcon className="w-5 h-5" color="#D77C7C" />
                        Опасная зона
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 border-2 border-firm-red text-firm-red rounded-lg text-sm hover:bg-firm-red hover:text-main transition"
                      >
                        Удалить аккаунт
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

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

      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={fetchMasterData}
        product={editingProduct!}
        categories={categories}
      />

      <EditPostModal
        isOpen={isEditPostModalOpen}
        onClose={() => {
          setIsEditPostModalOpen(false);
          setEditingPost(null);
        }}
        onSuccess={fetchMasterData}
        post={editingPost!}
      />

      <EditClassModal
        isOpen={isEditClassModalOpen}
        onClose={() => {
          setIsEditClassModalOpen(false);
          setEditingClass(null);
        }}
        onSuccess={fetchMasterData}
        masterClass={editingClass!}
      />

      {/* Модалка участников */}
      <AnimatePresence>
        {showParticipantsModal && selectedMasterClass && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowParticipantsModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-main rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-main border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="font-montserrat font-semibold text-xl text-text">
                  Участники: {selectedMasterClass.title}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowParticipantsModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition"
                >
                  <CloseIcon className="w-5 h-5" color="#737682" />
                </motion.button>
              </div>
              <div className="p-4 space-y-3">
                {!selectedMasterClass.registrations?.length ? (
                  <div className="text-center py-8">
                    <UsersIcon className="w-12 h-12 mx-auto text-firm-gray opacity-50" />
                    <p className="text-firm-gray mt-3">Нет записавшихся участников</p>
                  </div>
                ) : (
                  selectedMasterClass.registrations.map((reg) => (
                    <div key={reg.id} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-text">{reg.user_name || reg.user_email}</p>
                          <p className="text-sm text-firm-gray">{reg.user_email}</p>
                          {reg.user_phone && <p className="text-sm text-firm-gray">{reg.user_phone}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-firm-gray">Записан: {formatDate(reg.created_at)}</p>
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                            reg.payment_status === "paid" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                          }`}>
                            {reg.payment_status === "paid" ? "Оплачено" : "Ожидает оплаты"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
    </div>
  );
}