'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Session } from 'next-auth'
import { MasterClass } from '@/types/master-class'
import { CalendarIcon } from '@/components/icons/CalendarIcon'
import { LocateIcon } from '@/components/icons/LocateIcon'
import { ClockIcon } from '@/components/icons/ClockIcon'
import { DurationIcon } from '@/components/icons/DurationIcon'
import { OnlineIcon } from '@/components/icons/OnlineIcon'
import { UserIcon } from '@/components/icons/UserIcon'
import { RegisterIcon } from '@/components/icons/RegisterIcon'
import { CancelIcon } from '@/components/icons/CancelIcon'
import { LaunchIcon } from '@/components/icons/LaunchIcon'

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

export default function MasterClassCard({masterClass, session, onRegister, onCancel }: MasterClassCardProps) {
    const [imageError, setImageError] = useState(false)
    const [avatarError, setAvatarError] = useState(false)
    const [hover, setHover] = useState(false);
    
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

    const formatDate = (dateString: string) => {return new Date(dateString).toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric'})}

    const formatTime = (dateString: string) => {return new Date(dateString).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}

    const getStatusText = () => {
        if (isPast) return 'Завершен'
        if (isStarted) return 'В процессе'
        if (isFull) return 'Мест нет'
        if (!canRegister) return 'Запись закрыта'
        return null
    }

    const statusText = getStatusText()
    const showStatusBadge = statusText !== null && !isRegistered

    return (
        <motion.div 
            className="bg-main rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300" 
            whileHover={{ y: -4 }}
        >
            <div className="flex flex-col sm:flex-row">
                {masterClass.image_url && !imageError ? (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 relative bg-gray-100">
                        <img src={masterClass.image_url}  alt={masterClass.title} className="w-full h-full object-cover" onError={() => setImageError(true)} />
                        <span className={`absolute top-2 left-2 px-2 py-1 text-main text-xs rounded-full flex items-center gap-1 z-10 ${masterClass.type === 'online' ? 'bg-firm-pink' : 'bg-firm-green'}`}>{masterClass.type === 'online' ? ( <OnlineIcon color="white" size={12} />) : (<LocateIcon color="white" size={12} />)}<span className='text-main'>{masterClass.type === 'online' ? 'Онлайн' : 'Офлайн'}</span></span>
                    </div>
                ) : (
                    <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-linear-to-r from-firm-orange/20 to-firm-pink/20 flex items-center justify-center">
                        <div className="text-center">
                            {masterClass.type === 'online' ? (<OnlineIcon color="#D97C8E" size={32} />) : (<LocateIcon color="#D97C8E" size={32} />)}
                            <span className="text-xs text-firm-gray block mt-1">{masterClass.type === 'online' ? 'Онлайн' : 'Офлайн'}</span>
                        </div>
                    </div>
                )}
                <div className="flex-1 p-4">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg sm:text-xl line-clamp-1">{masterClass.title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                {masterAvatar && !avatarError ? (
                                    <img src={masterAvatar} alt={masterName} className="w-6 h-6 rounded-full object-cover" onError={() => setAvatarError(true)} />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-xs font-bold">
                                        {masterInitials}
                                    </div>
                                )}
                                <span className="text-sm text-firm-gray font-medium">{masterName}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl sm:text-2xl font-bold text-firm-orange">
                                {masterClass.price.toLocaleString()} ₽
                            </div>
                            <div className="text-xs sm:text-sm text-firm-gray flex items-center gap-1 justify-end">
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
                        {masterClass.type === 'online' && masterClass.online_link && (
                            <div className="flex items-center gap-1">
                                <OnlineIcon />
                                <span>Онлайн-трансляция</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-end">
                        {showStatusBadge ? (
                            <span className="px-3 py-1.5 bg-gray-200 text-firm-gray rounded-lg text-sm">{statusText}</span>
                        ) : isRegistered ? (
                            <div className="flex gap-2">
                                {masterClass.type === 'online' && masterClass.online_link && (<motion.button onClick={() => window.open(masterClass.online_link, '_blank')} className="flex items-center gap-1 px-3 py-1.5 bg-firm-green text-main rounded-lg text-sm hover:bg-green-400 transition" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}><LaunchIcon /><span className='text-main'>Запустить</span></motion.button>)}
                               const [hover, setHover] = useState(false);

<motion.button
  onClick={() => onCancel(masterClass.id)}
  className="flex items-center gap-1 px-3 py-1.5 border border-firm-red rounded-lg text-sm transition-all duration-300"
  style={{
    backgroundColor: hover ? 'var(--color-firm-red)' : 'transparent',
    color: hover ? 'var(--color-main)' : 'var(--color-firm-red)',
  }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onMouseEnter={() => setHover(true)}
  onMouseLeave={() => setHover(false)}
>
  <CancelIcon color={hover ? '#f9f9f9' : '#D77C7C'} size={14} />
  <span>Отменить</span>
</motion.button>
                            </div>
                        ) : (
                            <motion.button onClick={() => onRegister(masterClass.id)} className="flex items-center gap-1 px-4 py-1.5 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-lg text-sm hover:shadow-lg transition" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}><RegisterIcon /><span className='text-main'>Записаться</span></motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}