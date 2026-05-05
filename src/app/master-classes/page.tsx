// src/app/master-classes/page.tsx
'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Session } from "next-auth"

interface MasterClass {
    id: string
    title: string
    description: string
    type: 'online' | 'offline'
    price: number
    max_participants: number
    current_participants: number
    date_time: string
    duration_minutes: number
    location: string
    online_link: string
    materials: string
    image_url: string
    master_id: string
    master_name: string
    master_avatar: string
    status: string
    is_registered?: boolean
    registrations?: Array<{
        id: string;
        user_id: string;
        status: string;
        created_at: string;
        user?: {
            name: string;
            email: string;
        };
    }>
}

export default function MasterClassesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [masterClasses, setMasterClasses] = useState<MasterClass[]>([])
    const [myRegisteredClasses, setMyRegisteredClasses] = useState<MasterClass[]>([])
    const [myCreatedClasses, setMyCreatedClasses] = useState<MasterClass[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'created'>('all')
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    // Форма для создания мастер-класса (только для мастеров)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'online',
        price: '',
        max_participants: '',
        date_time: '',
        duration_minutes: '',
        location: '',
        online_link: '',
        materials: '',
        image: null as File | null,
        imagePreview: ''
    })

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const isMaster = session?.user?.role === 'master'

    useEffect(() => {
        fetchMasterClasses()
        if (session?.user) {
            fetchMyRegisteredClasses()
            if (isMaster) {
                fetchMyCreatedClasses()
            }
        }
    }, [session])

    const fetchMasterClasses = async () => {
        try {
            const response = await fetch('/api/master-classes')
            const data = await response.json()
            setMasterClasses(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error fetching master classes:', error)
            setMasterClasses([])
        } finally {
            setLoading(false)
        }
    }

    const fetchMyRegisteredClasses = async () => {
        try {
            const response = await fetch('/api/master-classes/my')
            const data = await response.json()
            setMyRegisteredClasses(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error fetching my registered classes:', error)
            setMyRegisteredClasses([])
        }
    }

    const fetchMyCreatedClasses = async () => {
        try {
            const response = await fetch('/api/master/master-classes')
            const data = await response.json()
            if (data.classes && Array.isArray(data.classes)) {
                setMyCreatedClasses(data.classes)
            } else if (Array.isArray(data)) {
                setMyCreatedClasses(data)
            } else {
                setMyCreatedClasses([])
            }
        } catch (error) {
            console.error('Error fetching my created classes:', error)
            setMyCreatedClasses([])
        }
    }

    const handleRegister = async (classId: string) => {
        if (!session) {
            router.push(`/auth/signin?callbackUrl=/master-classes`)
            return
        }

        try {
            const response = await fetch(`/api/master-classes/${classId}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (response.ok) {
                alert('Вы успешно записались на мастер-класс!')
                fetchMasterClasses()
                fetchMyRegisteredClasses()
            } else {
                const error = await response.json()
                alert(error.error || 'Ошибка при записи')
            }
        } catch (error) {
            console.error('Error registering:', error)
            alert('Ошибка при записи на мастер-класс')
        }
    }

    const handleCancelRegistration = async (classId: string) => {
        if (!confirm('Отменить запись на мастер-класс?')) return

        try {
            const response = await fetch(`/api/master-classes/${classId}/cancel`, {
                method: 'DELETE'
            })

            if (response.ok) {
                alert('Запись отменена')
                fetchMasterClasses()
                fetchMyRegisteredClasses()
            } else {
                alert('Ошибка при отмене записи')
            }
        } catch (error) {
            console.error('Error canceling registration:', error)
            alert('Ошибка при отмене записи')
        }
    }

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isMaster) return

        setSaving(true)

        try {
            const form = new FormData()
            form.append('title', formData.title)
            form.append('description', formData.description)
            form.append('type', formData.type)
            form.append('price', formData.price)
            form.append('max_participants', formData.max_participants)
            form.append('date_time', formData.date_time)
            form.append('duration_minutes', formData.duration_minutes)
            form.append('location', formData.location)
            form.append('online_link', formData.online_link)
            form.append('materials', formData.materials)
            if (formData.image) {
                form.append('image', formData.image)
            }

            const response = await fetch('/api/master/master-classes', {
                method: 'POST',
                body: form
            })

            if (response.ok) {
                setShowCreateModal(false)
                resetForm()
                fetchMyCreatedClasses()
                alert('Мастер-класс создан и отправлен на модерацию')
            } else {
                const error = await response.json()
                alert(error.error || 'Ошибка при создании')
            }
        } catch (error) {
            console.error('Error creating master class:', error)
            alert('Ошибка при создании мастер-класса')
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            type: 'online',
            price: '',
            max_participants: '',
            date_time: '',
            duration_minutes: '',
            location: '',
            online_link: '',
            materials: '',
            image: null,
            imagePreview: ''
        })
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormData(prev => ({ ...prev, image: file, imagePreview: URL.createObjectURL(file) }))
        }
    }

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay()
        return day === 0 ? 6 : day - 1
    }

    const changeMonth = (delta: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1))
        setSelectedDate(null)
    }

    const getClassesForDate = (date: Date) => {
        if (!Array.isArray(masterClasses)) return []
        return masterClasses.filter(mc => {
            const mcDate = new Date(mc.date_time)
            return mcDate.toDateString() === date.toDateString()
        })
    }

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
    const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const calendarDays: (Date | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(year, month, i))
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">Черновик</span>
            case 'moderation':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">На модерации</span>
            case 'published':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Опубликован</span>
            case 'cancelled':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Отменен</span>
            case 'completed':
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Завершен</span>
            default:
                return null
        }
    }

    const tabVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <motion.div
                        className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.p 
                        className="mt-4 font-['Montserrat_Alternates'] text-gray-600"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Загрузка мастер-классов...
                    </motion.p>
                </div>
            </div>
        )
    }

    return (
        <motion.div 
            className="max-w-7xl mx-auto px-4 py-6 sm:py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Заголовок */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <motion.h1 
                    className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl lg:text-4xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent"
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    Мастер-классы
                </motion.h1>
                {isMaster && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
                    >
                        <span className="text-lg">+</span>
                        <span>Создать мастер-класс</span>
                    </motion.button>
                )}
            </div>

            {/* Вкладки */}
            <motion.div 
                className="flex gap-2 sm:gap-4 mb-6 border-b border-gray-200"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                {[
                    { id: 'all', label: 'Все мастер-классы', icon: '🎓' },
                    ...(session?.user ? [{ id: 'my', label: 'Мои записи', icon: '📝', count: myRegisteredClasses.length }] : []),
                    ...(isMaster ? [{ id: 'created', label: 'Мои мастер-классы', icon: '✍️', count: myCreatedClasses.length }] : [])
                ].map((tab) => (
                    <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'all' | 'my' | 'created')}
                        className={`pb-2 px-3 sm:px-4 font-medium transition-all duration-300 relative flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                            activeTab === tab.id 
                                ? 'text-firm-orange' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                            <motion.span 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-1 px-1.5 py-0.5 bg-firm-orange text-white text-xs rounded-full"
                            >
                                {tab.count}
                            </motion.span>
                        )}
                        {activeTab === tab.id && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink"
                                transition={{ duration: 0.3 }}
                            />
                        )}
                    </motion.button>
                ))}
            </motion.div>

            <AnimatePresence mode="wait">
                {activeTab === 'all' && (
                    <motion.div
                        key="all"
                        variants={tabVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="flex flex-col lg:flex-row gap-6"
                    >
                        {/* Календарь */}
                        <motion.div 
                            className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-2xl shadow-xl p-4 h-fit sticky top-24"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => changeMonth(-1)} 
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
                                >
                                    ←
                                </motion.button>
                                <h2 className="font-semibold text-base sm:text-lg">{monthNames[month]} {year}</h2>
                                <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => changeMonth(1)} 
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
                                >
                                    →
                                </motion.button>
                            </div>

                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center mb-2">
                                {weekDays.map(day => (
                                    <div key={day} className="text-xs sm:text-sm font-medium text-gray-500 py-1">
                                        {isMobile ? day.charAt(0) : day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                                {calendarDays.map((date, idx) => {
                                    const isToday = date && date.toDateString() === today.toDateString()
                                    const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString()
                                    const classesOnDate = date ? getClassesForDate(date) : []
                                    
                                    return (
                                        <motion.button
                                            key={idx}
                                            onClick={() => date && setSelectedDate(date)}
                                            className={`
                                                aspect-square p-0.5 sm:p-1 rounded-full text-xs sm:text-sm transition-all relative
                                                ${!date ? 'bg-gray-50' : 'hover:bg-gray-100 cursor-pointer'}
                                                ${isToday ? 'bg-firm-orange/20 font-bold ring-2 ring-firm-orange/50' : ''}
                                                ${isSelected ? 'ring-2 ring-firm-orange shadow-md' : ''}
                                            `}
                                            disabled={!date}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {date && (
                                                <>
                                                    <span className={classesOnDate.length > 0 ? 'text-firm-orange font-semibold' : ''}>
                                                        {date.getDate()}
                                                    </span>
                                                    {classesOnDate.length > 0 && (
                                                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-firm-orange rounded-full" />
                                                    )}
                                                </>
                                            )}
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </motion.div>

                        {/* Список мастер-классов */}
                        <div className="flex-1 space-y-4">
                            {selectedDate && (
                                <motion.div 
                                    className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl p-3"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <p className="text-gray-600 text-sm">
                                        📅 Мастер-классы на {selectedDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </p>
                                </motion.div>
                            )}

                            {(() => {
                                const classesToShow = selectedDate 
                                    ? getClassesForDate(selectedDate) 
                                    : (Array.isArray(masterClasses) ? masterClasses : [])
                                
                                if (classesToShow.length === 0) {
                                    return (
                                        <motion.div 
                                            className="text-center py-12 bg-gray-50 rounded-xl"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <div className="text-6xl mb-4">📭</div>
                                            <p className="text-gray-500">Нет доступных мастер-классов</p>
                                        </motion.div>
                                    )
                                }
                                
                                return classesToShow.map((mc, idx) => (
                                    <motion.div
                                        key={mc.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        whileHover={{ y: -4 }}
                                    >
                                        <MasterClassCard
                                            masterClass={mc}
                                            session={session}
                                            onRegister={handleRegister}
                                            onCancel={handleCancelRegistration}
                                        />
                                    </motion.div>
                                ))
                            })()}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'my' && (
                    <motion.div
                        key="my"
                        variants={tabVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        {!session ? (
                            <motion.div 
                                className="text-center py-12 bg-gray-50 rounded-xl"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="text-6xl mb-4">🔒</div>
                                <p className="text-gray-500 mb-4">Для просмотра ваших мастер-классов необходимо авторизоваться</p>
                                <Link href="/auth/signin" className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition">
                                    Войти
                                </Link>
                            </motion.div>
                        ) : myRegisteredClasses.length === 0 ? (
                            <motion.div 
                                className="text-center py-12 bg-gray-50 rounded-xl"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="text-6xl mb-4">📋</div>
                                <p className="text-gray-500 mb-4">Вы еще не записаны ни на один мастер-класс</p>
                                <motion.button 
                                    onClick={() => setActiveTab('all')} 
                                    className="text-firm-orange hover:underline"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    Посмотреть доступные →
                                </motion.button>
                            </motion.div>
                        ) : (
                            myRegisteredClasses.map((mc, idx) => (
                                <motion.div
                                    key={mc.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <MyRegisteredClassCard
                                        masterClass={mc}
                                        onCancel={handleCancelRegistration}
                                    />
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}

                {activeTab === 'created' && isMaster && (
                    <motion.div
                        key="created"
                        variants={tabVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        {myCreatedClasses.length === 0 ? (
                            <motion.div 
                                className="text-center py-12 bg-gray-50 rounded-xl"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="text-6xl mb-4">🎨</div>
                                <p className="text-gray-500 mb-4">У вас нет созданных мастер-классов</p>
                                <motion.button 
                                    onClick={() => setShowCreateModal(true)} 
                                    className="text-firm-orange hover:underline"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    Создать первый мастер-класс →
                                </motion.button>
                            </motion.div>
                        ) : (
                            myCreatedClasses.map((mc, idx) => (
                                <motion.div
                                    key={mc.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <MyCreatedClassCard
                                        masterClass={mc}
                                        getStatusBadge={getStatusBadge}
                                        onEdit={() => {}}
                                        onDelete={() => {}}
                                        onCancel={() => {}}
                                        onViewParticipants={() => {}}
                                    />
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Модальное окно создания мастер-класса */}
            <AnimatePresence>
                {showCreateModal && isMaster && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                    Создать мастер-класс
                                </h2>
                                <motion.button 
                                    onClick={() => setShowCreateModal(false)} 
                                    className="text-gray-400 hover:text-gray-600 text-2xl transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    ✕
                                </motion.button>
                            </div>

                            <form onSubmit={handleCreateClass} className="p-6 space-y-6">
                                {/* Загрузка фото */}
                                <div>
                                    <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">
                                        📷 Анонсирующее изображение
                                    </label>
                                    <motion.div 
                                        whileHover={{ borderColor: "#D97C8E" }}
                                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-firm-pink transition cursor-pointer bg-gray-50"
                                        onClick={() => document.getElementById('class-image-input')?.click()}
                                    >
                                        <input
                                            id="class-image-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-gray-500">Нажмите для выбора файлов</span>
                                            <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
                                        </div>
                                    </motion.div>
                                    
                                    {formData.imagePreview && (
                                        <motion.div 
                                            className="mt-4"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                                                <img src={formData.imagePreview} alt="preview" className="w-full h-full object-cover" />
                                                <motion.button 
                                                    type="button" 
                                                    onClick={() => {setFormData(prev => ({ ...prev, image: null, imagePreview: '' }))}}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition"
                                                >
                                                    ✕
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Название */}
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        Название <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                                        placeholder="Например: Вязание свитера с косами для начинающих"
                                    />
                                </div>

                                {/* Описание */}
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        Описание <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={4}
                                        required
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                                        placeholder="Опишите, что будет на мастер-классе, какие навыки получат участники..."
                                    />
                                </div>

                                {/* Тип */}
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        Формат проведения
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="online"
                                                checked={formData.type === 'online'}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 accent-firm-orange"
                                            />
                                            <span>🖥️ Онлайн</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="offline"
                                                checked={formData.type === 'offline'}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 accent-firm-pink"
                                            />
                                            <span>📍 Офлайн</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Цена */}
                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        Стоимость (₽)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="100"
                                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition pr-16"
                                            placeholder="Бесплатно"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                            Максимум участников
                                        </label>
                                        <input
                                            type="number"
                                            name="max_participants"
                                            value={formData.max_participants}
                                            onChange={handleInputChange}
                                            min="1"
                                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                                            placeholder="10"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                            Длительность (мин)
                                        </label>
                                        <input
                                            type="number"
                                            name="duration_minutes"
                                            value={formData.duration_minutes}
                                            onChange={handleInputChange}
                                            min="30"
                                            step="30"
                                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                                            placeholder="120"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        Дата и время <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="date_time"
                                        value={formData.date_time}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                                    />
                                </div>

                                {formData.type === 'offline' && (
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                            📍 Место проведения
                                        </label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                                            placeholder="Адрес, студия..."
                                        />
                                    </div>
                                )}

                                {formData.type === 'online' && (
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                            🔗 Ссылка на трансляцию
                                        </label>
                                        <input
                                            type="url"
                                            name="online_link"
                                            value={formData.online_link}
                                            onChange={handleInputChange}
                                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                                            placeholder="https://zoom.us/..."
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                        📋 Необходимые материалы
                                    </label>
                                    <textarea
                                        name="materials"
                                        value={formData.materials}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                                        placeholder="Список материалов, которые понадобятся участникам..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t">
                                    <motion.button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {saving ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Создание...</span>
                                            </div>
                                        ) : (
                                            '✨ Создать мастер-класс'
                                        )}
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Отмена
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// Компонент карточки мастер-класса (остается без изменений, но с добавлением анимаций)
function MasterClassCard({ 
        masterClass, 
        session, 
        onRegister, 
        onCancel 
    }: { 
        masterClass: MasterClass;
        session: Session | null;
        onRegister: (id: string) => Promise<void>;
        onCancel: (id: string) => Promise<void>;
    }) {
    const isPast = new Date(masterClass.date_time) < new Date()
    const isFull = masterClass.current_participants >= masterClass.max_participants
    const isRegistered = masterClass.is_registered

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {masterClass.image_url && (
                    <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 relative">
                        <Image 
                            src={masterClass.image_url} 
                            alt={masterClass.title} 
                            width={160} 
                            height={160} 
                            className="w-full h-full object-cover"
                        />
                        {masterClass.type === 'online' && (
                            <span className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                                🖥️ Онлайн
                            </span>
                        )}
                        {masterClass.type === 'offline' && (
                            <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                                📍 Офлайн
                            </span>
                        )}
                    </div>
                )}
                <div className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="flex-1">
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg sm:text-xl line-clamp-1">
                                {masterClass.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <span>👤</span> {masterClass.master_name}
                                </span>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-xl sm:text-2xl font-bold text-firm-orange">
                                {masterClass.price.toLocaleString()} ₽
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">
                                мест: {masterClass.current_participants}/{masterClass.max_participants}
                            </div>
                        </div>
                    </div>

                    <p className="text-gray-600 mt-2 text-sm line-clamp-2">{masterClass.description}</p>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">📅 {formatDate(masterClass.date_time)}</div>
                        <div className="flex items-center gap-1">⏰ {formatTime(masterClass.date_time)}</div>
                        <div className="flex items-center gap-1">⏱️ {masterClass.duration_minutes} мин</div>
                        {masterClass.type === 'offline' && masterClass.location && (
                            <div className="flex items-center gap-1">📍 {masterClass.location}</div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-end">
                        {isPast ? (
                            <span className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-lg text-sm">✅ Завершен</span>
                        ) : isFull ? (
                            <span className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-lg text-sm">❌ Мест нет</span>
                        ) : isRegistered ? (
                            <div className="flex gap-2">
                                {masterClass.type === 'online' && masterClass.online_link && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => window.open(masterClass.online_link, '_blank')}
                                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                                    >
                                        🚀 Запустить
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onCancel(masterClass.id)}
                                    className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-500 hover:text-white transition"
                                >
                                    Отменить
                                </motion.button>
                            </div>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onRegister(masterClass.id)}
                                className="px-4 py-1.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-sm hover:shadow-lg transition"
                            >
                                📝 Записаться
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// Компонент карточки моих записей
function MyRegisteredClassCard({ 
        masterClass, 
        onCancel 
    }: { 
        masterClass: MasterClass;
        onCancel: (id: string) => Promise<void>;
    }) {
    const isPast = new Date(masterClass.date_time) < new Date()

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {masterClass.image_url && (
                    <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 relative">
                        <Image 
                            src={masterClass.image_url} 
                            alt={masterClass.title} 
                            width={160} 
                            height={160} 
                            className="w-full h-full object-cover"
                        />
                        {masterClass.type === 'online' && (
                            <span className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                                🖥️ Онлайн
                            </span>
                        )}
                    </div>
                )}
                <div className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg sm:text-xl line-clamp-1">
                                {masterClass.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500">👤 {masterClass.master_name}</span>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-xl font-bold text-firm-orange">{masterClass.price.toLocaleString()} ₽</div>
                            <div className="text-sm text-gray-500">мест: {masterClass.current_participants}/{masterClass.max_participants}</div>
                        </div>
                    </div>

                    <p className="text-gray-600 mt-2 text-sm line-clamp-2">{masterClass.description}</p>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">📅 {formatDate(masterClass.date_time)}</div>
                        <div className="flex items-center gap-1">⏰ {formatTime(masterClass.date_time)}</div>
                        <div className="flex items-center gap-1">⏱️ {masterClass.duration_minutes} мин</div>
                        {masterClass.type === 'offline' && masterClass.location && (
                            <div className="flex items-center gap-1">📍 {masterClass.location}</div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-end">
                        <div className="flex gap-2">
                            {masterClass.type === 'online' && masterClass.online_link && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => window.open(masterClass.online_link, '_blank')}
                                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                                >
                                    🚀 Запустить
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onCancel(masterClass.id)}
                                className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-500 hover:text-white transition"
                            >
                                Отменить
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

// Компонент карточки созданных мастер-классов
function MyCreatedClassCard({ 
    masterClass, 
    getStatusBadge, 
    onEdit, 
    onDelete, 
    onCancel, 
    onViewParticipants, 
    isPast = false 
}: { 
    masterClass: MasterClass;
    getStatusBadge: (status: string) => React.ReactNode;
    onEdit: (masterClass: MasterClass) => void;
    onDelete: (id: string) => void;
    onCancel: (id: string) => void;
    onViewParticipants: (masterClass: MasterClass) => void;
    isPast?: boolean;
}) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {masterClass.image_url && (
                    <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0">
                        <Image 
                            src={masterClass.image_url} 
                            alt={masterClass.title} 
                            width={160} 
                            height={160} 
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <div className="flex-1 p-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg sm:text-xl line-clamp-1">
                                {masterClass.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${masterClass.type === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {masterClass.type === 'online' ? '🖥️ Онлайн' : '📍 Офлайн'}
                                </span>
                                {getStatusBadge(masterClass.status)}
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-xl font-bold text-firm-orange">{masterClass.price.toLocaleString()} ₽</div>
                            <div className="text-sm text-gray-500">
                                👥 {masterClass.current_participants}/{masterClass.max_participants}
                            </div>
                        </div>
                    </div>

                    <p className="text-gray-600 mt-2 text-sm line-clamp-2">{masterClass.description}</p>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">📅 {formatDate(masterClass.date_time)}</div>
                        <div className="flex items-center gap-1">⏰ {formatTime(masterClass.date_time)}</div>
                        <div className="flex items-center gap-1">⏱️ {masterClass.duration_minutes} мин</div>
                        {masterClass.type === 'offline' && masterClass.location && (
                            <div className="flex items-center gap-1">📍 {masterClass.location}</div>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onViewParticipants(masterClass)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
                        >
                            👥 Участники ({masterClass.registrations?.length || 0})
                        </motion.button>
                        {!isPast && masterClass.status === 'published' && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onCancel(masterClass.id)}
                                className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-500 hover:text-white transition"
                            >
                                Отменить
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onEdit(masterClass)} 
                            className="px-3 py-1.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-sm hover:shadow-lg transition"
                        >
                            ✏️ Редактировать
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}