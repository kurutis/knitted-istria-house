// src/app/admin/dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AddYarnModal from "@/components/admin/AddYarnModal";
import CreateUserModal from "@/components/admin/CreateUserModal";

// SVG иконки
const UsersIcon = () => (
  <svg
    className="w-8 h-8 text-gray-300"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const PaintbrushIcon = () => (
  <svg
    className="w-8 h-8 text-gray-300"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

const PackageIcon = () => (
  <svg
    className="w-8 h-8 text-gray-300"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const ShoppingCartIcon = () => (
  <svg
    className="w-8 h-8 text-gray-300"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M18 13l1.5 6M9 21h6M12 15v6"
    />
  </svg>
);

const TrendingUpIcon = () => (
  <svg
    className="w-3 h-3 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);

const TrendingDownIcon = () => (
  <svg
    className="w-3 h-3 text-red-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="w-3 h-3 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const PlusCircleIcon = () => (
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
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const UserPlusIcon = () => (
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
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
    />
  </svg>
);

interface DashboardStats {
    totalUsers: number
    totalMasters: number
    totalProducts: number
    totalOrders: number
    totalRevenue: number
    monthlyRevenue: number
    monthlyOrders: number
    pendingModeration: {
        masters: number
        products: number
    }
    recentUsers: Array<{
        id: string
        name?: string
        email: string
        role: string
        role_code: string
        created_at: string
        phone?: string | null
        avatar?: string | null
        city?: string | null
    }>
    recentOrders: Array<{
        id: string
        order_number: string
        total_amount: number
        status: string  // Это статус-код ('new', 'processing', 'shipped', 'delivered', 'cancelled')
        status_code?: string
        created_at: string
        buyer_name?: string
        buyer_email?: string
    }>
    topCategories: Array<{
        name: string
        count: number
    }>
    trends: {
        users: number
        orders: number
        revenue: number
    }
    lastUpdated: string
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showYarnModal, setShowYarnModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

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
        throw new Error(data.error || "Failed to load stats");
      }

      const data = await response.json();
      console.log("Dashboard data:", data);
      setStats(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Неизвестная ошибка";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (statusCode: string) => {
    switch (statusCode) {
        case 'new':
            return 'bg-blue-100 text-blue-700';
        case 'processing':
            return 'bg-yellow-100 text-yellow-700';
        case 'shipped':
            return 'bg-purple-100 text-purple-700';
        case 'delivered':
            return 'bg-green-100 text-green-700';
        case 'cancelled':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};
  const getStatusText = (statusCode: string) => {
    switch (statusCode) {
        case 'new':
            return '🆕 Новый';
        case 'processing':
            return '⚙️ В обработке';
        case 'shipped':
            return '📦 Отправлен';
        case 'delivered':
            return '✅ Доставлен';
        case 'cancelled':
            return '❌ Отменён';
        default:
            return statusCode;
    }
};

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor(
      (now.getTime() - date.getTime()) / 1000 / 60 / 60 / 24,
    );

    if (diff === 0) return "сегодня";
    if (diff === 1) return "вчера";
    if (diff < 7) return `${diff} дня назад`;
    return date.toLocaleDateString("ru-RU");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка панели управления...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => loadDashboardStats()}
            className="px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Пользователи",
      value: stats.totalUsers,
      icon: UsersIcon,
      color: "from-blue-500 to-blue-600",
      trend: stats.trends?.users ?? 0,
      link: "/admin/users",
    },
    {
      label: "Мастера",
      value: stats.totalMasters,
      icon: PaintbrushIcon,
      color: "from-pink-500 to-pink-600",
      trend: 0,
      link: "/admin/moderation/masters",
    },
    {
      label: "Товары",
      value: stats.totalProducts,
      icon: PackageIcon,
      color: "from-orange-500 to-orange-600",
      trend: 0,
      link: "/admin/moderation/products",
    },
    {
      label: "Заказы",
      value: stats.totalOrders,
      icon: ShoppingCartIcon,
      color: "from-purple-500 to-purple-600",
      trend: stats.trends?.orders ?? 0,
      link: "/admin/dashboard",
    },
  ];

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Заголовок с кнопкой обновления */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
              Панель управления
            </h1>
            {stats.lastUpdated && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <ClockIcon />
                Обновлено:{" "}
                {new Date(stats.lastUpdated).toLocaleTimeString("ru-RU")}
              </p>
            )}
          </div>
          <button
            onClick={() => loadDashboardStats(true)}
            disabled={refreshing}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                Обновление...
              </>
            ) : (
              <>
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Обновить
              </>
            )}
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((item, index) => (
            <Link key={item.label} href={item.link}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">
                      {item.label}
                    </p>
                    <p
                      className={`text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}
                    >
                      {item.value}
                    </p>
                    {item.trend !== 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {item.trend > 0 ? (
                          <TrendingUpIcon />
                        ) : (
                          <TrendingDownIcon />
                        )}
                        <span
                          className={`text-xs ${item.trend > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {Math.abs(item.trend)}% за месяц
                        </span>
                      </div>
                    )}
                  </div>
                  <item.icon />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Финансовая статистика */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/80 text-sm">Общая выручка</p>
                <p className="text-3xl font-bold">
                  {stats.totalRevenue.toLocaleString()} ₽
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-sm">За последние 30 дней</p>
                <p className="text-xl font-semibold">
                  {stats.monthlyRevenue.toLocaleString()} ₽
                </p>
                <p className="text-sm text-white/70">
                  {stats.monthlyOrders} заказов
                </p>
              </div>
            </div>
          </motion.div>

          {/* Топ категории */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-gray-800 mb-4">
              Популярные категории
            </h3>
            <div className="space-y-3">
              {stats.topCategories.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center text-sm font-bold text-firm-orange">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{cat.name}</span>
                      <span className="text-gray-500">{cat.count} товаров</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-firm-orange to-firm-pink h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(cat.count / (stats.topCategories[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Ожидают модерации */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800 mb-4">
            Ожидают модерации
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/admin/moderation/masters">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-xl hover:from-orange-500/20 hover:to-pink-500/20 transition-all duration-300 cursor-pointer">
                <span className="font-medium text-gray-700">
                  👨‍🎨 Мастера на верификацию
                </span>
                <span className="text-2xl font-bold text-firm-orange">
                  {stats.pendingModeration.masters}
                </span>
              </div>
            </Link>
            <Link href="/admin/moderation/products">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl hover:from-purple-500/20 hover:to-pink-500/20 transition-all duration-300 cursor-pointer">
                <span className="font-medium text-gray-700">
                  🎁 Товары на модерацию
                </span>
                <span className="text-2xl font-bold text-firm-pink">
                  {stats.pendingModeration.products}
                </span>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Быстрые действия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800 mb-4">
            Быстрые действия
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowYarnModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
            >
              <PlusCircleIcon />
              Добавить пряжу
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              className="px-4 py-2 border-2 border-firm-pink text-firm-pink rounded-xl hover:bg-firm-pink hover:text-white transition flex items-center gap-2"
            >
              <UserPlusIcon />
              Создать пользователя
            </button>
          </div>
        </motion.div>

        {/* Последние пользователи */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800">
              Последние пользователи
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Имя
                  </th>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Роль
                  </th>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers?.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-300"
                  >
                    <td className="p-4 text-gray-800">{user.name || "-"}</td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "Мастер"
                            ? "bg-green-100 text-green-700"
                            : user.role === "Администратор"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Последние заказы */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800">
              Последние заказы
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    № Заказа
                  </th>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Покупатель
                  </th>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Сумма
                  </th>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Статус
                  </th>
                  <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders?.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-300"
                  >
                    <td className="p-4 font-mono text-sm">
                      {order.order_number}
                    </td>
                    <td className="p-4 text-gray-800">
                      {order.buyer_name || "-"}
                    </td>
                    <td className="p-4 font-semibold text-firm-orange">
                      {order.total_amount.toLocaleString()} ₽
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Модальные окна */}
      <AddYarnModal
        isOpen={showYarnModal}
        onClose={() => setShowYarnModal(false)}
        onSuccess={() => loadDashboardStats(true)}
      />

      <CreateUserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSuccess={() => loadDashboardStats(true)}
      />
    </>
  );
}
