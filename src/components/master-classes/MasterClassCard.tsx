'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Session } from 'next-auth'
import { MasterClass } from '@/types/master-class'
import { CalendarIcon } from '@/components/icons/CalendarIcon'
import { LocateIcon } from '@/components/icons/LocateIcon'

// Дополнительные иконки
const ClockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6V12L16 14M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#737682" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const DurationIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8V12L15 15M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#737682" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const OnlineIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" stroke="#737682" strokeWidth="1.5"/>
        <path d="M12 8V12L14 14" stroke="#737682" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const UserIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="#737682" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#737682" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const RegisterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4V20M4 12H20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const CancelIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const LaunchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 10L21 7M21 7L18 4M21 7H15C12.8 7 11 8.8 11 11V20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3 11L7 10L6 14L3 11Z" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const getProxiedAvatarUrl = (url: string | null): string | null => {
    if (!url) return null
    if (url.includes('/api/proxy/avatar') || url.includes('selstorage.ru')) {
        return url
    }
    return `/api/proxy/avatar?url=${encodeURIComponent(url)}`
}

interface MasterClassCardProps {
    masterClass: MasterClass
    session: Session | null
    onRegister: (id: string) => Promise<void>
    onCancel: (id: string) => Promise<void>
}

export default function MasterClassCard({ 
    masterClass, 
    session, 
    onRegister, 
    onCancel 
}: MasterClassCardProps) {
    const [imageError, setImageError] = useState(false)
    const [avatarError, setAvatarError] = useState(false)

    // Используем только существующие поля из интерфейса MasterClass
    const masterName = masterClass.master_name || 'Мастер'
    const masterAvatar = masterClass.master_avatar ? getProxiedAvatarUrl(masterClass.master_avatar) : null
    const masterInitials = masterName.charAt(0).toUpperCase()

    const isClassCompleted = (): boolean => {
        const startTime = new Date(masterClass.date_time);
        const endTime = new Date(startTime.getTime() + masterClass.duration_minutes * 60000);
        return new Date() >= endTime;
    }

    const isClassStarted = (): boolean => {
        const startTime = new Date(masterClass.date_time);
        return new Date() >= startTime;
    }

    const isPast = isClassCompleted()
    const isStarted = isClassStarted()
    const isFull = masterClass.current_participants >= masterClass.max_participants
    const isRegistered = masterClass.is_registered || false
    const canRegister = masterClass.can_register !== undefined ? masterClass.can_register : true

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    }

    console.log('MasterClass data:', {
        id: masterClass.id,
        title: masterClass.title,
        master_name: masterClass.master_name,
        master_avatar: masterClass.master_avatar,
        is_registered: masterClass.is_registered,
        rawData: masterClass
    })

    return (
        <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {/* Изображение */}
                {masterClass.image_url && !imageError ? (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 relative bg-gray-100">
                        <img 
                            src={masterClass.image_url} 
                            alt={masterClass.title} 
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                        <span className={`absolute top-2 left-2 px-2 py-1 text-white text-xs rounded-full flex items-center gap-1 z-10 ${masterClass.type === 'online' ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {masterClass.type === 'online' ? '🖥️ Онлайн' : '📍 Офлайн'}
                        </span>
                    </div>
                ) : (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-gradient-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-1">
                                {masterClass.type === 'online' ? '🖥️' : '📍'}
                            </div>
                            <span className="text-xs text-gray-500">
                                {masterClass.type === 'online' ? 'Онлайн' : 'Офлайн'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Информация */}
                <div className="flex-1 p-4">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg sm:text-xl line-clamp-1">
                                {masterClass.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                {/* Аватарка мастера */}
                                {masterAvatar && !avatarError ? (
                                    <img
                                        src={masterAvatar}
                                        alt={masterName}
                                        className="w-6 h-6 rounded-full object-cover"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs font-bold">
                                        {masterInitials}
                                    </div>
                                )}
                                <span className="text-sm text-gray-600 font-medium">{masterName}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl sm:text-2xl font-bold text-firm-orange">
                                {masterClass.price.toLocaleString()} ₽
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 justify-end">
                                <UserIcon />
                                <span>{masterClass.current_participants}/{masterClass.max_participants}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-gray-600 mt-2 text-sm line-clamp-2">{masterClass.description}</p>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <CalendarIcon color="#737682" size={14} />
                            <span>{formatDate(masterClass.date_time)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ClockIcon />
                            <span>{formatTime(masterClass.date_time)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <DurationIcon />
                            <span>{masterClass.duration_minutes} мин</span>
                        </div>
                        {masterClass.type === 'offline' && masterClass.location && (
                            <div className="flex items-center gap-1">
                                <LocateIcon color="#737682" size={14} />
                                <span className="truncate max-w-[150px]">{masterClass.location}</span>
                            </div>
                        )}
                        {masterClass.type === 'online' && masterClass.online_link && (
                            <div className="flex items-center gap-1">
                                <OnlineIcon />
                                <span>Онлайн</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-end">
                        {isPast ? (
                            <span className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-lg text-sm">✅ Завершен</span>
                        ) : isStarted ? (
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm">⏳ В процессе</span>
                        ) : isFull ? (
                            <span className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-lg text-sm">❌ Мест нет</span>
                        ) : !canRegister ? (
                            <span className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-lg text-sm">⏰ Запись закрыта</span>
                        ) : isRegistered ? (
                            <div className="flex gap-2">
                                {masterClass.type === 'online' && masterClass.online_link && (
                                    <button
                                        onClick={() => window.open(masterClass.online_link, '_blank')}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                                    >
                                        <LaunchIcon />
                                        <span>Запустить</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => onCancel(masterClass.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-500 hover:text-white transition"
                                >
                                    <CancelIcon />
                                    <span>Отменить</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => onRegister(masterClass.id)}
                                className="flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-sm hover:shadow-lg transition"
                            >
                                <RegisterIcon />
                                <span>Записаться</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}