'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import MasterClassCard from "@/components/master-classes/MasterClassCard"
import MyRegisteredClassCard from "@/components/master-classes/MyRegisteredClassCard"
import MyCreatedClassCard from "@/components/master-classes/MyCreatedClassCard"
import type { MasterClass } from "@/types/master-class"
import AddClassModal from "@/components/modals/AddClassModal"
import EditClassModal from "@/components/modals/EditClassModal"
import ConfirmModal from "@/components/ui/ConfirmModal"

export default function MasterClassesPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [masterClasses, setMasterClasses] = useState<MasterClass[]>([])
    const [myRegisteredClasses, setMyRegisteredClasses] = useState<MasterClass[]>([])
    const [myCreatedClasses, setMyCreatedClasses] = useState<MasterClass[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'created'>('all')
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingClass, setEditingClass] = useState<MasterClass | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    
    // Состояние для модального окна подтверждения
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'danger'
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
    }, [session, isMaster])

    const fetchMasterClasses = async () => {
        try {
            const response = await fetch('/api/master-classes')
            const data = await response.json()
            setMasterClasses(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error fetching master classes:', error)
            setMasterClasses([])
            toast.error('Ошибка загрузки мастер-классов')
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
                toast.success('Вы успешно записались на мастер-класс!')
                fetchMasterClasses()
                fetchMyRegisteredClasses()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Ошибка при записи')
            }
        } catch (error) {
            console.error('Error registering:', error)
            toast.error('Ошибка при записи на мастер-класс')
        }
    }

    const handleCancelRegistration = async (classId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Отмена записи',
            message: 'Вы уверены, что хотите отменить запись на мастер-класс?',
            type: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                try {
                    const response = await fetch(`/api/master-classes/${classId}/cancel`, {
                        method: 'DELETE'
                    })

                    if (response.ok) {
                        toast.success('Запись отменена')
                        fetchMasterClasses()
                        fetchMyRegisteredClasses()
                    } else {
                        const error = await response.json()
                        toast.error(error.error || 'Ошибка при отмене записи')
                    }
                } catch (error) {
                    console.error('Error canceling registration:', error)
                    toast.error('Ошибка при отмене записи')
                }
            }
        })
    }

    const handleEditClass = (masterClass: MasterClass) => {
        setEditingClass(masterClass)
        setShowEditModal(true)
    }

    const handleDeleteClass = async (classId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Удаление мастер-класса',
            message: 'Вы уверены, что хотите удалить мастер-класс? Это действие нельзя отменить.',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                try {
                    const response = await fetch(`/api/master/master-classes/${classId}`, {
                        method: 'DELETE'
                    })

                    if (response.ok) {
                        toast.success('Мастер-класс удален')
                        fetchMyCreatedClasses()
                    } else {
                        const error = await response.json()
                        toast.error(error.error || 'Ошибка при удалении')
                    }
                } catch (error) {
                    console.error('Error deleting class:', error)
                    toast.error('Ошибка при удалении мастер-класса')
                }
            }
        })
    }

    const handleCancelClass = async (classId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Отмена мастер-класса',
            message: 'Вы уверены, что хотите отменить мастер-класс? Участники получат уведомление.',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                try {
                    const response = await fetch(`/api/master/master-classes/${classId}/cancel`, {
                        method: 'POST'
                    })

                    if (response.ok) {
                        toast.success('Мастер-класс отменен')
                        fetchMyCreatedClasses()
                    } else {
                        const error = await response.json()
                        toast.error(error.error || 'Ошибка при отмене')
                    }
                } catch (error) {
                    console.error('Error canceling class:', error)
                    toast.error('Ошибка при отмене мастер-класса')
                }
            }
        })
    }

    const handleViewParticipants = (masterClass: MasterClass) => {
        // TODO: показать модальное окно с участниками
        console.log('View participants:', masterClass)
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

    const tabVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
                        Загрузка мастер-классов...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
                {/* Заголовок */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl lg:text-4xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Мастер-классы
                    </h1>
                    {isMaster && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
                        >
                            <span className="text-lg">+</span>
                            <span>Создать мастер-класс</span>
                        </button>
                    )}
                </div>

                {/* Вкладки */}
                <div className="flex gap-2 sm:gap-4 mb-6 border-b border-gray-200">
                    {[
                        { id: 'all', label: 'Все мастер-классы', icon: '🎓' },
                        ...(session?.user ? [{ id: 'my', label: 'Мои записи', icon: '📝', count: myRegisteredClasses.length }] : []),
                        ...(isMaster ? [{ id: 'created', label: 'Мои мастер-классы', icon: '✍️', count: myCreatedClasses.length }] : [])
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'all' | 'my' | 'created')}
                            className={`pb-2 px-3 sm:px-4 font-medium transition-all duration-300 relative flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                                activeTab === tab.id 
                                    ? 'text-firm-orange' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-firm-orange text-white text-xs rounded-full">
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink" />
                            )}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Вкладка "Все мастер-классы" */}
                    {activeTab === 'all' && (
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Календарь */}
                            <div className="w-full lg:w-1/3 xl:w-1/4 bg-white rounded-2xl shadow-xl p-4 h-fit sticky top-24">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition">←</button>
                                    <h2 className="font-semibold text-base sm:text-lg">{monthNames[month]} {year}</h2>
                                    <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition">→</button>
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
                                            <button
                                                key={idx}
                                                onClick={() => date && setSelectedDate(date)}
                                                className={`
                                                    aspect-square p-0.5 sm:p-1 rounded-full text-xs sm:text-sm transition-all relative
                                                    ${!date ? 'bg-gray-50' : 'hover:bg-gray-100 cursor-pointer'}
                                                    ${isToday ? 'bg-firm-orange/20 font-bold ring-2 ring-firm-orange/50' : ''}
                                                    ${isSelected ? 'ring-2 ring-firm-orange shadow-md' : ''}
                                                `}
                                                disabled={!date}
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
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Список мастер-классов */}
                            <div className="flex-1 space-y-4">
                                {selectedDate && (
                                    <div className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl p-3">
                                        <p className="text-gray-600 text-sm">
                                            📅 Мастер-классы на {selectedDate.toLocaleDateString('ru-RU')}
                                        </p>
                                    </div>
                                )}

                                {(() => {
                                    const classesToShow = selectedDate ? getClassesForDate(selectedDate) : masterClasses
                                    
                                    if (classesToShow.length === 0) {
                                        return (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl">
                                                <div className="text-6xl mb-4">📭</div>
                                                <p className="text-gray-500">Нет доступных мастер-классов</p>
                                            </div>
                                        )
                                    }
                                    
                                    return classesToShow.map((mc) => (
                                        <MasterClassCard
                                            key={mc.id}
                                            masterClass={mc}
                                            session={session}
                                            onRegister={handleRegister}
                                            onCancel={handleCancelRegistration}
                                        />
                                    ))
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Вкладка "Мои записи" */}
                    {activeTab === 'my' && (
                        <div className="space-y-4">
                            {!session ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl">
                                    <div className="text-6xl mb-4">🔒</div>
                                    <p className="text-gray-500 mb-4">Для просмотра ваших мастер-классов необходимо авторизоваться</p>
                                    <Link href="/auth/signin" className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition">
                                        Войти
                                    </Link>
                                </div>
                            ) : myRegisteredClasses.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl">
                                    <div className="text-6xl mb-4">📋</div>
                                    <p className="text-gray-500 mb-4">Вы еще не записаны ни на один мастер-класс</p>
                                    <button onClick={() => setActiveTab('all')} className="text-firm-orange hover:underline">
                                        Посмотреть доступные →
                                    </button>
                                </div>
                            ) : (
                                myRegisteredClasses.map((mc) => (
                                    <MyRegisteredClassCard
                                        key={mc.id}
                                        masterClass={mc}
                                        onCancel={handleCancelRegistration}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {/* Вкладка "Мои мастер-классы" */}
                    {activeTab === 'created' && isMaster && (
                        <div className="space-y-4">
                            {myCreatedClasses.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl">
                                    <div className="text-6xl mb-4">🎨</div>
                                    <p className="text-gray-500 mb-4">У вас нет созданных мастер-классов</p>
                                    <button onClick={() => setShowCreateModal(true)} className="text-firm-orange hover:underline">
                                        Создать первый мастер-класс →
                                    </button>
                                </div>
                            ) : (
                                myCreatedClasses.map((mc) => (
                                    <MyCreatedClassCard
                                        key={mc.id}
                                        masterClass={mc}
                                        getStatusBadge={getStatusBadge}
                                        onEdit={handleEditClass}
                                        onDelete={handleDeleteClass}
                                        onCancel={handleCancelClass}
                                        onViewParticipants={handleViewParticipants}
                                        isPast={new Date(mc.date_time) < new Date()}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </AnimatePresence>

                {/* Модальные окна */}
                <AddClassModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        fetchMyCreatedClasses()
                        setShowCreateModal(false)
                    }}
                />

                {editingClass && (
                    <EditClassModal
                        isOpen={showEditModal}
                        onClose={() => {
                            setShowEditModal(false)
                            setEditingClass(null)
                        }}
                        onSuccess={() => {
                            fetchMyCreatedClasses()
                            setShowEditModal(false)
                            setEditingClass(null)
                        }}
                        masterClass={editingClass}
                    />
                )}
            </div>

            {/* Кастомное модальное окно подтверждения */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    )
}