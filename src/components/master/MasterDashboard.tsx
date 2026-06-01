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
import { CheckCircleIcon } from "../icons/CheckCircleIcon";
import { ClockIcon } from "../icons/ClockIcon";
import { MailIcon } from "../icons/MailIcon";
import { SearchIcon } from "../icons/SearchIcon";
import { SettingsIcon } from "../icons/SettingsIcon";
import { LikeIcon } from "../icons/LikeIcon";

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

const TruckIcon = ({ className = "", color = "#242424", size = 20 }: { className?: string; color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 18C7.10457 18 8 17.1046 8 16C8 14.8954 7.10457 14 6 14C4.89543 14 4 14.8954 4 16C4 17.1046 4.89543 18 6 18Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 18C19.1046 18 20 17.1046 20 16C20 14.8954 19.1046 14 18 14C16.8954 14 16 14.8954 16 16C16 17.1046 16.8954 18 18 18Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 16H3V10M8 16H16V4H20L22 8V16H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 12H22" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PackageIcon = ({ className = "", color = "#242424", size = 20 }: { className?: string; color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 7L12 12L4 7M12 22V12M3 5L12 2L21 5L12 8L3 5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

const getStatusOrder = (status: string): number => {
  const order: Record<string, number> = {
    'new': 0,
    'processing': 1,
    'shipped': 2,
    'delivered': 3,
    'cancelled': -1
  };
  return order[status] ?? -1;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'new': return <CartIcon className="w-3 h-3" color="#3B82F6" size={12} />;
    case 'processing': return <ClockIcon className="w-3 h-3" color="#EAB308" size={12} />;
    case 'shipped': return <TruckIcon className="w-3 h-3" color="#8B5CF6" size={12} />;
    case 'delivered': return <CheckCircleIcon className="w-3 h-3" color="#22C55E" size={12} />;
    case 'cancelled': return <CloseIcon className="w-3 h-3" color="#EF4444" size={12} />;
    default: return null;
  }
};

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

  const [masterOrders, setMasterOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderPage, setOrderPage] = useState(1);
  const [orderPagination, setOrderPagination] = useState<OrderPagination>({ total: 0, page: 1, limit: 20, totalPages: 1, hasMore: false });
  const [orderStats, setOrderStats] = useState<OrderStats>({ new: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, total: 0 });
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<{ [key: string]: string }>({});
  const [showTrackingModal, setShowTrackingModal] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState<{ orderId: string; currentStatus: string; targetStatus: string } | null>(null);

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

  const getNextStatus = (currentStatus: string): { status: string; label: string; action: string } | null => {
    const statusFlow: Record<string, { status: string; label: string; action: string }> = {
      'new': { status: 'processing', label: 'В обработку', action: 'Подтвердить заказ' },
      'processing': { status: 'shipped', label: 'Отправлен', action: 'Подтвердить отправку' },
      'shipped': { status: 'delivered', label: 'Доставлен', action: 'Подтвердить доставку' }
    };
    return statusFlow[currentStatus] || null;
  };

  const getCancelStatus = (currentStatus: string): { status: string; label: string } | null => {
    if (currentStatus === 'new' || currentStatus === 'processing') {
      return { status: 'cancelled', label: 'Отменить заказ' };
    }
    return null;
  };

  const getAvailableActions = (currentStatus: string) => {
    const actions = [];
    const next = getNextStatus(currentStatus);
    if (next) {
      actions.push({ type: 'next', ...next });
    }
    const cancel = getCancelStatus(currentStatus);
    if (cancel) {
      actions.push({ type: 'cancel', ...cancel });
    }
    return actions;
  };

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
        toast.success(getStatusActionMessage(newStatus));
        setShowStatusModal(null);
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

  const getStatusActionMessage = (status: string): string => {
    switch (status) {
      case 'processing': return 'Заказ подтвержден и передан в обработку';
      case 'shipped': return 'Заказ отправлен, трек-номер добавлен';
      case 'delivered': return 'Заказ отмечен как доставленный';
      case 'cancelled': return 'Заказ отменен';
      default: return 'Статус заказа обновлен';
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
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "processing":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "shipped":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "delivered":
        return "bg-green-50 text-green-700 border-green-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Новый";
      case "processing":
        return "В обработке";
      case "shipped":
        return "Отправлен";
      case "delivered":
        return "Доставлен";
      case "cancelled":
        return "Отменен";
      default:
        return status;
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-3 h-3" color="#22C55E" size={12} />;
      case 'pending':
        return <ClockIcon className="w-3 h-3" color="#EAB308" size={12} />;
      default:
        return <CloseIcon className="w-3 h-3" color="#EF4444" size={12} />;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Оплачен';
      case 'pending': return 'Ожидает оплаты';
      default: return 'Ошибка';
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

  const StatusConfirmModal = () => {
    if (!showStatusModal) return null;
    
    const order = masterOrders.find(o => o.id === showStatusModal.orderId);
    const action = showStatusModal.targetStatus;
    
    const getActionText = () => {
      if (action === 'shipped') return 'отправку заказа';
      if (action === 'processing') return 'подтверждение заказа';
      if (action === 'delivered') return 'доставку заказа';
      if (action === 'cancelled') return 'отмену заказа';
      return 'изменение статуса';
    };
    
    const getActionButtonText = () => {
      if (action === 'shipped') return 'Подтвердить отправку';
      if (action === 'processing') return 'Подтвердить заказ';
      if (action === 'delivered') return 'Подтвердить доставку';
      if (action === 'cancelled') return 'Отменить заказ';
      return 'Подтвердить';
    };
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-main rounded-2xl max-w-md w-full p-6 shadow-2xl"
        >
          <div className="text-center mb-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="w-16 h-16 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center"
            >
              <ClockIcon className="w-8 h-8" color="#EAB308" size={32} />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2 font-['Montserrat_Alternates']">Подтверждение действия</h3>
            <p className="text-firm-gray">Вы уверены, что хотите подтвердить {getActionText()}?</p>
            {order && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 p-4 bg-gray-50 rounded-xl text-left"
              >
                <p className="text-sm font-medium">Заказ №{order.order_number}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                  <span className="text-firm-gray">→</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-firm-orange/10 text-firm-orange">
                    {action === 'shipped' ? 'Отправлен' : 
                     action === 'processing' ? 'В обработке' : 
                     action === 'delivered' ? 'Доставлен' : 
                     action === 'cancelled' ? 'Отменен' : action}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (action === 'shipped') {
                  setShowStatusModal(null);
                  setShowTrackingModal(showStatusModal.orderId);
                } else if (action) {
                  updateOrderStatus(showStatusModal.orderId, action);
                }
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition text-sm font-medium"
            >
              {getActionButtonText()}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowStatusModal(null)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Отмена
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
          />
          <p className="mt-4 font-['Montserrat_Alternates'] text-text">Загрузка кабинета мастера...</p>
        </div>
      </motion.div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Анимации для элементов
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 text-white shadow-xl"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                {masterAvatar && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-white/20 border-2 border-white shrink-0"
                  >
                    <Image src={masterAvatar} alt={masterName} width={64} height={64} className="w-full h-full object-cover" />
                  </motion.div>
                )}
                <div>
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="font-['Montserrat_Alternates'] text-white font-bold text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2"
                  >
                    Добро пожаловать, {masterName || session?.user?.name || "Мастер"}!
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/80 text-sm sm:text-base"
                  >
                    Вот что происходит с вашим магазином сегодня
                  </motion.p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/chats" className="relative block">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                      <ChatIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" color="#FFFFFF" size={24} />
                    </div>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <NotificateIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" color="#FFFFFF" size={24} />
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 text-white text-xs rounded-full flex items-center justify-center"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </motion.span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl z-50 border border-gray-100 overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-r from-firm-orange to-firm-pink">
                          <h3 className="font-semibold text-white font-['Montserrat_Alternates']">Уведомления</h3>
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
                                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-300 ${
                                  !notif.is_read ? "bg-gradient-to-r from-firm-orange/5 to-firm-pink/5" : ""
                                }`}
                                onClick={() => {
                                  markNotificationAsRead(notif.id);
                                  if (notif.link) router.push(notif.link);
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-firm-orange">{getNotificationIcon(notif.type)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{notif.title}</p>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                    <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleDateString("ru-RU")}</p>
                                  </div>
                                  {!notif.is_read && (
                                    <motion.div
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity }}
                                      className="w-2 h-2 bg-firm-orange rounded-full shrink-0 mt-2"
                                    />
                                  )}
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                        <div className="p-3 bg-gray-50 text-center">
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
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8"
          >
            {[
              { label: "Новые заказы", value: orderStats.new, icon: <CartIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#D97C8E" size={32} />, color: "#D97C8E", bg: "bg-pink-50" },
              { label: "Всего заказов", value: orderStats.total, icon: <CartIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#94D06C" size={32} />, color: "#94D06C", bg: "bg-green-50" },
              { label: "Товаров", value: stats.total_products, icon: <ProductsIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#F4A67F" size={32} />, color: "#F4A67F", bg: "bg-orange-50" },
              { label: "Просмотров", value: stats.total_views, icon: <ViewsIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#D77C7C" size={32} />, color: "#D77C7C", bg: "bg-red-50" }
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={`bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300 ${stat.bg} border border-gray-100`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs sm:text-sm font-['Montserrat_Alternates']">{stat.label}</p>
                    <motion.p
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.1, type: "spring" }}
                      className="text-xl sm:text-2xl md:text-3xl font-bold mt-1"
                      style={{ color: stat.color }}
                    >
                      {stat.value.toLocaleString()}
                    </motion.p>
                  </div>
                  <div className="opacity-80">{stat.icon}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 sm:mb-12"
          >
            <motion.button
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddProductModal(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
            >
              <CatalogPinkIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FFFFFF" size={20} />
              Добавить товар
            </motion.button>
            <motion.button
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddClassModal(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-firm-pink to-purple-500 text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
            >
              <ClassesIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FFFFFF" size={20} />
              Создать мастер-класс
            </motion.button>
            <motion.button
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddPostModal(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-['Montserrat_Alternates'] font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
            >
              <EditIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#FFFFFF" size={20} />
              Написать пост
            </motion.button>
          </motion.div>

          {/* Orders Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl sm:rounded-2xl shadow-xl mb-6 sm:mb-8 overflow-hidden border border-gray-100"
          >
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl flex items-center gap-2">
                  <CartIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#242424" size={24} />
                  Заказы на мои товары
                  {orderStats.new > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-red-500 text-white text-xs px-2 py-1 rounded-full"
                    >
                      {orderStats.new} новых
                    </motion.span>
                  )}
                </h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => filterOrdersByStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm appearance-none bg-white pr-8 focus:border-firm-orange focus:outline-none"
                    >
                      <option value="all">Все заказы</option>
                      <option value="new">Новые</option>
                      <option value="processing">В обработке</option>
                      <option value="shipped">Отправленные</option>
                      <option value="delivered">Доставленные</option>
                      <option value="cancelled">Отмененные</option>
                    </select>
                    <FilterIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fetchMasterOrders(orderStatusFilter, orderPage)}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <RefreshIcon className="w-4 h-4" color="#242424" size={16} />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {masterOrders.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-gray-500">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="flex justify-center mb-4"
                  >
                    <PackageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" color="#D1D5DB" size={64} />
                  </motion.div>
                  <p>У вас пока нет заказов на товары</p>
                  <Link href="/catalog" className="text-firm-orange hover:underline mt-2 inline-block">Перейти в каталог →</Link>
                </div>
              ) : (
                masterOrders.map((order, idx) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const isUpdating = updatingOrderId === order.id;
                  const availableActions = getAvailableActions(order.status);
                  const isFinished = order.status === 'delivered' || order.status === 'cancelled';
                  
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ backgroundColor: "#fafafa" }}
                      className="p-4 sm:p-6 transition-all duration-300"
                    >
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Статус и номер заказа */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${getStatusColor(order.status)}`}
                            >
                              {getStatusIcon(order.status)}
                              {getStatusText(order.status)}
                            </motion.span>
                            <span className="text-xs sm:text-sm text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                              №{order.order_number}
                            </span>
                            <motion.span
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                order.payment_status === 'paid' 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              }`}
                            >
                              {getPaymentStatusIcon(order.payment_status)}
                              {getPaymentStatusText(order.payment_status)}
                            </motion.span>
                          </div>

                          {/* Информация о заказе */}
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#6B7280" size={14} />
                              {order.buyer_name || order.shipping_full_name || 'Не указан'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-medium">₽</span>
                              {order.total_amount.toLocaleString()} ₽
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#6B7280" size={14} />
                              {new Date(order.created_at).toLocaleDateString("ru-RU")}
                            </span>
                            <span className="flex items-center gap-1">
                              <PackageIcon className="w-3 h-3" color="#6B7280" size={14} />
                              {order.items?.length || 0} товаров
                            </span>
                          </div>

                          {/* Адрес доставки */}
                          {order.shipping_city && order.shipping_address && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <LocateIcon className="w-3 h-3 shrink-0" color="#6B7280" size={14} />
                              <span className="truncate">{order.shipping_city}, {order.shipping_address}</span>
                            </div>
                          )}

                          {/* Трек-номер */}
                          {order.tracking_number && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-1 mt-2 text-xs text-green-600 bg-green-50 inline-flex px-2 py-1 rounded"
                            >
                              <TruckIcon className="w-3 h-3" color="#22C55E" size={12} />
                              <span>Трек-номер: {order.tracking_number}</span>
                            </motion.div>
                          )}
                        </div>

                        <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto">
                          {/* Кнопка подробнее */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleOrderExpand(order.id)}
                            className="px-3 py-2 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-1"
                          >
                            {isExpanded ? 'Свернуть' : 'Подробнее'}
                            <motion.span animate={{ rotate: isExpanded ? 180 : 0 }}>▼</motion.span>
                          </motion.button>

                          {/* Кнопки действий */}
                          {!isFinished && !isUpdating && (
                            <div className="flex gap-2">
                              {availableActions.map((action) => (
                                <motion.button
                                  key={action.type}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => setShowStatusModal({ orderId: order.id, currentStatus: order.status, targetStatus: action.status })}
                                  className={`px-3 py-2 text-xs rounded-xl transition flex items-center justify-center gap-1 ${
                                    action.type === 'cancel'
                                      ? 'border border-red-300 text-red-600 hover:bg-red-50'
                                      : 'bg-gradient-to-r from-firm-orange to-firm-pink text-white hover:shadow-lg'
                                  }`}
                                >
                                  {action.type === 'next' && '→'}
                                  {action.type === 'cancel' && '✕'}
                                  {action.label}
                                </motion.button>
                              ))}
                            </div>
                          )}

                          {/* Завершенные заказы */}
                          {isFinished && (
                            <div className="text-xs text-gray-500 text-center py-2 flex items-center justify-center gap-1">
                              {order.status === 'delivered' ? (
                                <>
                                  <CheckCircleIcon className="w-4 h-4" color="#22C55E" size={16} />
                                  Заказ выполнен
                                </>
                              ) : (
                                <>
                                  <CloseIcon className="w-4 h-4" color="#EF4444" size={16} />
                                  Заказ отменен
                                </>
                              )}
                            </div>
                          )}

                          {/* Индикатор загрузки */}
                          {isUpdating && (
                            <div className="flex justify-center items-center py-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-firm-orange border-t-transparent rounded-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Развернутая информация */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-gray-100"
                          >
                            {/* Визуальный прогресс статусов */}
                            <div className="mb-4">
                              <h4 className="font-semibold text-sm mb-3 font-['Montserrat_Alternates']">Статус заказа:</h4>
                              <div className="flex items-center justify-between">
                                {[
                                  { status: 'new', label: 'Новый', icon: <CartIcon className="w-4 h-4" color="#FFFFFF" size={16} /> },
                                  { status: 'processing', label: 'В обработке', icon: <ClockIcon className="w-4 h-4" color="#FFFFFF" size={16} /> },
                                  { status: 'shipped', label: 'Отправлен', icon: <TruckIcon className="w-4 h-4" color="#FFFFFF" size={16} /> },
                                  { status: 'delivered', label: 'Доставлен', icon: <CheckCircleIcon className="w-4 h-4" color="#FFFFFF" size={16} /> }
                                ].map((step, stepIdx) => {
                                  const isCompleted = getStatusOrder(order.status) >= getStatusOrder(step.status);
                                  const isCurrent = order.status === step.status;
                                  
                                  return (
                                    <div key={step.status} className="flex-1 text-center">
                                      <div className="relative">
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ delay: stepIdx * 0.1 }}
                                          className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm ${
                                            isCompleted 
                                              ? 'bg-green-500 text-white' 
                                              : isCurrent 
                                                ? 'bg-firm-orange text-white' 
                                                : 'bg-gray-200 text-gray-400'
                                          }`}
                                        >
                                          {isCompleted ? <CheckCircleIcon className="w-4 h-4" color="#FFFFFF" size={16} /> : step.icon}
                                        </motion.div>
                                        {stepIdx < 3 && (
                                          <div className={`absolute top-4 left-1/2 w-full h-0.5 ${
                                            getStatusOrder(order.status) > stepIdx ? 'bg-green-500' : 'bg-gray-200'
                                          }`} />
                                        )}
                                      </div>
                                      <p className={`text-xs mt-2 ${isCurrent ? 'font-semibold text-firm-orange' : 'text-gray-500'}`}>
                                        {step.label}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Товары */}
                            <div className="mb-4">
                              <h4 className="font-semibold text-sm mb-2 font-['Montserrat_Alternates']">Товары в заказе:</h4>
                              <div className="space-y-2">
                                {order.items?.map((item, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg"
                                  >
                                    <div className="flex-1">
                                      <span className="font-medium">{item.product_title}</span>
                                      <span className="text-gray-500 ml-2">× {item.quantity} шт.</span>
                                    </div>
                                    <span className="font-semibold text-firm-orange">{item.total.toLocaleString()} ₽</span>
                                  </motion.div>
                                ))}
                              </div>
                            </div>

                            {/* Данные покупателя и доставка */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gray-50 rounded-lg p-3"
                              >
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                                  <UserIcon className="w-4 h-4" color="#242424" size={16} />
                                  Покупатель
                                </h4>
                                <p className="text-sm">{order.buyer_name || order.shipping_full_name}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                  <MailIcon className="w-3 h-3" color="#6B7280" size={12} />
                                  {order.buyer_email}
                                </p>
                                <p className="text-sm text-gray-500">{order.shipping_phone}</p>
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gray-50 rounded-lg p-3"
                              >
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                                  <LocateIcon className="w-4 h-4" color="#242424" size={16} />
                                  Адрес доставки
                                </h4>
                                <p className="text-sm">{order.shipping_city}</p>
                                <p className="text-sm">{order.shipping_address}</p>
                                {order.shipping_postal_code && <p className="text-sm text-gray-500">{order.shipping_postal_code}</p>}
                              </motion.div>
                            </div>

                            {/* Комментарий */}
                            {order.buyer_comment && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-gray-50 rounded-lg p-3 mb-4"
                              >
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                                  <CommentIcon className="w-4 h-4" color="#242424" size={16} />
                                  Комментарий покупателя
                                </h4>
                                <p className="text-sm">{order.buyer_comment}</p>
                              </motion.div>
                            )}

                            {/* Итого */}
                            <div className="flex justify-end pt-3 border-t border-gray-100">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Итого к оплате:</p>
                                <motion.p
                                  initial={{ scale: 0.9 }}
                                  animate={{ scale: 1 }}
                                  className="font-bold text-firm-orange text-2xl"
                                >
                                  {order.total_amount.toLocaleString()} ₽
                                </motion.p>
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

            {/* Пагинация */}
            {orderPagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex justify-center">
                <div className="flex gap-2 items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOrderPageChange(orderPage - 1)}
                    disabled={orderPage <= 1}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    ←
                  </motion.button>
                  <span className="px-3 py-1 text-sm font-['Montserrat_Alternates']">
                    {orderPage} / {orderPagination.totalPages}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOrderPageChange(orderPage + 1)}
                    disabled={orderPage >= orderPagination.totalPages}
                    className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    →
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Blog Posts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden border border-gray-100"
          >
            <div className="p-4 sm:p-6 border-gray-100 border-b">
              <div className="flex gap-4 sm:gap-6">
                <button
                  onClick={() => setActiveTab("recent")}
                  className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative text-sm sm:text-base ${
                    activeTab === "recent"
                      ? "text-firm-orange"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Свежие посты
                  {activeTab === "recent" && (
                    <motion.div
                      layoutId="underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink rounded-full"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("my")}
                  className={`pb-2 font-['Montserrat_Alternates'] font-medium transition-all duration-300 relative text-sm sm:text-base ${
                    activeTab === "my"
                      ? "text-firm-pink"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Мои посты
                  {activeTab === "my" && (
                    <motion.div
                      layoutId="underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-pink to-firm-orange rounded-full"
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
                  className="space-y-5 p-4 sm:p-6"
                >
                  {recentPosts.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center text-gray-500">
                      <BlogIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" color="#D1D5DB" size={48} />
                      <p>Пока нет постов</p>
                    </div>
                  ) : (
                    recentPosts.map((post) => (
                      <BlogPostCard
                        key={post.id}
                        post={normalizePostForCard(post)}
                        isOwner={true}
                        showComments={showComments === post.id}
                        onEdit={(postId) => router.push(`/master/blog/${postId}/edit`)}
                        onDelete={() => handleDeletePost(post.id)}
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
                  className="space-y-5 p-4 sm:p-6"
                >
                  {myPosts.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center text-gray-500">
                      <BlogIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" color="#D1D5DB" size={48} />
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
                        onEdit={(postId) => router.push(`/master/blog/${postId}/edit`)}
                        onDelete={() => handleDeletePost(post.id)}
                      />
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

      {/* Status Confirm Modal */}
      <StatusConfirmModal />

      {/* Tracking Modal */}
      <AnimatePresence>
        {showTrackingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold font-['Montserrat_Alternates']">Отправка заказа</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTrackingModal(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <CloseIcon className="w-5 h-5 text-gray-500" color="#6B7280" size={20} />
                </motion.button>
              </div>
              <p className="text-gray-600 mb-4">Укажите трек-номер для отслеживания посылки</p>
              <input
                type="text"
                value={trackingNumber[showTrackingModal] || ''}
                onChange={(e) => setTrackingNumber(prev => ({ ...prev, [showTrackingModal]: e.target.value }))}
                placeholder="Введите трек-номер"
                className="w-full p-3 border border-gray-200 rounded-xl mb-4 focus:border-firm-orange focus:outline-none text-sm"
              />
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateOrderStatus(showTrackingModal, 'shipped', trackingNumber[showTrackingModal])}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
                >
                  Подтвердить отправку
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowTrackingModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm"
                >
                  Отмена
                </motion.button>
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