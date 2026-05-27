'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Session } from 'next-auth'
import { MasterClass } from '@/types/master-class'

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

    // Правильная проверка завершенности с учетом длительности
    const isClassCompleted = (): boolean => {
        const startTime = new Date(masterClass.date_time);
        const endTime = new Date(startTime.getTime() + masterClass.duration_minutes * 60000);
        return new Date() >= endTime;
    }

    // Проверка, начался ли мастер-класс
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

    // Определяем тип иконки для отображения
    const getTypeIcon = () => {
        if (masterClass.type === 'online') return '🖥️'
        return '📍'
    }

    const getTypeText = () => {
        if (masterClass.type === 'online') return 'Онлайн'
        return 'Офлайн'
    }

    return (
        <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {/* Изображение */}
                {masterClass.image_url && !imageError ? (
                    <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 relative bg-gray-100">
                        <img 
                            src={masterClass.image_url} 
                            alt={masterClass.title} 
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                        <span className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full z-10 flex items-center gap-1">
                            <span>{getTypeIcon()}</span>
                            <span>{getTypeText()}</span>
                        </span>
                    </div>
                ) : (
                    <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 bg-gradient-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-1">{getTypeIcon()}</div>
                            <span className="text-xs text-gray-500">{getTypeText()}</span>
                        </div>
                    </div>
                )}

                {/* Информация */}
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
                        {masterClass.type === 'online' && masterClass.online_link && (
                            <div className="flex items-center gap-1">🔗 Онлайн-трансляция</div>
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
                                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                                    >
                                        🚀 Запустить
                                    </button>
                                )}
                                <button
                                    onClick={() => onCancel(masterClass.id)}
                                    className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-500 hover:text-white transition"
                                >
                                    Отменить
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => onRegister(masterClass.id)}
                                className="px-4 py-1.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-sm hover:shadow-lg transition"
                            >
                                📝 Записаться
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}