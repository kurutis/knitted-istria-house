// src/components/master-classes/MyCreatedClassCard.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MasterClass } from '@/types/master-class'

interface MyCreatedClassCardProps {
    masterClass: MasterClass
    getStatusBadge: (status: string) => React.ReactNode
    onEdit: (masterClass: MasterClass) => void
    onDelete: (id: string) => void
    onCancel: (id: string) => void
    onViewParticipants: (masterClass: MasterClass) => void
    isPast?: boolean
}

export default function MyCreatedClassCard({ 
    masterClass, 
    getStatusBadge, 
    onEdit, 
    onCancel, 
    onViewParticipants, 
    isPast = false 
}: MyCreatedClassCardProps) {
    const [imageError, setImageError] = useState(false)

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

    return (
        <motion.div 
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {/* Изображение */}
                {masterClass.image_url && !imageError ? (
                    <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 bg-gray-100">
                        <img 
                            src={masterClass.image_url} 
                            alt={masterClass.title} 
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    </div>
                ) : (
                    <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 bg-gradient-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-1">🎓</div>
                            <span className="text-xs text-gray-500">Нет фото</span>
                        </div>
                    </div>
                )}

                {/* Информация */}
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
                            <div className="text-xl font-bold text-firm-orange">
                                {masterClass.price.toLocaleString()} ₽
                            </div>
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
                        <button
                            onClick={() => onViewParticipants(masterClass)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
                        >
                            👥 Участники ({masterClass.registrations?.length || 0})
                        </button>
                        {!isPast && masterClass.status === 'published' && (
                            <button
                                onClick={() => onCancel(masterClass.id)}
                                className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg text-sm hover:bg-red-500 hover:text-white transition"
                            >
                                Отменить
                            </button>
                        )}
                        <button
                            onClick={() => onEdit(masterClass)} 
                            className="px-3 py-1.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-sm hover:shadow-lg transition"
                        >
                            ✏️ Редактировать
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}