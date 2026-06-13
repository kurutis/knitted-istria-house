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
import { CancelIcon } from '@/components/icons/CancelIcon'
import { Productslcon } from '@/components/icons/Productslcon'

const getProxiedAvatarUrl = (url: string | null): string | null => {
    if (!url) return null
    if (url.includes('/api/proxy/avatar') || url.includes('selstorage.ru')) return url
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

    const formatDate = (dateString: string) => {return new Date(dateString).toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric'})}

    const formatTime = (dateString: string) => {return new Date(dateString).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}

    return (
        <motion.div className="bg-main rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100" whileHover={{ y: -4 }}>
            <div className="flex flex-col sm:flex-row">
                {masterClass.image_url && !imageError ? (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-gray-100">
                        <img src={masterClass.image_url} alt={masterClass.title} className="w-full h-full object-cover" onError={() => setImageError(true)} />
                    </div>
                ) : (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-gradient-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center">
                        <div className="text-center">
                            <Productslcon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto" color="#D1D5DB" />
                            <span className="text-xs text-firm-gray mt-1 block">Нет фото</span>
                        </div>
                    </div>
                )}

                <div className="flex-1 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-base sm:text-lg line-clamp-1 text-text">
                                {masterClass.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                {masterAvatar && !avatarError ? (
                                    <img src={masterAvatar} alt={masterName} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover" onError={() => setAvatarError(true)} />
                                ) : (
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-[10px] sm:text-xs font-bold">
                                        {masterInitials}
                                    </div>
                                )}
                                <span className="text-xs sm:text-sm text-firm-gray font-medium truncate">{masterName}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                                <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${masterClass.type === 'online' ? 'bg-firm-pink text-main' : 'bg-firm-green text-main'}`}>{masterClass.type === 'online' ? (<OnlineIcon color="white" size={10} />) : (<LocateIcon color="white" size={10} />)}{masterClass.type === 'online' ? 'Онлайн' : 'Офлайн'}</span>
                                {getStatusBadge(masterClass.status)}
                            </div>
                        </div>
                        <div className="text-left sm:text-right flex sm:block items-center justify-between w-full sm:w-auto gap-2">
                            <div className="text-lg sm:text-xl font-bold text-firm-orange">
                                {masterClass.price.toLocaleString()} ₽
                            </div>
                            <div className="text-xs sm:text-sm text-firm-gray flex items-center gap-1 sm:justify-end">
                                <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{masterClass.current_participants}/{masterClass.max_participants}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-firm-gray mt-2 text-xs sm:text-sm line-clamp-2">{masterClass.description}</p>

                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3 text-[10px] sm:text-xs text-firm-gray">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                            <CalendarIcon color="#737682" size={12} />
                            <span>{formatDate(masterClass.date_time)}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                            <ClockIcon />
                            <span>{formatTime(masterClass.date_time)}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                            <DurationIcon />
                            <span>{masterClass.duration_minutes} мин</span>
                        </div>
                        {masterClass.type === 'offline' && masterClass.location && (
                            <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                                <LocateIcon color="#737682" size={12} />
                                <span className="truncate max-w-32 sm:max-w-40">{masterClass.location}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex flex-wrap justify-end gap-1.5 sm:gap-2">
                        <motion.button onClick={() => onViewParticipants(masterClass)} className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-firm-gray rounded-lg text-[11px] sm:text-sm hover:bg-gray-200 transition" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Участники ({masterClass.registrations?.length || 0})</motion.button>
                        {!isPast && masterClass.status === 'published' && (<motion.button onClick={() => onCancel(masterClass.id)} className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 border border-firm-red text-firm-red rounded-lg text-[11px] sm:text-sm hover:bg-firm-red hover:text-main transition" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><CancelIcon />Отменить</motion.button>)}
                        <motion.button onClick={() => onEdit(masterClass)} className="inline-flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-lg text-[11px] sm:text-sm hover:shadow-lg transition" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><EditIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" color="#f9f9f9" />Редактировать</motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}