"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { CartIcon } from "@/components/icons/CartIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";
import PaymentGateway from "@/components/payment/PaymentGateway";

interface CartItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  main_image_url: string;
  master_name: string;
}

interface CartData {
  items: CartItem[];
  totalCount: number;
  totalAmount: number;
}

interface ShippingAddress {
  full_name: string;
  phone: string;
  city: string;
  address: string;
  postal_code: string;
}

export default function ShoppingCartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<CartData>({items: [],totalCount: 0, totalAmount: 0});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [step, setStep] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{ id: string; order_number: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info'}>({isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning'});

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    full_name: "",
    phone: "",
    city: "",
    address: "",
    postal_code: "",
  });
  const [comment, setComment] = useState("");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/shopping-cart");
      return;
    }
    if (status === "authenticated") {
      fetchCart();
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && step === 2) {
      fetchUserProfile();
    }
  }, [session, step]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cart");
      const data = await response.json();
      setCart({
        items: data.items || [],
        totalCount: data.totalCount || 0,
        totalAmount: data.totalAmount || 0,
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Ошибка загрузки корзины");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        const profile = data.profile || data;

        setShippingAddress((prev) => ({...prev, full_name: profile.fullname || profile.full_name || session?.user?.name || "", phone: profile.phone || "", city: profile.city || "", address: profile.address || ""}));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdating(productId);
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newQuantity }),
      });

      if (response.ok) {
        await fetchCart();
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Ошибка обновления количества");
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление товара',
      message: 'Вы уверены, что хотите удалить этот товар из корзины?',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setUpdating(productId);
        try {
          const response = await fetch(`/api/cart?productId=${productId}`, {method: "DELETE"});

          if (response.ok) {
            await fetchCart();
            toast.success("Товар удален из корзины");
          }
        } catch (error) {
          console.error("Error removing item:", error);
          toast.error("Ошибка удаления товара");
        } finally {
          setUpdating(null);
        }
      }
    });
  };

  const applyPromoCode = () => {
    if (promoCode === "WELCOME10") {
      setDiscount(cart.totalAmount * 0.1);
      toast.success("Промокод применен! Скидка 10%");
    } else if (promoCode === "FREESHIP") {
      toast.success("Промокод применен! Бесплатная доставка");
    } else {
      toast.error("Неверный промокод");
    }
  };

  const handleShippingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
      if (!shippingAddress.full_name.trim()) {
          toast.error("Укажите ФИО");
          return;
      }
      if (!shippingAddress.phone.trim()) {
          toast.error("Укажите телефон");
          return;
      }
      if (!shippingAddress.city.trim()) {
          toast.error("Укажите город");
          return;
      }
      if (!shippingAddress.address.trim()) {
          toast.error("Укажите адрес доставки");
          return;
      }

      setOrderLoading(true);
      try {
          const response = await fetch("/api/orders", {method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({shippingAddress, discount, comment})});

          const data = await response.json();

          if (!response.ok) {throw new Error(data.error || "Ошибка оформления заказа")}

          setCreatedOrder({id: data.order.id, order_number: data.order.order_number});
          
          setStep(4);
          
      } catch (error) {
          console.error("Error placing order:", error);
          toast.error(error instanceof Error ? error.message : "Ошибка оформления заказа");
      } finally {
          setOrderLoading(false);
      }
  };

  const handlePaymentSuccess = () => {
      toast.success("Заказ успешно оформлен и оплачен!");
      router.push("/profile?tab=orders");
  };

  const estimatedTax = cart.totalAmount * 0.07;
  const shippingCost = step >= 2 ? (cart.totalAmount > 5000 ? 0 : 350) : 0;
  const totalWithDiscount = cart.totalAmount - discount;
  const finalTotal = totalWithDiscount + estimatedTax + shippingCost;

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray">Загрузка корзины...</p>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0 && step === 1) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-main rounded-2xl shadow-lg p-12 max-w-md border border-gray-100">
          <div className="mb-4 flex justify-center">
            <CartIcon color="#D4D4D4" size={64} />
          </div>
          <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-2">Корзина пуста</h1>
          <p className="text-firm-gray mb-6">Добавьте товары, чтобы оформить заказ</p>
          <Link href="/catalog"><motion.button className="px-6 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition" whileHover={{ scale: 1.02 }}  whileTap={{ scale: 0.98 }}>Перейти в каталог</motion.button></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-6">Оформление заказа</h1>

          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            {[{ num: 1, title: "Корзина" }, { num: 2, title: "Доставка" },{ num: 3, title: "Подтверждение" }, { num: 4, title: "Оплата" }].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <motion.button onClick={() => {if (s.num === 4 && !createdOrder) return; setStep(s.num) }} className={`flex items-center gap-2 ${step >= s.num ? "text-firm-orange" : "text-firm-gray"} ${s.num === 4 && !createdOrder ? "cursor-not-allowed opacity-50" : ""}`} disabled={s.num === 4 && !createdOrder} whileHover={{ scale: step >= s.num ? 1.05 : 1 }} whileTap={{ scale: 0.95 }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step > s.num ? "bg-linear-to-r from-firm-orange to-firm-pink border-firm-orange text-main" : step === s.num ? "border-firm-orange text-firm-orange" : "border-gray-300 text-firm-gray"}`}>
                    {step > s.num ? <CheckIcon size={14} /> : s.num}
                  </div>
                  <span className="font-['Montserrat_Alternates'] text-sm hidden sm:inline">{s.title}</span></motion.button>
                {s.num < 4 && (<div className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 ${step > s.num ? "bg-linear-to-r from-firm-orange to-firm-pink" : "bg-gray-300"}`} />)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                  {cart.items.map((item, idx) => (
                    <motion.div key={item.product_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="bg-main rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all">
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <Link href={`/catalog/${item.product_id}`} className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 mx-auto sm:mx-0">
                          {item.main_image_url ? (
                            <img src={item.main_image_url} alt={item.title} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-firm-orange/20 to-firm-pink/20 rounded-xl flex items-center justify-center">
                              <CartIcon color="#D97C8E" size={28} />
                            </div>
                          )}
                        </Link>

                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row justify-between gap-2">
                            <div>
                              <Link href={`/catalog/${item.product_id}`}><h3 className="font-['Montserrat_Alternates'] font-semibold text-base sm:text-lg hover:text-firm-orange transition line-clamp-2">{item.title}</h3></Link>
                              <p className="text-xs sm:text-sm text-firm-gray mt-1">{item.master_name}</p>
                            </div>
                            <button onClick={() => removeItem(item.product_id)} disabled={updating === item.product_id} className="text-firm-gray hover:text-firm-red transition self-start sm:self-auto"><DeleteIcon className="w-5 h-5" color="#9CA3AF" /></button>
                          </div>

                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
                            <div className="flex items-center gap-3">
                              <motion.button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} disabled={updating === item.product_id || item.quantity <= 1} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-linear-to-r hover:from-firm-orange hover:to-firm-pink hover:text-main transition disabled:opacity-50 flex items-center justify-center" whileTap={{ scale: 0.9 }}>-</motion.button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <motion.button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} disabled={updating === item.product_id} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-linear-to-r hover:from-firm-orange hover:to-firm-pink hover:text-main transition disabled:opacity-50 flex items-center justify-center" whileTap={{ scale: 0.9 }} >+</motion.button>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="font-['Montserrat_Alternates'] font-bold text-lg sm:text-xl text-firm-orange">{(item.price * item.quantity).toLocaleString()} ₽</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <div className="mt-6">
                    <Link href="/catalog">
                      <motion.button className="text-firm-orange hover:underline font-['Montserrat_Alternates'] flex items-center gap-2" whileHover={{ x: -5 }}><ArrowLeftIcon size={18} />Продолжить покупки</motion.button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div  key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-main rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-6">Адрес доставки</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-text mb-1 font-medium">ФИО <span className="text-firm-red">*</span></label>
                      <input type="text" name="full_name" value={shippingAddress.full_name} onChange={handleShippingChange} className="w-full p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" placeholder="Иванов Иван Иванович" />
                    </div>

                    <div>
                      <label className="block text-text mb-1 font-medium">Телефон <span className="text-firm-red">*</span></label>
                      <input type="tel" name="phone" value={shippingAddress.phone} onChange={handleShippingChange} className="w-full p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all" placeholder="+7 (999) 123-45-67" />
                    </div>

                    <div>
                      <label className="block text-text mb-1 font-medium">Город <span className="text-firm-red">*</span></label>
                      <input type="text" name="city" value={shippingAddress.city} onChange={handleShippingChange} className="w-full p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" placeholder="Москва" />
                    </div>

                    <div>
                      <label className="block text-text mb-1 font-medium">Адрес <span className="text-firm-red">*</span></label>
                      <input type="text" name="address" value={shippingAddress.address}  onChange={handleShippingChange} className="w-full p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all" placeholder="ул. Примерная, д. 1, кв. 1"  />
                    </div>

                    <div>
                      <label className="block text-text mb-1 font-medium">Почтовый индекс</label>
                      <input type="text" name="postal_code" value={shippingAddress.postal_code} onChange={handleShippingChange} className="w-full p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" placeholder="123456" />
                    </div>

                    <div>
                      <label className="block text-text mb-1 font-medium">Комментарий к заказу</label>
                      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all" placeholder="Пожелания к доставке или особые отметки..." />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-main rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-6">одтверждение заказа</h2>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold mb-2">Товары в заказе:</h3>
                      <div className="space-y-2">
                        {cart.items.map((item) => (
                          <div key={item.product_id} className="flex justify-between text-sm">
                            <span>{item.title} × {item.quantity}</span>
                            <span className="font-medium">{(item.price * item.quantity).toLocaleString()} ₽</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold mb-2">Адрес доставки:</h3>
                      <p className="text-sm">{shippingAddress.full_name}</p>
                      <p className="text-sm">{shippingAddress.phone}</p>
                      <p className="text-sm">
                        {shippingAddress.city}, {shippingAddress.address}
                      </p>
                      {shippingAddress.postal_code && (
                        <p className="text-sm">Индекс: {shippingAddress.postal_code}</p>
                      )}
                    </div>

                    {comment && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold mb-2">Комментарий:</h3>
                        <p className="text-sm">{comment}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 4 && createdOrder && (
                <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-main rounded-2xl shadow-lg border border-gray-100 p-6" >
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-6">Оплата заказа №{createdOrder.order_number}</h2>
                  
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold mb-2">Детали заказа:</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-firm-gray">Сумма:</span> {Math.round(finalTotal).toLocaleString()} ₽</p>
                        <p><span className="text-firm-gray">Способ доставки:</span> {shippingCost === 0 ? "Бесплатная" : "Стандартная"}</p>
                        <p><span className="text-firm-gray">Адрес:</span> {shippingAddress.city}, {shippingAddress.address}</p>
                      </div>
                    </div>
                  </div>
                  
                  <PaymentGateway amount={finalTotal} orderId={createdOrder.id} onSuccess={handlePaymentSuccess} onCancel={() => setStep(3)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:w-96">
            <div className="bg-main rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-5">
              <h2 className="font-['Montserrat_Alternates'] font-bold text-xl mb-4 bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Итого</h2>

              <div className="space-y-3 pb-4 border-b border-gray-200">
                <div className="flex justify-between">
                  <span className="text-firm-gray">
                    Товары ({cart.totalCount} шт.):
                  </span>
                  <span className="font-medium text-text">{cart.totalAmount.toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-firm-gray">Доставка:</span>
                  <span className="font-medium text-text"> {step >= 2 ? shippingCost === 0 ? "Бесплатно" : `${shippingCost} ₽` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-firm-gray">Налог (7%):</span>
                  <span className="font-medium text-text">{Math.round(estimatedTax).toLocaleString()} ₽</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-firm-green">
                    <span>Скидка:</span>
                    <span>- {Math.round(discount).toLocaleString()} ₽</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pb-4 border-b border-gray-200">
                <div className="flex gap-2">
                  <input type="text" placeholder="Промокод" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="flex-1 p-2 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" />
                  <motion.button onClick={applyPromoCode} className="px-4 py-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition text-sm font-medium" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Применить</motion.button>
                </div>
              </div>

              <div className="flex justify-between mt-4 pb-4">
                <span className="font-['Montserrat_Alternates'] font-bold text-lg text-text">Итого к оплате:</span>
                <span className="font-['Montserrat_Alternates'] font-bold text-2xl text-firm-orange">{Math.round(finalTotal).toLocaleString()} ₽</span>
              </div>

              {step === 1 && (<motion.button onClick={() => setStep(2)} className="w-full py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition font-['Montserrat_Alternates'] font-semibold" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Продолжить оформление →</motion.button>)}

              {step === 2 && ( <motion.button onClick={() => setStep(3)} className="w-full py-3 bg-linar-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition font-['Montserrat_Alternates'] font-semibold" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Перейти к подтверждению →</motion.button>)}

              {step === 3 && (
                <motion.button onClick={handlePlaceOrder} disabled={orderLoading} className="w-full py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition font-['Montserrat_Alternates'] font-semibold disabled:opacity-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {orderLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Оформление...
                    </div>
                  ) : ("Подтвердить заказ")}
                </motion.button>
              )}

              <p className="text-xs text-firm-gray text-center mt-4">Нажимая кнопку, вы соглашаетесь с условиями оферты</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm}  onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
    </>
  );
}