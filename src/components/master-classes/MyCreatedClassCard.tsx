// src/components/master-classes/MyCreatedClassCard.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MasterClass } from '@/types/master-class'
import { CalendarIcon } from '@/components/icons/CalendarIcon'
import { LocateIcon } from '@/components/icons/LocateIcon'
import { ClockIcon } from '@/components/icons/ClockIcon'
import { DurationIcon } from '@/components/icons/DurationIcon'
import { UserIcon } from '@/components/icons/UserIcon'
import { OnlineIcon } from '@/components/icons/OnlineIcon'
import { EditIcon } from '@/components/icons/EditIcon'
import { DeleteIcon } from '@/components/icons/DeleteIcon'
import { CancelIcon } from '@/components/icons/CancelIcon'

const getProxiedAvatarUrl = (url: string | null): string | null => {
    if (!url) return null
    if (url.includes('/api/proxy/avatar') || url.includes('selstorage.ru')) {
        return url
    }
    return `/api/proxy/avatar?url=${encodeURIComponent(url)}`
}

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
    const [avatarError, setAvatarError] = useState(false)

    const masterName = masterClass.master_name || 'Мастер'
    const masterAvatar = masterClass.master_avatar ? getProxiedAvatarUrl(masterClass.master_avatar) : null
    const masterInitials = masterName.charAt(0).toUpperCase()

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
            className="bg-main rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {/* Изображение */}
                {masterClass.image_url && !imageError ? (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-gray-100">
                        <img 
                            src={masterClass.image_url} 
                            alt={masterClass.title} 
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    </div>
                ) : (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-linear-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-1">🎓</div>
                            <span className="text-xs text-firm-gray">Нет фото</span>
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
                            <div className="flex items-center gap-2 mt-2">
                                {masterAvatar && !avatarError ? (
                                    <img
                                        src={masterAvatar}
                                        alt={masterName}
                                        className="w-6 h-6 rounded-full object-cover"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-xs font-bold">
                                        {masterInitials}
                                    </div>
                                )}
                                <span className="text-sm text-firm-gray font-medium">{masterName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${masterClass.type === 'online' ? 'bg-firm-pink text-main' : 'bg-firm-green text-main'}`}>
                                    {masterClass.type === 'online' ? (
                                        <OnlineIcon color="white" size={10} />
                                    ) : (
                                        <LocateIcon color="white" size={10} />
                                    )}
                                    <span>{masterClass.type === 'online' ? 'Онлайн' : 'Офлайн'}</span>
                                </span>
                                {getStatusBadge(masterClass.status)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-firm-orange">
                                {masterClass.price.toLocaleString()} ₽
                            </div>
                            <div className="text-sm text-firm-gray flex items-center gap-1 justify-end">
                                <UserIcon />
                                <span>{masterClass.current_participants}/{masterClass.max_participants}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-firm-gray mt-2 text-sm line-clamp-2">{masterClass.description}</p>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-firm-gray">
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
                                <span className="truncate max-w-37.5">{masterClass.location}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <motion.button
                            onClick={() => onViewParticipants(masterClass)}
                            className="px-3 py-1.5 bg-gray-100 text-firm-gray rounded-lg text-sm hover:bg-gray-200 transition"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                        >
                            👥 Участники ({masterClass.registrations?.length || 0})
                        </motion.button>
                        {!isPast && masterClass.status === 'published' && (
                            <motion.button
                                onClick={() => onCancel(masterClass.id)}
                                className="px-3 py-1.5 border border-firm-red text-firm-red rounded-lg text-sm hover:bg-firm-red hover:text-main transition"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                            >
                                <CancelIcon />
                                <span>Отменить</span>
                            </motion.button>
                        )}
                        <motion.button
                            onClick={() => onEdit(masterClass)} 
                            className="px-3 py-1.5 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-lg text-sm hover:shadow-lg transition flex items-center gap-1"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                        >
                            <EditIcon className="w-4 h-4" color="#f9f9f9" />
                            <span>Редактировать</span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}