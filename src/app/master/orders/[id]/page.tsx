// src/app/master/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// Интерфейсы для типизации данных
interface OrderItem {
  id: number;
  product_id: string;
  product_title: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  total_amount: number;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_address: string;
  buyer_comment: string | null;
  tracking_number?: string;
  items: OrderItem[];
}

// Тип для ошибки API
type ApiError = {
  error: string;
};

export default function MasterOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  // Загрузка данных заказа
  useEffect(() => {
    if (!orderId) return;
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/master/orders/${orderId}`);
      
      if (!response.ok) {
        if (response.status === 404) toast.error('Заказ не найден');
        if (response.status === 403) toast.error('Нет доступа к этому заказу');
        throw new Error('Ошибка загрузки');
      }
      
      const data = await response.json();
      setOrder(data.order);
      setTrackingNumber(data.order.tracking_number || '');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось загрузить данные заказа');
    } finally {
      setLoading(false);
    }
  };

  // Обновление статуса заказа
  const updateOrderStatus = async (newStatus: OrderDetails['status']) => {
    if (newStatus === 'shipped' && !trackingNumber.trim()) {
      toast.error('Укажите трек-номер для отправки');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/master/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          tracking_number: newStatus === 'shipped' ? trackingNumber : undefined,
        }),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || 'Ошибка обновления');
      }

      const updated = await response.json();
      setOrder(updated.order);
      setTrackingNumber(updated.order.tracking_number || '');
      toast.success(`Статус заказа обновлён на "${getStatusText(newStatus)}"`);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  // Вспомогательные функции для отображения статусов
  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return '🆕 Новый';
      case 'processing': return '✅ В обработке';
      case 'shipped': return '📦 Отправлен';
      case 'delivered': return '🏠 Доставлен';
      case 'cancelled': return '❌ Отменён';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'processing': return 'bg-yellow-100 text-yellow-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-700 mb-4">Заказ не найден</h1>
        <Link href="/" className="text-firm-orange hover:underline">
          Вернуться в панель управления
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Заголовок и навигация */}
        <div className="mb-6">
          <Link href="/" className="text-firm-orange hover:underline inline-flex items-center gap-1">
            ← Назад в панель управления
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Шапка заказа */}
          <div className="p-6 border-b bg-gradient-to-r from-firm-orange/5 to-firm-pink/5">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">Заказ #{order.order_number}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  от {new Date(order.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {order.payment_status === 'paid' ? '✅ Оплачен' : '⏳ Ожидает оплаты'}
                </span>
              </div>
            </div>
          </div>

          {/* Основная информация */}
          <div className="p-6 space-y-8">
            {/* Информация о покупателе и доставке */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-lg mb-3">👤 Покупатель</h3>
                <p><span className="text-gray-500">Имя:</span> {order.buyer_name}</p>
                <p><span className="text-gray-500">Email:</span> {order.buyer_email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-lg mb-3">🚚 Адрес доставки</h3>
                <p>{order.shipping_full_name}</p>
                <p>{order.shipping_phone}</p>
                <p>{order.shipping_city}, {order.shipping_address}</p>
              </div>
            </div>

            {/* Комментарий покупателя */}
            {order.buyer_comment && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <h3 className="font-semibold text-amber-800 mb-2">💬 Комментарий к заказу</h3>
                <p className="text-amber-900">{order.buyer_comment}</p>
              </div>
            )}

            {/* Товары в заказе */}
            <div>
              <h3 className="font-semibold text-lg mb-4">📦 Состав заказа</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.product_title}</p>
                      <p className="text-sm text-gray-500">Количество: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-firm-orange">{item.total.toLocaleString()} ₽</p>
                  </div>
                ))}
              </div>
              <div className="text-right mt-4 pt-3 border-t">
                <p className="text-xl font-bold">
                  Итого: <span className="text-firm-orange">{order.total_amount.toLocaleString()} ₽</span>
                </p>
              </div>
            </div>

            {/* Управление статусом (только для неотменённых и не доставленных заказов) */}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4">✏️ Управление заказом</h3>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm text-gray-600 mb-1">Изменить статус</label>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(e.target.value as OrderDetails['status'])}
                      disabled={updating}
                      className="w-full p-2 border rounded-lg focus:border-firm-orange focus:outline-none"
                    >
                      <option value="new">🆕 Новый</option>
                      <option value="processing">✅ В обработку</option>
                      <option value="shipped">📦 Отправлен</option>
                      <option value="cancelled">❌ Отменить</option>
                    </select>
                  </div>

                  {order.status === 'processing' && (
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm text-gray-600 mb-1">Трек-номер (для отправки)</label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Введите трек-номер"
                        className="w-full p-2 border rounded-lg focus:border-firm-orange focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Отображение трек-номера для отправленных заказов */}
            {order.status === 'shipped' && order.tracking_number && (
              <div className="border-t pt-6">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-800 mb-2">📮 Трек-номер для отслеживания</h3>
                  <p className="text-blue-900 font-mono">{order.tracking_number}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}