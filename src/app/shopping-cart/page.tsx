'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface CartItem {
    product_id: string
    title: string
    price: number
    quantity: number
    main_image_url: string
    master_name: string
}

interface CartData {
    items: CartItem[]
    totalCount: number
    totalAmount: number
}

interface ShippingAddress {
    full_name: string
    phone: string
    city: string
    address: string
    postal_code: string
}

export default function ShoppingCartPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [cart, setCart] = useState<CartData>({ items: [], totalCount: 0, totalAmount: 0 })
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)
    const [promoCode, setPromoCode] = useState('')
    const [discount, setDiscount] = useState(0)
    const [step, setStep] = useState(1)
    const [orderLoading, setOrderLoading] = useState(false)
    
    const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
        full_name: '',
        phone: '',
        city: '',
        address: '',
        postal_code: ''
    })
    const [comment, setComment] = useState('')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/shopping-cart')
            return
        }
        if (status === 'authenticated') {
            fetchCart()
        }
    }, [status, router])

    useEffect(() => {
        // Загружаем профиль пользователя для автозаполнения
        if (session?.user && step === 2) {
            fetchUserProfile()
        }
    }, [session, step])

    const fetchCart = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/cart')
            const data = await response.json()
            setCart({
                items: data.items || [],
                totalCount: data.totalCount || 0,
                totalAmount: data.totalAmount || 0
            })
        } catch (error) {
            console.error('Error fetching cart:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchUserProfile = async () => {
        try {
            const response = await fetch('/api/user/profile')
            if (response.ok) {
                const data = await response.json()
                const profile = data.profile || data
                setShippingAddress(prev => ({
                    ...prev,
                    full_name: profile.full_name || session?.user?.name || '',
                    phone: profile.phone || '',
                    city: profile.city || '',
                    address: profile.address || ''
                }))
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    const updateQuantity = async (productId: string, newQuantity: number) => {
        if (newQuantity < 1) return
        
        setUpdating(productId)
        try {
            const response = await fetch('/api/cart', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: newQuantity })
            })
            
            if (response.ok) {
                await fetchCart()
            }
        } catch (error) {
            console.error('Error updating quantity:', error)
        } finally {
            setUpdating(null)
        }
    }

    const removeItem = async (productId: string) => {
        if (!confirm('Удалить товар из корзины?')) return
        
        setUpdating(productId)
        try {
            const response = await fetch(`/api/cart?productId=${productId}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                await fetchCart()
            }
        } catch (error) {
            console.error('Error removing item:', error)
        } finally {
            setUpdating(null)
        }
    }

    const applyPromoCode = () => {
        if (promoCode === 'WELCOME10') {
            setDiscount(cart.totalAmount * 0.1)
            alert('Промокод применен! Скидка 10%')
        } else if (promoCode === 'FREESHIP') {
            alert('Промокод применен! Бесплатная доставка')
        } else {
            alert('Неверный промокод')
        }
    }

    const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setShippingAddress(prev => ({ ...prev, [name]: value }))
    }

    const handlePlaceOrder = async () => {
        // Валидация
        if (!shippingAddress.full_name) {
            alert('Укажите ФИО')
            return
        }
        if (!shippingAddress.phone) {
            alert('Укажите телефон')
            return
        }
        if (!shippingAddress.city) {
            alert('Укажите город')
            return
        }
        if (!shippingAddress.address) {
            alert('Укажите адрес доставки')
            return
        }

        setOrderLoading(true)
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shippingAddress,
                    promoCode: discount > 0 ? promoCode : undefined,
                    discount,
                    comment
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка оформления заказа')
            }

            alert(`Заказ №${data.order.order_number} успешно оформлен!`)
            router.push('/profile?tab=orders')
        } catch (error) {
            console.error('Error placing order:', error)
            alert(error instanceof Error ? error.message : 'Ошибка оформления заказа')
        } finally {
            setOrderLoading(false)
        }
    }

    const estimatedTax = cart.totalAmount * 0.07
    const shippingCost = step >= 2 ? (cart.totalAmount > 5000 ? 0 : 350) : 0
    const totalWithDiscount = cart.totalAmount - discount
    const finalTotal = totalWithDiscount + estimatedTax + shippingCost

    if (loading) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка корзины...</p>
                </div>
            </div>
        )
    }

    if (cart.items.length === 0 && step === 1) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center bg-white rounded-lg shadow-md p-12 max-w-md">
                    <div className="text-6xl mb-4">🛒</div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-2">Корзина пуста</h1>
                    <p className="text-gray-500 mb-6">Добавьте товары, чтобы оформить заказ</p>
                    <Link href="/catalog">
                        <button className="px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition">
                            Перейти в каталог
                        </button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
                <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl mb-6">Оформление заказа</h1>
                
                {/* Шаги */}
                <div className="flex items-center justify-center gap-4">
                    {[
                        { num: 1, title: 'Корзина' },
                        { num: 2, title: 'Доставка' },
                        { num: 3, title: 'Подтверждение' }
                    ].map((s) => (
                        <div key={s.num} className="flex items-center">
                            <button
                                onClick={() => setStep(s.num)}
                                disabled={s.num === 1 && cart.items.length === 0}
                                className={`flex items-center gap-2 ${
                                    step >= s.num ? 'text-firm-orange' : 'text-gray-400'
                                } ${s.num === 1 && cart.items.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                    step > s.num
                                        ? 'bg-firm-orange border-firm-orange text-white'
                                        : step === s.num
                                        ? 'border-firm-orange text-firm-orange'
                                        : 'border-gray-300 text-gray-400'
                                }`}>
                                    {step > s.num ? '✓' : s.num}
                                </div>
                                <span className="font-['Montserrat_Alternates'] text-sm hidden sm:inline">
                                    {s.title}
                                </span>
                            </button>
                            {s.num < 3 && (
                                <div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-firm-orange' : 'bg-gray-300'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Левая колонка - содержимое шага */}
                <div className="flex-1">
                    {/* Шаг 1: Корзина */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {cart.items.map((item) => (
                                <div key={item.product_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex gap-6">
                                        <Link href={`/catalog/${item.product_id}`} className="w-24 h-24 flex-shrink-0">
                                            {item.main_image_url ? (
                                                <img
                                                    src={item.main_image_url}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-[#EAEAEA] rounded-lg flex items-center justify-center text-2xl">
                                                    🧶
                                                </div>
                                            )}
                                        </Link>

                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <div>
                                                    <Link href={`/catalog/${item.product_id}`}>
                                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg hover:text-firm-orange transition">
                                                            {item.title}
                                                        </h3>
                                                    </Link>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {item.master_name}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.product_id)}
                                                    disabled={updating === item.product_id}
                                                    className="text-gray-400 hover:text-red-500 transition"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            
                                            <div className="flex justify-between items-center mt-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                        disabled={updating === item.product_id || item.quantity <= 1}
                                                        className="w-8 h-8 rounded-full bg-[#EAEAEA] hover:bg-firm-orange hover:text-white transition disabled:opacity-50"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                        disabled={updating === item.product_id}
                                                        className="w-8 h-8 rounded-full bg-[#EAEAEA] hover:bg-firm-orange hover:text-white transition disabled:opacity-50"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-['Montserrat_Alternates'] font-bold text-xl text-firm-orange">
                                                        {(item.price * item.quantity).toLocaleString()} ₽
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="mt-6">
                                <Link href="/catalog">
                                    <button className="text-firm-orange hover:underline font-['Montserrat_Alternates'] flex items-center gap-2">
                                        ← Продолжить покупки
                                    </button>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Шаг 2: Доставка */}
                    {step === 2 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-6">
                                Адрес доставки
                            </h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 mb-1 font-medium">
                                        ФИО <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={shippingAddress.full_name}
                                        onChange={handleShippingChange}
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
                                        placeholder="Иванов Иван Иванович"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-medium">
                                        Телефон <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={shippingAddress.phone}
                                        onChange={handleShippingChange}
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
                                        placeholder="+7 (999) 123-45-67"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-medium">
                                        Город <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={shippingAddress.city}
                                        onChange={handleShippingChange}
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
                                        placeholder="Москва"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-medium">
                                        Адрес <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={shippingAddress.address}
                                        onChange={handleShippingChange}
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
                                        placeholder="ул. Примерная, д. 1, кв. 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-medium">
                                        Почтовый индекс
                                    </label>
                                    <input
                                        type="text"
                                        name="postal_code"
                                        value={shippingAddress.postal_code}
                                        onChange={handleShippingChange}
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
                                        placeholder="123456"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-medium">
                                        Комментарий к заказу
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows={3}
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
                                        placeholder="Пожелания к доставке или особые отметки..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Шаг 3: Подтверждение */}
                    {step === 3 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-6">
                                Подтверждение заказа
                            </h2>
                            
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
                                    <p className="text-sm">{shippingAddress.city}, {shippingAddress.address}</p>
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
                        </div>
                    )}
                </div>

                {/* Правая колонка - итоги */}
                <div className="lg:w-96">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-5">
                        <h2 className="font-['Montserrat_Alternates'] font-bold text-xl mb-4">Итого</h2>
                        
                        <div className="space-y-3 pb-4 border-b border-gray-200">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Товары ({cart.totalCount} шт.):</span>
                                <span className="font-medium">{cart.totalAmount.toLocaleString()} ₽</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Доставка:</span>
                                <span className="font-medium">
                                    {step >= 2 ? (shippingCost === 0 ? 'Бесплатно' : `${shippingCost} ₽`) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Налог (7%):</span>
                                <span className="font-medium">{Math.round(estimatedTax).toLocaleString()} ₽</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Скидка:</span>
                                    <span>- {Math.round(discount).toLocaleString()} ₽</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pb-4 border-b border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Промокод"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                    className="flex-1 p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange text-sm"
                                />
                                <button
                                    onClick={applyPromoCode}
                                    className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition text-sm"
                                >
                                    Применить
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between mt-4 pb-4">
                            <span className="font-['Montserrat_Alternates'] font-bold text-lg">Итого к оплате:</span>
                            <span className="font-['Montserrat_Alternates'] font-bold text-2xl text-firm-orange">
                                {Math.round(finalTotal).toLocaleString()} ₽
                            </span>
                        </div>

                        {step === 1 && (
                            <button
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition font-['Montserrat_Alternates'] font-semibold"
                            >
                                Продолжить оформление →
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                onClick={() => setStep(3)}
                                className="w-full py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition font-['Montserrat_Alternates'] font-semibold"
                            >
                                Перейти к подтверждению →
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={handlePlaceOrder}
                                disabled={orderLoading}
                                className="w-full py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg hover:shadow-lg transition font-['Montserrat_Alternates'] font-semibold disabled:opacity-50"
                            >
                                {orderLoading ? '⏳ Оформление...' : '✅ Подтвердить заказ'}
                            </button>
                        )}

                        <p className="text-xs text-gray-400 text-center mt-4">
                            Нажимая кнопку, вы соглашаетесь с условиями оферты
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}