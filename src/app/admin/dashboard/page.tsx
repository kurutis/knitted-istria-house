"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import AddYarnModal from "@/components/admin/AddYarnModal";
import CreateUserModal from "@/components/admin/CreateUserModal";

// Иконки из вашей библиотеки
import { UserIcon } from "@/components/icons/UserIcon";
import { ProductsIcon } from "@/components/icons/ProductsIcon";
import { CartIcon } from "@/components/icons/CartIcon";
import { DashboardIcon } from "@/components/icons/DashboardIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { RefreshIcon } from "@/components/icons/RefreshIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon";
import { TruckIcon } from "@/components/icons/TruckIcon";
import { PackageIcon } from "@/components/icons/PackageIcon";

// Временные иконки (создайте их в библиотеке позже
const TrendingUpIcon = ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);
const TrendingDownIcon = ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
);
const UserPlusIcon = ({ className, color }: { className?: string; color?: string }) => (
    <svg className={className} fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
);

// Интерфейсы
interface DashboardStats {
    totalUsers: number;
    totalMasters: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    monthlyRevenue: number;
    monthlyOrders: number;
    pendingModeration: { masters: number; products: number };
    recentUsers: Array<{ id: string; name?: string; email: string; role: string; created_at: string }>;
    recentOrders: Array<{ id: string; order_number: string; total_amount: number; status: string; created_at: string; buyer_name?: string }>;
    topCategories: Array<{ name: string; count: number }>;
    trends: { users: number; orders: number; revenue: number };
    lastUpdated: string;
}

// Компонент статуса заказа
const OrderStatusBadge = ({ status }: { status: string }) => {
    const getStatusColor = () => {
        switch (status) {
            case "new": return "bg-blue-50 text-blue-600 border-blue-200";
            case "processing": return "bg-yellow-50 text-yellow-600 border-yellow-200";
            case "shipped": return "bg-purple-50 text-purple-600 border-purple-200";
            case "delivered": return "bg-green-50 text-green-600 border-green-200";
            case "cancelled": return "bg-red-50 text-red-600 border-red-200";
            default: return "bg-gray-50 text-gray-600 border-gray-200";
        }
    };
    const getStatusIcon = () => {
        if (status === "shipped") return <TruckIcon className="w-3 h-3" color="#8B5CF6" />;
        if (status === "delivered") return <CheckCircleIcon className="w-3 h-3" color="#22C55E" />;
        return null;
    };
    const getStatusText = () => {
        switch (status) {
            case "new": return "Новый";
            case "processing": return "В обработке";
            case "shipped": return "Отправлен";
            case "delivered": return "Доставлен";
            case "cancelled": return "Отменён";
            default: return status;
        }
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusText()}
        </span>
    );
};

// Компонент бейджа роли
const RoleBadge = ({ role }: { role: string }) => {
    const getRoleColor = () => {
        if (role === "Мастер") return "bg-green-50 text-green-700 border-green-200";
        if (role === "Администратор") return "bg-red-50 text-red-700 border-red-200";
        return "bg-blue-50 text-blue-700 border-blue-200";
    };
    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor()}`}>
            {role}
        </span>
    );
};

export default function AdminDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [showYarnModal, setShowYarnModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (status === "loading") return;
        if (!session || session.user?.role !== "admin") {
            router.push("/auth/signin");
            return;
        }
        loadDashboardStats();
    }, [session, status, router]);

    const loadDashboardStats = async (refresh = false) => {
        try {
            if (refresh) setRefreshing(true);
            else setLoading(true);
            const response = await fetch("/api/admin/dashboard");
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Не удалось загрузить статистику");
            }
            const data = await response.json();
            setStats(data);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60 / 24);
        if (diff === 0) return "сегодня";
        if (diff === 1) return "вчера";
        if (diff < 7) return `${diff} дня назад`;
        return date.toLocaleDateString("ru-RU");
    };

    const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };
    const staggerContainer = { animate: { transition: { staggerChildren: 0.1 } } };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-4 font-montserrat text-firm-gray text-sm sm:text-base">Загрузка панели управления...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-firm-red mb-4">{error}</p>
                    <button
                        onClick={() => loadDashboardStats()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                        <RefreshIcon className="w-4 h-4" color="#f9f9f9" />
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const statCards = [
        { label: "Пользователи", value: stats.totalUsers, icon: <UserIcon className="w-6 h-6 sm:w-8 sm:h-8" />, color: "#3B82F6", bg: "bg-blue-50", trend: stats.trends?.users ?? 0, link: "/admin/users" },
        { label: "Мастера", value: stats.totalMasters, icon: <DashboardIcon className="w-6 h-6 sm:w-8 sm:h-8" />, color: "#D97C8E", bg: "bg-pink-50", trend: 0, link: "/admin/moderation/masters" },
        { label: "Товары", value: stats.totalProducts, icon: <ProductsIcon className="w-6 h-6 sm:w-8 sm:h-8" />, color: "#F4A67F", bg: "bg-orange-50", trend: 0, link: "/admin/moderation/products" },
        { label: "Заказы", value: stats.totalOrders, icon: <CartIcon className="w-6 h-6 sm:w-8 sm:h-8" />, color: "#94D06C", bg: "bg-green-50", trend: stats.trends?.orders ?? 0, link: "/admin/dashboard" },
    ];

    return (
        <>
            <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                        <div>
                            <h1 className="font-montserrat font-bold text-2xl sm:text-3xl lg:text-4xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Панель управления</h1>
                            {stats.lastUpdated && (<p className="text-firm-gray text-xs sm:text-sm mt-1 flex items-center gap-1"><ClockIcon className="w-3 h-3" />Обновлено: {new Date(stats.lastUpdated).toLocaleTimeString("ru-RU")}</p>)}
                        </div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => loadDashboardStats(true)} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-firm-gray rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 text-sm">
                            {refreshing ? (
                                <>
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-firm-gray border-t-transparent rounded-full" />
                                    <span>Обновление...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshIcon className="w-4 h-4" color="#737682" />
                                    <span>Обновить</span>
                                </>
                            )}
                        </motion.button>
                    </motion.div>

                    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                        {statCards.map((stat, idx) => (
                            <motion.div key={stat.label} variants={fadeInUp} whileHover={{ y: -5 }}>
                                <Link href={stat.link}>
                                    <div className={`bg-main rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300 ${stat.bg} border border-gray-100`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-firm-gray text-xs sm:text-sm font-montserrat">{stat.label}</p>
                                                <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.1, type: "spring" }} className="text-xl sm:text-2xl md:text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value.toLocaleString()}</motion.p>
                                                {stat.trend !== 0 && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {stat.trend > 0 ? (<TrendingUpIcon className="w-3 h-3" color="#22C55E" />) : (<TrendingDownIcon className="w-3 h-3" color="#EF4444" />)}
                                                        <span className={`text-xs ${stat.trend > 0 ? "text-firm-green" : "text-firm-red"}`}>{Math.abs(stat.trend)}% за месяц</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="opacity-80">{stat.icon}</div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        <motion.div variants={fadeInUp} className="bg-linear-to-r from-firm-green to-green-600 rounded-2xl shadow-lg p-4 sm:p-6 text-main">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <p className="text-main/80 text-sm">Общая выручка</p>
                                    <p className="text-main/80 text-2xl sm:text-3xl font-bold">{stats.totalRevenue.toLocaleString()} ₽</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-main/80 text-sm">За последние 30 дней</p>
                                    <p className="text-main/80 text-xl sm:text-2xl font-semibold">{stats.monthlyRevenue.toLocaleString()} ₽</p>
                                    <p className="text-sm text-main/70">{stats.monthlyOrders} заказов</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="bg-main rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                            <h3 className="font-montserrat font-semibold text-lg text-text mb-4">Популярные категории</h3>
                            <div className="space-y-3">
                                {stats.topCategories.map((cat, idx) => (
                                    <div key={cat.name} className="flex items-center gap-3">
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-linear-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center text-xs sm:text-sm font-bold text-firm-orange">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs sm:text-sm mb-1">
                                                <span className="text-text">{cat.name}</span>
                                                <span className="text-firm-gray">{cat.count} товаров</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                                                <div className="bg-linear-to-r from-firm-orange to-firm-pink h-1.5 sm:h-2 rounded-full transition-all duration-500" style={{ width: `${(cat.count / (stats.topCategories[0]?.count || 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    <motion.div variants={fadeInUp} className="bg-main rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 mb-6 sm:mb-8">
                        <h2 className="font-montserrat font-semibold text-lg sm:text-xl text-text mb-4">Ожидают модерации</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <Link href="/admin/moderation/masters">
                                <div className="flex justify-between items-center p-3 sm:p-4 bg-linear-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl hover:from-firm-orange/20 hover:to-firm-pink/20 transition-all duration-300 cursor-pointer">
                                    <span className="font-medium text-text flex items-center gap-2"><UserIcon className="w-4 h-4" color="#F4A67F" />Мастера на верификацию</span>
                                    <span className="text-xl sm:text-2xl font-bold text-firm-orange">{stats.pendingModeration.masters}</span>
                                </div>
                            </Link>
                            <Link href="/admin/moderation/products">
                                <div className="flex justify-between items-center p-3 sm:p-4 bg-linear-to-r from-firm-pink/10 to-purple-500/10 rounded-xl hover:from-firm-pink/20 hover:to-purple-500/20 transition-all duration-300 cursor-pointer">
                                    <span className="font-medium text-text flex items-center gap-2"><ProductsIcon className="w-4 h-4" color="#D97C8E" />Товары на модерацию</span>
                                    <span className="text-xl sm:text-2xl font-bold text-firm-pink">{stats.pendingModeration.products}</span>
                                </div>
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="bg-main rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 mb-6 sm:mb-8">
                        <h2 className="font-montserrat font-semibold text-lg sm:text-xl text-text mb-4">Быстрые действия</h2>
                        <div className="flex flex-wrap gap-3">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowYarnModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl text-sm hover:shadow-lg transition-all duration-300"><PlusIcon className="w-4 h-4" color="#f9f9f9" />Добавить пряжу</motion.button>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowUserModal(true)} className="inline-flex items-center gap-2 px-4 py-2 border-2 border-firm-pink text-firm-pink rounded-xl text-sm hover:bg-firm-pink hover:text-main transition-all duration-300"><UserPlusIcon className="w-4 h-4" color="#D97C8E" />Создать пользователя</motion.button>
                        </div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="bg-main rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-6 sm:mb-8">
                        <div className="p-4 sm:p-6 border-b border-gray-100">
                            <h2 className="font-montserrat font-semibold text-lg sm:text-xl text-text">Последние пользователи</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-150">
                                <thead className="bg-linear-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Имя</th>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Email</th>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Роль</th>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Дата</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentUsers?.map((user, idx) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-300">
                                            <td className="p-3 sm:p-4 text-text text-sm">{user.name || "-"}</td>
                                            <td className="p-3 sm:p-4 text-firm-gray text-sm">{user.email}</td>
                                            <td className="p-3 sm:p-4"><RoleBadge role={user.role} /></td>
                                            <td className="p-3 sm:p-4 text-firm-gray text-sm">{formatDate(user.created_at)}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="p-4 sm:p-6 border-b border-gray-100">
                            <h2 className="font-montserrat font-semibold text-lg sm:text-xl text-text">Последние заказы</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-175">
                                <thead className="bg-linear-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">№ Заказа</th>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Покупатель</th>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Сумма</th>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Статус</th>
                                        <th className="text-left p-3 sm:p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Дата</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentOrders?.map((order, idx) => (
                                        <motion.tr key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-300">
                                            <td className="p-3 sm:p-4 font-mono text-sm text-text">{order.order_number}</td>
                                            <td className="p-3 sm:p-4 text-text text-sm">{order.buyer_name || "-"}</td>
                                            <td className="p-3 sm:p-4 font-semibold text-firm-orange text-sm">{order.total_amount.toLocaleString()} ₽</td>
                                            <td className="p-3 sm:p-4"><OrderStatusBadge status={order.status} /></td>
                                            <td className="p-3 sm:p-4 text-firm-gray text-sm">{formatDate(order.created_at)}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>

            <AddYarnModal isOpen={showYarnModal} onClose={() => setShowYarnModal(false)} onSuccess={() => loadDashboardStats(true)} />
            <CreateUserModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} onSuccess={() => loadDashboardStats(true)} />
        </>
    );
}