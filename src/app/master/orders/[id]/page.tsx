'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { CartIcon } from '@/components/icons/CartIcon';
import { UserIcon } from '@/components/icons/UserIcon';
import { LocateIcon } from '@/components/icons/LocateIcon';
import { MailIcon } from '@/components/icons/MailIcon';
import { PhoneIcon } from '@/components/icons/PhoneIcon';
import { PackageIcon } from '@/components/icons/PackageIcon';
import { TruckIcon } from '@/components/icons/TruckIcon';
import { CheckCircleIcon } from '@/components/icons/CheckCircleIcon';
import { ClockIcon } from '@/components/icons/ClockIcon';
import { CloseIcon } from '@/components/icons/CloseIcon';
import { ArrowLeftIcon } from '@/components/icons/ArrowLeftIcon';
import { CommentIcon } from '@/components/icons/CommentIcon';
import { EditIcon } from '@/components/icons/EditIcon';

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

type ApiError = { error: string };

const StatusBadge = ({ status }: { status: OrderDetails['status'] }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'new': return <ClockIcon className="w-3 h-3" color="#3B82F6" size={12} />;
      case 'processing': return <ClockIcon className="w-3 h-3" color="#F4A67F" size={12} />;
      case 'shipped': return <TruckIcon className="w-3 h-3" color="#D97C8E" size={12} />;
      case 'delivered': return <CheckCircleIcon className="w-3 h-3" color="#94D06C" size={12} />;
      case 'cancelled': return <CloseIcon className="w-3 h-3" color="#D77C7C" size={12} />;
      default: return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'new': return 'Новый';
      case 'processing': return 'В обработке';
      case 'shipped': return 'Отправлен';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменён';
      default: return status;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'processing': return 'bg-orange-50 text-firm-orange border-orange-200';
      case 'shipped': return 'bg-pink-50 text-firm-pink border-pink-200';
      case 'delivered': return 'bg-green-50 text-firm-green border-green-200';
      case 'cancelled': return 'bg-red-50 text-firm-red border-red-200';
      default: return 'bg-gray-50 text-firm-gray border-gray-200';
    }
  };

  return (
    <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.1 }} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>{getStatusIcon()}{getStatusText()}</motion.span>
  );
};

const PaymentBadge = ({ status }: { status: OrderDetails['payment_status'] }) => {
  if (status === 'paid') {
    return (
      <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.15 }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-firm-green border border-green-200"><CheckCircleIcon className="w-3 h-3" color="#94D06C" size={12} />Оплачен</motion.span>
    );
  }
  return (
    <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.15 }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-firm-orange border border-orange-200"><ClockIcon className="w-3 h-3" color="#F4A67F" size={12} />Ожидает оплаты</motion.span>
  );
};

export default function MasterOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const updateOrderStatus = async (newStatus: OrderDetails['status']) => {
    if (newStatus === 'shipped' && !trackingNumber.trim()) {
      toast.error('Укажите трек-номер для отправки');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/master/orders/${orderId}`, {method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({status: newStatus, tracking_number: newStatus === 'shipped' ? trackingNumber : undefined})});

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Новый';
      case 'processing': return 'В обработке';
      case 'shipped': return 'Отправлен';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменён';
      default: return status;
    }
  }

  const fadeInUp = {initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }};

  const staggerContainer = {animate: { transition: { staggerChildren: 0.1 } }};

  if (loading) {
    return (
      <div className="min-h-screen bg-main flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray">Загрузка заказа...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-main flex flex-col items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <PackageIcon className="w-16 h-16 mx-auto text-firm-gray mb-4" />
          <h1 className="font-['Montserrat_Alternates'] text-xl font-semibold text-text mb-2">Заказ не найден</h1>
          <p className="text-firm-gray mb-6">Заказ, который вы ищете, не существует или был удален</p>
          <Link href="/master/dashboard" className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all duration-300"><ArrowLeftIcon className="w-4 h-4" color="#f9f9f9" /> Вернуться в панель управления</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-main to-gray-50 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <Link href="/master/dashboard" className="inline-flex items-center gap-1.5 text-firm-gray hover:text-firm-orange transition-colors duration-300 text-sm"><ArrowLeftIcon className="w-4 h-4" color="#737682" />Назад в панель управления</Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-main rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-linear-to-r from-firm-orange/5 to-firm-pink/5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="font-['Montserrat_Alternates'] font-bold text-xl sm:text-2xl text-text">Заказ #{order.order_number}</motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-firm-gray text-xs sm:text-sm mt-1">от{' '}{new Date(order.created_at).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'})}</motion.p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={order.status} />
                <PaymentBadge status={order.payment_status} />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <motion.div variants={fadeInUp} className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-text mb-3 flex items-center gap-2"><UserIcon className="w-4 h-4" color="#242424" />Покупатель</h3>
                <div className="space-y-2">
                  <p className="text-sm"><span className="text-firm-gray">Имя:</span>{' '}<span className="text-text">{order.buyer_name}</span></p>
                  <p className="text-sm flex items-center gap-2"><MailIcon className="w-3.5 h-3.5" color="#737682" /><span className="text-firm-gray">Email:</span>{' '}<span className="text-text">{order.buyer_email}</span></p>
                  {order.shipping_phone && (<p className="text-sm flex items-center gap-2"><PhoneIcon className="w-3.5 h-3.5" color="#737682" /><span className="text-firm-gray">Телефон:</span>{' '}<span className="text-text">{order.shipping_phone}</span></p>)}
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-text mb-3 flex items-center gap-2"><LocateIcon className="w-4 h-4" color="#242424" />Адрес доставки</h3>
                <div className="space-y-1">
                  <p className="text-text text-sm">{order.shipping_full_name}</p>
                  <p className="text-text text-sm">{order.shipping_city}, {order.shipping_address}</p>
                </div>
              </motion.div>
            </motion.div>

            {order.buyer_comment && (
              <motion.div variants={fadeInUp} className="bg-firm-orange/5 p-4 rounded-xl border border-firm-orange/20">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-firm-orange mb-2 flex items-center gap-2"><CommentIcon className="w-4 h-4" color="#F4A67F" />Комментарий к заказу</h3>
                <p className="text-text text-sm">{order.buyer_comment}</p>
              </motion.div>
            )}

            <motion.div variants={fadeInUp}>
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-text mb-4 flex items-center gap-2"><CartIcon className="w-4 h-4" color="#242424" />Состав заказа</h3>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg gap-2">
                    <div>
                      <p className="font-medium text-text">{item.product_title}</p>
                      <p className="text-xs text-firm-gray">Количество: {item.quantity} шт.</p>
                    </div>
                    <p className="font-bold text-firm-pink">{item.total.toLocaleString()} ₽</p>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-right mt-4 pt-3 border-t border-gray-100">
                <p className="text-base sm:text-lg font-bold">Итого:{' '}<span className="text-firm-orange">{order.total_amount.toLocaleString()} ₽</span></p>
              </motion.div>
            </motion.div>

            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <motion.div variants={fadeInUp} className="border-t border-gray-100 pt-6">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-text mb-4 flex items-center gap-2"><EditIcon className="w-4 h-4" color="#242424" />Управление заказом</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-firm-gray mb-1.5">Изменить статус</label>
                    <select value={order.status} onChange={(e) =>updateOrderStatus(e.target.value as OrderDetails['status'])} disabled={updating} className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all bg-main text-text">
                      <option value="new">Новый</option>
                      <option value="processing">В обработку</option>
                      <option value="shipped">Отправлен</option>
                      <option value="cancelled">Отменить</option>
                    </select>
                  </div>

                  {order.status === 'processing' && (
                    <div className="flex-1">
                      <label className="block text-sm text-firm-gray mb-1.5">Трек-номер (для отправки)</label>
                      <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Введите трек-номер" className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all bg-forms text-text" />
                    </div>
                  )}
                </div>
                {updating && (
                  <div className="mt-4 flex justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-firm-orange border-t-transparent rounded-full" />
                  </div>
                )}
              </motion.div>
            )}

            {order.status === 'shipped' && order.tracking_number && (
              <motion.div variants={fadeInUp} className="border-t border-gray-100 pt-6">
                <div className="bg-firm-orange/5 p-4 rounded-xl border border-firm-orange/20">
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-firm-orange mb-2 flex items-center gap-2"><TruckIcon className="w-4 h-4" color="#F4A67F" />Трек-номер для отслеживания</h3>
                  <p className="text-text font-mono text-sm">{order.tracking_number}</p>
                </div>
              </motion.div>
            )}

            {(order.status === 'delivered' || order.status === 'cancelled') && (
              <motion.div variants={fadeInUp} className="border-t border-gray-100 pt-6 text-center">
                <p className="text-firm-gray text-sm flex items-center justify-center gap-2">
                  {order.status === 'delivered' ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4" color="#94D06C" />
                      Заказ успешно доставлен и завершен
                    </>
                  ) : (
                    <>
                      <CloseIcon className="w-4 h-4" color="#D77C7C" />
                      Заказ отменен
                    </>
                  )}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}