"use client";

import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { ProfileIcon } from "@/components/icons/ProfileIcon";
import { ProductsIcon } from "@/components/icons/ProductsIcon";
import { FavoritesIcon } from "@/components/icons/FavoritesIcon";
import { SettingsIcon } from "@/components/icons/SettingsIcon";
import { ExitIcon } from "@/components/icons/ExitIcon";
import { CatalogPinkIcon } from "@/components/icons/CatalogPinkIcon";
import { MasterIcon } from "@/components/icons/MasterIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { SaveIcon } from "@/components/icons/SaveIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { LocateIcon } from "@/components/icons/LocateIcon";
import { NotificateIcon } from "@/components/icons/NotificateIcon";
import { PasswordIcon } from "@/components/icons/PasswordIcon";

interface BuyerProfileProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string;
      role?: string;
    };
  } | null;
  initialTab?: string;
}

interface Order {
    id: string
    order_number: string
    status: string
    payment_status: string
    total_amount: number
    created_at: string
    items_count: number
}

export default function BuyerProfile({
  session,
  initialTab,
}: BuyerProfileProps) {
  const [activeTab, setActiveTab] = useState(initialTab || "profile");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [becomeMasterLoading, setBecomeMasterLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning'});

  const [profileData, setProfileData] = useState({fullname: "", email: "", phone: "", city: "", address: "", avatarUrl: null as string | null, role: "buyer"});

  const [notifications, setNotifications] = useState({orderStatus: true, promotions: true,  messages: false});
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [orders, setOrders] = useState<Order[]>([])
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState({totalOrders: 0, totalSpent: 0, favoriteCount: 0});

  const [isEditHovered, setIsEditHovered] = useState(false);
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchProfileData();
    fetchOrders();
    fetchFavorites();
    fetchNotificationSettings();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/profile");
      const data = await response.json();

      let profile;
      if (data.profile) {
        profile = data.profile;
      } else {
        profile = data;
      }

      setProfileData({fullname: profile.fullname || profile.full_name || session?.user?.name || "", email: profile.email || session?.user?.email || "",  phone: profile.phone || "", city: profile.city || "", address: profile.address || "", avatarUrl: profile.avatar_url || null, role: profile.role || "buyer"});
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Ошибка загрузки профиля");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch("/api/user/notifications/settings");
      if (response.ok) {
        const data = await response.json();
        setNotifications({orderStatus: data.orderStatus ?? true, promotions: data.promotions ?? true, messages: data.messages ?? false})
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  const fetchOrders = async () => {
    try {
        const response = await fetch('/api/orders')
        const data = await response.json()
        
        const ordersList = data.orders || []
        setOrders(ordersList)
        
        const total = ordersList.reduce((sum: number, order: { total_amount: number }) => sum + (order.total_amount || 0), 0)
        setStats((prev) => ({...prev,  totalOrders: ordersList.length, totalSpent: total}))
    } catch (error) {
        console.error('Error fetching orders:', error)
        toast.error('Ошибка загрузки заказов')
    }
}

  const fetchFavorites = async () => {
    try {
        const response = await fetch('/api/user/favorites')
        const data = await response.json()
        
        const favoritesList = Array.isArray(data) ? data : data.favorites || []
        
        setFavorites(favoritesList)
        setStats(prev => ({ ...prev, favoriteCount: favoritesList.length }))
    } catch (error) {
        console.error('Error fetching favorites:', error)
    }
}

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("fullname", profileData.fullname);
      formData.append("phone", profileData.phone || "");
      formData.append("city", profileData.city || "");
      formData.append("address", profileData.address || "");

      if (avatarFile) {formData.append("avatar", avatarFile)}

      const response = await fetch("/api/user/profile", {method: "PUT", body: formData})

      const data = await response.json();

      if (response.ok) {
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        await fetchProfileData();
        toast.success("Профиль успешно обновлен!");
      } else {
        toast.error(data.error || "Ошибка при обновлении профиля");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Ошибка при обновлении профиля");
    } finally {
      setSaving(false);
    }
  };

  const handleBecomeMaster = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Стать мастером',
      message: 'Вы уверены, что хотите стать мастером?\n\nПосле этого вы сможете добавлять товары, создавать мастер-классы и вести блог.',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setBecomeMasterLoading(true);
        try {
          const response = await fetch("/api/user/become-master", {method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({city: profileData.city, phone: profileData.phone})
          });

          const data = await response.json();

          if (response.ok) {
            toast.success("Поздравляем! Вы стали мастером!");
            setTimeout(() => {window.location.href = "/profile"}, 1500)
          } else {
            toast.error(data.error || "Ошибка при переходе в статус мастера");
          }
        } catch (error) {
          console.error("Error becoming master:", error);
          toast.error("Ошибка при переходе в статус мастера");
        } finally {
          setBecomeMasterLoading(false);
        }
      }
    });
  };

  const handleNotificationChange = (key: string, value: boolean) => {setNotifications((prev) => ({ ...prev, [key]: value }))}

  const saveNotificationSettings = async () => {
    setSavingNotifications(true);
    try {
      const response = await fetch("/api/user/notifications/settings", {method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notifications)})

      if (response.ok) {
        toast.success("Настройки уведомлений сохранены");
      } else {
        toast.error("Ошибка при сохранении настроек");
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Ошибка при сохранении настроек");
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({...prev, [name]: value}))}

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

  const handleRemoveFromFavorites = async (itemId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление из избранного',
      message: 'Вы уверены, что хотите удалить этот товар из избранного?',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/user/favorites?productId=${itemId}`, {method: "DELETE"});
          if (response.ok) {
            setFavorites(prev => prev.filter((fav: { id: string }) => fav.id !== itemId));
            setStats((prev) => ({...prev, favoriteCount: prev.favoriteCount - 1}));
            toast.success("Товар удален из избранного");
          }
        } catch (error) {
          console.error("Error removing from favorites:", error);
          toast.error("Ошибка при удалении");
        }
      }
    });
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
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-montserrat text-firm-gray text-sm sm:text-base">Загрузка профиля...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-main">
        <Toaster position="top-right" />
        <div className="flex items-start justify-center pb-6 sm:pb-8 px-3 sm:px-4">
            <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-7xl">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="font-montserrat font-bold text-2xl sm:text-3xl md:text-4xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Личный кабинет</h1>
                  <p className="text-firm-gray mt-1 sm:mt-2 text-xs sm:text-sm">Добро пожаловать, {profileData.fullname || session?.user?.name}</p>
                  {profileData.role === "buyer" && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex mt-2 px-2 sm:px-3 py-1 bg-gradient-to-r from-firm-orange to-firm-pink text-main text-[10px] sm:text-xs rounded-full items-center gap-1">
                      <CatalogPinkIcon color="#f9f9f9" className="w-2 h-2 sm:w-3 sm:h-3" />
                      <span className="text-main">Покупатель</span>
                    </motion.span>
                  )}
                </div>

                <div className="flex gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <motion.div whileHover={{ scale: 1.05 }} className="text-center sm:text-right">
                    <p className="text-xs sm:text-sm text-firm-gray">Заказов</p>
                    <p className="text-xl sm:text-3xl font-bold text-firm-orange">{stats.totalOrders}</p>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} className="text-center sm:text-right">
                    <p className="text-xs sm:text-sm text-firm-gray">Потрачено</p>
                    <p className="text-xl sm:text-3xl font-bold text-firm-pink">{stats.totalSpent.toLocaleString()} ₽</p>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} className="text-center sm:text-right">
                    <p className="text-xs sm:text-sm text-firm-gray">В избранном</p>
                    <p className="text-xl sm:text-3xl font-bold text-firm-orange">{stats.favoriteCount}</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col md:flex-row gap-4 sm:gap-8">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="md:w-1/3 lg:w-1/4">
                <div className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 sticky top-5 border border-gray-100">
                  <div className="flex flex-col items-center mb-4 sm:mb-6">
                    <motion.div whileHover={{ scale: 1.05 }} className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden border-4 border-main shadow-lg group cursor-pointer">
                      {avatarPreview ? (<img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />) : profileData.avatarUrl ? (<img src={`/api/proxy/avatar?url=${encodeURIComponent(profileData.avatarUrl)}`} alt="avatar" className="w-full h-full object-cover" />) : (<span className="text-2xl sm:text-3xl md:text-4xl font-montserrat font-bold text-main">{profileData.fullname?.charAt(0).toUpperCase() || session?.user?.name?.charAt(0).toUpperCase() || "U"}</span>)}

                      {isEditing && (
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-main text-[10px] sm:text-xs">Изменить</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </label>)}
                    </motion.div>
                    <h3 className="mt-3 sm:mt-4 font-montserrat font-semibold text-base sm:text-lg md:text-xl text-center line-clamp-1">{profileData.fullname || session?.user?.name}</h3>
                    <p className="text-xs sm:text-sm text-firm-gray text-center line-clamp-1">{profileData.email || session?.user?.email}</p>
                    {profileData.city && (
                      <p className="text-[10px] sm:text-xs text-firm-gray mt-1 sm:mt-2 flex items-center gap-1">
                        <LocateIcon color="#D97C8E" className="w-2 h-2 sm:w-3 sm:h-3" />
                        <span className="truncate">{profileData.city}</span>
                      </p>
                    )}
                  </div>

                  <nav className="space-y-1 sm:space-y-2">
                    {[{ id: "profile", icon: ProfileIcon, label: "Мой профиль" }, { id: "orders", icon: ProductsIcon, label: "Мои заказы", count: orders.length }, { id: "favorites", icon: FavoritesIcon, label: "Избранное", count: favorites.length, iconColor: "#D97C8E" }, { id: "settings", icon: SettingsIcon, label: "Настройки" }].map((tab) => {
                      const IconComponent = tab.icon;
                      const iconColor = tab.iconColor || "#D97C8E";
                      return (<motion.button key={tab.id} whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-montserrat flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${activeTab === tab.id ? "bg-linear-to-r from-firm-orange to-firm-pink shadow-lg" : "hover:bg-gray-100"}`}><IconComponent color={activeTab === tab.id ? "#f9f9f9" : iconColor} className="w-4 h-4 sm:w-5 sm:h-5" /><span className={`flex-1 truncate ${activeTab === tab.id ? "text-main" : "text-text"}`}>{tab.label}</span>{tab.count !== undefined && tab.count > 0 && (<span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${activeTab === tab.id ? "bg-firm-orange text-main" : "bg-firm-orange/20 text-firm-orange" }`}>{tab.count}</span>)}</motion.button>)
                    })}

                    <div className="border-t border-gray-200 my-2 pt-2"></div>

                    <motion.button whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}  onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 font-montserrat flex items-center gap-2 sm:gap-3 text-firm-red hover:bg-red-50 text-sm sm:text-base"><ExitIcon color="#D77C7C" className="w-4 h-4 sm:w-5 sm:h-5" /><span>Выйти</span></motion.button>
                  </nav>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="md:w-2/3 lg:w-3/4">
                <AnimatePresence mode="wait">
                  {activeTab === "profile" && (
                    <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                        <h2 className="font-montserrat font-bold text-xl sm:text-2xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Мой профиль</h2>
                        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                          {profileData.role === "buyer" && (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleBecomeMaster} disabled={becomeMasterLoading} className="flex-1 sm:flex-none px-3 sm:px-5 py-2 bg-linear-to-r from-firm-pink to-firm-orange text-main rounded-xl font-montserrat font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm"><MasterIcon color="#f9f9f9" className="w-3 h-3 sm:w-4 sm:h-4" />\{becomeMasterLoading ? (<div className="w-4 h-4 border-2 border-main border-t-transparent rounded-full animate-spin" />) : ("Стать мастером")}</motion.button>)}
                          {!isEditing ? (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(true)} onMouseEnter={() => setIsEditHovered(true)} onMouseLeave={() => setIsEditHovered(false)} className="flex-1 sm:flex-none px-3 sm:px-5 py-2 border-2 border-firm-orange rounded-xl font-montserrat font-medium transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm" style={{ backgroundColor: isEditHovered ? '#F4A67F' : 'transparent', color: isEditHovered ? '#f9f9f9' : '#F4A67F' }}><EditIcon className="w-3 h-3 sm:w-4 sm:h-4" color={isEditHovered ? '#f9f9f9' : '#F4A67F'} /><span className="hidden sm:inline">Редактировать</span><span className="sm:hidden">Ред.</span></motion.button>) : (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(null); }} className="flex-1 sm:flex-none px-3 sm:px-5 py-2 bg-firm-gray text-main rounded-xl font-montserrat font-medium hover:bg-firm-gray transition-all text-xs sm:text-sm">Отмена</motion.button>)}
                        </div>
                      </div>

                      {isEditing ? (
                        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                            <div>
                              <label className="block text-text mb-1 sm:mb-2 font-montserrat text-xs sm:text-sm font-medium">ФИО <span className="text-firm-red">*</span></label>
                              <input type="text" name="fullname" value={profileData.fullname} onChange={handleInputChange} required className="w-full p-2 sm:p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Иванов Иван Иванович" />
                            </div>
                            <div>
                              <label className="block text-text mb-1 sm:mb-2 font-montserrat text-xs sm:text-sm font-medium">Телефон</label>
                              <input type="tel" name="phone" value={profileData.phone || ""} onChange={handleInputChange} className="w-full p-2 sm:p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" placeholder="+7 (999) 123-45-67"/>
                            </div>
                            <div>
                              <label className="block text-text mb-1 sm:mb-2 font-montserrat text-xs sm:text-sm font-medium">Город</label>
                              <input type="text" name="city" value={profileData.city || ""} onChange={handleInputChange} className="w-full p-2 sm:p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Москва" />
                            </div>
                            <div>
                              <label className="block text-text mb-1 sm:mb-2 font-montserrat text-xs sm:text-sm font-medium">Адрес доставки</label>
                              <input type="text" name="address" value={profileData.address || ""} onChange={handleInputChange} className="w-full p-2 sm:p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" placeholder="ул. Примерная, д. 1, кв. 1" />
                            </div>
                          </div>

                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="w-full mt-4 sm:mt-6 p-2 sm:p-3 bg-linear-to-r from-firm-pink to-firm-orange text-main rounded-xl font-montserrat font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"><SaveIcon color="#f9f9f9" className="w-3 h-3 sm:w-4 sm:h-4" />{saving ? "Сохранение..." : "Сохранить изменения"}</motion.button>
                        </motion.form>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-main rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <p className="text-firm-gray text-xs sm:text-sm font-montserrat mb-1">Имя</p>
                            <p className="text-sm sm:text-base font-medium line-clamp-1">{profileData.fullname || "Не указано"}</p>
                          </div>
                          <div className="bg-main rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <p className="text-firm-gray text-xs sm:text-sm font-montserrat mb-1">Email</p>
                            <p className="text-sm sm:text-base font-medium line-clamp-1">{profileData.email}</p>
                          </div>
                          <div className="bg-main rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <p className="text-firm-gray text-xs sm:text-sm font-montserrat mb-1">Телефон</p>
                            <p className="text-sm sm:text-base font-medium line-clamp-1">{profileData.phone || "Не указано"}</p>
                          </div>
                          <div className="bg-main rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <p className="text-firm-gray text-xs sm:text-sm font-montserrat mb-1">Город</p>
                            <p className="text-sm sm:text-base font-medium flex items-center gap-2"><LocateIcon color="#D97C8E" className="w-3 h-3 sm:w-4 sm:h-4" /><span className="line-clamp-1">{profileData.city || "Не указано"}</span></p>
                          </div>
                          <div className="bg-main rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow md:col-span-2">
                            <p className="text-firm-gray text-xs sm:text-sm font-montserrat mb-1">Адрес доставки</p>
                            <p className="text-sm sm:text-base font-medium line-clamp-2">{profileData.address || "Не указано"}</p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "orders" && (
                    <motion.div key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
                      <h2 className="font-montserrat font-semibold text-xl sm:text-2xl mb-4 sm:mb-6 bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent flex items-center gap-2">Мои заказы</h2>
                      
                      {orders.length === 0 ? (
                        <div className="text-center py-8 sm:py-12 bg-main rounded-xl">
                          <div className="mb-3 sm:mb-4">
                            <ProductsIcon color="#D97C8E" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto opacity-50" />
                          </div>
                          <p className="text-firm-gray mb-3 sm:mb-4 font-montserrat text-sm sm:text-base">У вас пока нет заказов</p>
                          <Link href="/catalog" className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all text-sm sm:text-base"><CatalogPinkIcon color="#f9f9f9" className="w-4 h-4 sm:w-5 sm:h-5" />Перейти в каталог</Link>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {orders.map((order: Order, idx: number) => (
                            <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} whileHover={{ y: -2 }} className="border border-gray-200 rounded-xl p-3 sm:p-5 hover:shadow-lg transition-all">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-montserrat font-semibold text-sm sm:text-base">Заказ #{order.order_number}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
                                  {order.payment_status === 'paid' ? (<span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-firm-green">Оплачен</span>) : (<span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-yellow-100 text-firm-orange">Ожидает оплаты</span>)}
                                </div>
                                <span className="text-xs sm:text-sm text-firm-gray">{new Date(order.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                              </div>
                              
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <p className="text-xs sm:text-sm font-medium">{order.items_count || 0} товаров</p>
                                <span className="font-montserrat font-bold text-base sm:text-xl text-firm-orange">{order.total_amount.toLocaleString()} ₽</span>
                              </div>
                              
                              <div className="mt-2 sm:mt-3 flex justify-end">
                                <Link href={`/profile/orders/${order.id}`} className="text-xs sm:text-sm text-firm-orange hover:underline inline-flex items-center gap-1">Подробнее →</Link>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "favorites" && (
                    <motion.div key="favorites" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
                      <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h2 className="font-montserrat font-semibold text-xl sm:text-2xl bg-linear-to-r from-firm-pink to-firm-orange bg-clip-text text-transparent flex items-center gap-2"><FavoritesIcon color="#D97C8E" className="w-5 h-5 sm:w-6 sm:h-6" />Избранное</h2>
                        <Link href="/favorites" className="text-xs sm:text-sm text-firm-orange hover:underline">Все избранное →</Link>
                      </div>

                      {favorites.length === 0 ? (
                        <div className="text-center py-8 sm:py-12 bg-main rounded-xl">
                          <div className="mb-3 sm:mb-4">
                            <FavoritesIcon color="#D97C8E" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto opacity-50" />
                          </div>
                          <p className="text-firm-gray mb-3 sm:mb-4 font-montserrat text-sm sm:text-base">В избранном пока нет товаров</p>
                          <Link href="/catalog" className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-linear-to-r from-firm-pink to-firm-orange text-main rounded-xl hover:shadow-lg transition-all text-sm sm:text-base">Перейти в каталог</Link>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
                            {favorites.slice(0, 6).map((item: {id: string; title: string; price: number; main_image_url?: string; image?: string; master_name?: string; master_id?: string;}, idx: number) => (
                              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} whileHover={{ y: -5 }} className="group bg-main rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 relative">
                                <Link href={`/catalog/${item.id}`}>
                                  <div className="relative aspect-square bg-main overflow-hidden">
                                    {item.main_image_url || item.image ? (
                                      <img src={item.main_image_url || item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-firm-gray text-[10px] sm:text-xs">Нет фото</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 sm:p-4">
                                    <h3 className="font-montserrat font-semibold text-xs sm:text-base line-clamp-1 group-hover:text-firm-orange transition-colors">{item.title}</h3>
                                    <p className="text-[10px] sm:text-xs text-firm-gray mt-1 line-clamp-1">от {item.master_name || 'Мастер'}</p>
                                    <div className="flex items-center justify-between mt-2 sm:mt-3">
                                      <span className="font-montserrat font-bold text-sm sm:text-lg text-firm-pink">{item.price.toLocaleString()} ₽</span>
                                      <span className="text-[10px] sm:text-xs text-firm-gray flex items-center gap-0.5 sm:gap-1"><FavoritesIcon color="#D97C8E" className="w-2 h-2 sm:w-3 sm:h-3" /><span className="hidden sm:inline">В избранном</span></span>
                                    </div>
                                  </div>
                                </Link>
                                <button onClick={() => handleRemoveFromFavorites(item.id)} onMouseEnter={() => setIsDeleteHovered(true)} onMouseLeave={() => setIsDeleteHovered(false)} className="absolute top-1 right-1 sm:top-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-md flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100" style={{ backgroundColor: isDeleteHovered ? '#D97C8E' : '#f9f9f9' }}><DeleteIcon className="w-3 h-3 sm:w-4 sm:h-4" color={isDeleteHovered ? '#f9f9f9' : '#D97C8E'} /></button>
                              </motion.div>
                            ))}
                          </div>
                          {favorites.length > 6 && (
                            <div className="text-center mt-4 sm:mt-6">
                              <Link href="/favorites" className="text-xs sm:text-sm text-firm-orange hover:underline inline-flex items-center gap-1">Показать все {favorites.length} товаров →</Link>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "settings" && (
                    <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-main rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
                      <h2 className="font-montserrat font-semibold text-xl sm:text-2xl mb-4 sm:mb-6 flex items-center gap-2"><SettingsIcon color="#D97C8E" className="w-5 h-5 sm:w-6 sm:h-6" />Настройки</h2>
                      <div className="space-y-4 sm:space-y-6">
                        <div>
                          <h3 className="font-montserrat font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2"><PasswordIcon color="#D97C8E" className="w-4 h-4 sm:w-5 sm:h-5" />Смена пароля</h3>
                          <form className="space-y-3 sm:space-y-4 max-w-md">
                            <div>
                              <label className="block text-text mb-1 sm:mb-2 text-xs sm:text-sm font-medium">Текущий пароль</label>
                              <input type="password" className="w-full p-2 sm:p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="••••••••"/>
                            </div>
                            <div>
                              <label className="block text-text mb-1 sm:mb-2 text-xs sm:text-sm font-medium">Новый пароль</label>
                              <input type="password" className="w-full p-2 sm:p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" placeholder="не менее 6 символов"/>
                            </div>
                            <div>
                              <label className="block text-text mb-1 sm:mb-2 text-xs sm:text-sm font-medium">Подтверждение</label>
                              <input type="password" className="w-full p-2 sm:p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="повторите пароль"/>
                            </div>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 sm:px-6 py-1.5 sm:py-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-montserrat font-medium hover:shadow-lg transition-all text-sm sm:text-base">Изменить пароль</motion.button>
                          </form>
                        </div>

                        <div className="border-t border-gray-200 pt-4 sm:pt-6">
                          <h3 className="font-montserrat font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2"><NotificateIcon color="#D97C8E" className="w-4 h-4 sm:w-5 sm:h-5" />Уведомления и рассылка</h3>
                          <div className="space-y-2 sm:space-y-3">
                            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input type="checkbox" checked={notifications.orderStatus} onChange={(e) => handleNotificationChange("orderStatus", e.target.checked)} className="w-4 h-4 sm:w-5 sm:h-5 appearance-none border-2 border-firm-orange rounded-md bg-main checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer" />
                                {notifications.orderStatus && (
                                  <svg className="absolute w-3 h-3 sm:w-4 sm:h-4 text-main left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-text select-none group-hover:text-firm-orange transition-colors text-xs sm:text-sm">О статусе заказов</span>
                            </label>

                            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input type="checkbox" checked={notifications.promotions} onChange={(e) => handleNotificationChange("promotions", e.target.checked)} className="w-4 h-4 sm:w-5 sm:h-5 appearance-none border-2 border-firm-pink rounded-md bg-main checked:bg-firm-pink checked:border-firm-pink transition-all duration-200 cursor-pointer" />
                                {notifications.promotions && (
                                  <svg className="absolute w-3 h-3 sm:w-4 sm:h-4 text-main left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-text select-none group-hover:text-firm-pink transition-colors text-xs sm:text-sm">О новинках и акциях (рассылка)</span>
                            </label>

                            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input type="checkbox" checked={notifications.messages} onChange={(e) => handleNotificationChange("messages", e.target.checked)} className="w-4 h-4 sm:w-5 sm:h-5 appearance-none border-2 border-firm-orange rounded-md bg-main checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer" />
                                {notifications.messages && (
                                  <svg className="absolute w-3 h-3 sm:w-4 sm:h-4 text-main left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-text select-none group-hover:text-firm-orange transition-colors text-xs sm:text-sm">О новых сообщениях</span>
                            </label>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4 sm:pt-6">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={saveNotificationSettings} disabled={savingNotifications} className="px-4 sm:px-6 py-1.5 sm:py-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-montserrat font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 text-sm sm:text-base"><SaveIcon color="#f9f9f9" className="w-3 h-3 sm:w-4 sm:h-4" />{savingNotifications ? "Сохранение..." : "Сохранить настройки уведомлений"}</motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
    </>
  );
}