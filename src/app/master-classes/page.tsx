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
import { EditIcon } from "@/components/icons/EditIcon";

const ClassesIcon = () => (
  <svg width="28" height="28" viewBox="0 0 308 308" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M191.202 34.21H294.366C299.707 34.21 304 37.643 304 41.915V296.295C304 300.567 299.707 304 294.366 304H13.6344C8.29262 304 4 300.567 4 296.295V41.915C4 37.643 8.29262 34.21 13.6344 34.21H88.6106M53.3641 90.4339H254.445M130.486 55.9902V4.03863M19.6438 13.0024H77.4976C82.8185 13.0024 87.132 16.4521 87.132 20.7074V26.5053C87.132 30.7607 82.8185 34.2102 77.4976 34.2102H19.6438C14.3229 34.2102 10.0096 30.7607 10.0096 26.5053V20.7074C10.0096 16.4521 14.3229 13.0024 19.6438 13.0024ZM231.122 13.0024H288.976C294.297 13.0024 298.61 16.4521 298.61 20.7074V26.5053C298.61 30.7607 294.297 34.2102 288.976 34.2102H231.122C225.802 34.2102 221.488 30.7607 221.488 26.5053V20.7074C221.488 16.4521 225.802 13.0024 231.122 13.0024ZM87.1319 49.2387V12.9643C87.1319 12.9643 87.7519 3.31389 104.922 4.03862H207.943C207.943 4.03862 221.488 3.42843 221.488 12.9643V26.4671C221.488 30.7392 217.195 34.1722 211.854 34.1722H190.773C190.773 34.1722 176.321 32.6081 177.227 49.2387C177.656 49.2387 176.798 56.448 162.776 56.1047C162.346 55.7614 101.345 56.1047 101.345 56.1047C101.345 56.1047 91.0905 57.554 87.1795 49.2387H87.1319Z" stroke="#D97C8E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M26.8267 4.21244C28.6709 4.21244 30.5151 4.21244 32.3548 4.21244C32.8471 4.21244 33.25 4.57667 33.25 5.02185V32.4406C33.25 32.8858 32.8471 33.25 32.3548 33.25H2.14523C1.65285 33.25 1.25 32.8858 1.25 32.4406V5.02185C1.25 4.57667 1.65285 4.21244 2.14523 4.21244H8.28651M12.7672 4.21244C15.9318 4.21244 19.1009 4.21244 22.2655 4.21244M1.25 10.7565H33.25M9.2086 1.25H11.8361C12.3602 1.25 12.7851 1.63413 12.7851 2.10797V7.34485C12.7851 7.8187 12.3602 8.20283 11.8361 8.20283H9.2086C8.68451 8.20283 8.25966 7.8187 8.25966 7.34485V2.10797C8.25966 1.63413 8.68451 1.25 9.2086 1.25ZM23.1787 1.25H25.8599C26.3836 1.25 26.8088 1.63447 26.8088 2.10797V7.3489C26.8088 7.8224 26.3836 8.20687 25.8599 8.20687H23.2324C22.7087 8.20687 22.2834 7.8224 22.2834 7.3489V2.06346C22.2834 1.61828 22.6863 1.25405 23.1787 1.25405V1.25Z" stroke="#F4A67F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NoClassesIcon = () => (
  <svg width="80" height="80" viewBox="0 0 308 308" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M191.202 34.21H294.366C299.707 34.21 304 37.643 304 41.915V296.295C304 300.567 299.707 304 294.366 304H13.6344C8.29262 304 4 300.567 4 296.295V41.915C4 37.643 8.29262 34.21 13.6344 34.21H88.6106M53.3641 90.4339H254.445M130.486 55.9902V4.03863M19.6438 13.0024H77.4976C82.8185 13.0024 87.132 16.4521 87.132 20.7074V26.5053C87.132 30.7607 82.8185 34.2102 77.4976 34.2102H19.6438C14.3229 34.2102 10.0096 30.7607 10.0096 26.5053V20.7074C10.0096 16.4521 14.3229 13.0024 19.6438 13.0024ZM231.122 13.0024H288.976C294.297 13.0024 298.61 16.4521 298.61 20.7074V26.5053C298.61 30.7607 294.297 34.2102 288.976 34.2102H231.122C225.802 34.2102 221.488 30.7607 221.488 26.5053V20.7074C221.488 16.4521 225.802 13.0024 231.122 13.0024ZM87.1319 49.2387V12.9643C87.1319 12.9643 87.7519 3.31389 104.922 4.03862H207.943C207.943 4.03862 221.488 3.42843 221.488 12.9643V26.4671C221.488 30.7392 217.195 34.1722 211.854 34.1722H190.773C190.773 34.1722 176.321 32.6081 177.227 49.2387C177.656 49.2387 176.798 56.448 162.776 56.1047C162.346 55.7614 101.345 56.1047 101.345 56.1047C101.345 56.1047 91.0905 57.554 87.1795 49.2387H87.1319Z" stroke="#D4D4D4" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NoRegistrationsIcon = () => (
  <svg width="80" height="80" viewBox="0 0 308 308" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.4025 304H268.405C273.05 304 276.808 301.191 276.808 297.718V30.3889C276.808 26.9167 273.05 24.1073 268.405 24.1073C259.665 24.1073 250.882 24.1073 242.142 24.1073C259.96 24.1073 277.779 24.1073 295.598 24.1073C300.242 24.1073 304 26.9167 304 30.3889V297.718C304 301.191 300.242 304 295.598 304H12.4025ZM12.4025 304C7.75788 304 4 301.191 4 297.718V30.3889C4 26.9167 7.75788 24.1073 12.4025 24.1073M12.4025 24.1073H45.2949M12.4025 24.1073H45.2103M73.5846 24.1073C120.411 24.1073 167.279 24.1073 214.105 24.1073M74.1335 24.1073C120.875 24.1073 167.659 24.1073 214.401 24.1073M99.2145 87.428H233.613M88.2363 124.896H222.635M93.8521 162.365H228.293M101.875 197.056H236.273M93.8521 238.596H228.293M53.7397 4H65.1823C69.8229 4 73.5848 6.81235 73.5848 10.2816V51.9482C73.5848 55.4174 69.8229 58.2298 65.1823 58.2298H53.7397C49.0991 58.2298 45.337 55.4174 45.337 51.9482V10.2816C45.337 6.81235 49.0991 4 53.7397 4ZM222.55 4H233.993C238.633 4 242.395 6.81235 242.395 10.2816V51.9482C242.395 55.4174 238.633 58.2298 233.993 58.2298H222.55C217.91 58.2298 214.148 55.4174 214.148 51.9482V10.2816C214.148 6.81235 217.91 4 222.55 4ZM53.7397 75.5593H68.6868C73.3274 75.5593 77.0894 78.3717 77.0894 81.8409V93.0151C77.0894 96.4844 73.3274 99.2967 68.6868 99.2967H53.7397C49.0991 99.2967 45.337 96.4844 45.337 93.0151V81.8409C45.337 78.3717 49.0991 75.5593 53.7397 75.5593ZM53.7397 113.028H68.6868C73.3274 113.028 77.0894 115.84 77.0894 119.309V130.484C77.0894 133.953 73.3274 136.765 68.6868 136.765H53.7397C49.0991 136.765 45.337 133.953 45.337 130.484V119.309C45.337 115.84 49.0991 113.028 53.7397 113.028ZM52.0085 150.496H66.9556C71.5962 150.496 75.3582 153.309 75.3582 156.778V167.952C75.3582 171.421 71.5962 174.234 66.9556 174.234H52.0085C47.3679 174.234 43.6059 171.421 43.6059 167.952V156.778C43.6059 153.309 47.3679 150.496 52.0085 150.496ZM53.7397 185.187H68.6868C73.3274 185.187 77.0894 187.999 77.0894 191.468V202.643C77.0894 206.112 73.3274 208.924 68.6868 208.924H53.7397C49.0991 208.924 45.337 206.112 45.337 202.643V191.468C45.337 187.999 49.0991 185.187 53.7397 185.187ZM53.7397 226.727H68.6868C73.3274 226.727 77.0894 229.54 77.0894 233.009V244.183C77.0894 247.652 73.3274 250.465 68.6868 250.465H53.7397C49.0991 250.465 45.337 247.652 45.337 244.183V233.009C45.337 229.54 49.0991 226.727 53.7397 226.727Z" stroke="#D4D4D4" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NoCreatedIcon = () => (
  <svg width="80" height="80" viewBox="0 0 308 308" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M191.202 34.21H294.366C299.707 34.21 304 37.643 304 41.915V296.295C304 300.567 299.707 304 294.366 304H13.6344C8.29262 304 4 300.567 4 296.295V41.915C4 37.643 8.29262 34.21 13.6344 34.21H88.6106M53.3641 90.4339H254.445M130.486 55.9902V4.03863M19.6438 13.0024H77.4976C82.8185 13.0024 87.132 16.4521 87.132 20.7074V26.5053C87.132 30.7607 82.8185 34.2102 77.4976 34.2102H19.6438C14.3229 34.2102 10.0096 30.7607 10.0096 26.5053V20.7074C10.0096 16.4521 14.3229 13.0024 19.6438 13.0024ZM231.122 13.0024H288.976C294.297 13.0024 298.61 16.4521 298.61 20.7074V26.5053C298.61 30.7607 294.297 34.2102 288.976 34.2102H231.122C225.802 34.2102 221.488 30.7607 221.488 26.5053V20.7074C221.488 16.4521 225.802 13.0024 231.122 13.0024ZM87.1319 49.2387V12.9643C87.1319 12.9643 87.7519 3.31389 104.922 4.03862H207.943C207.943 4.03862 221.488 3.42843 221.488 12.9643V26.4671C221.488 30.7392 217.195 34.1722 211.854 34.1722H190.773C190.773 34.1722 176.321 32.6081 177.227 49.2387C177.656 49.2387 176.798 56.448 162.776 56.1047C162.346 55.7614 101.345 56.1047 101.345 56.1047C101.345 56.1047 91.0905 57.554 87.1795 49.2387H87.1319Z" stroke="#D4D4D4" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LockIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16V16.01M7 11H17V18H7V11Z" stroke="#D4D4D4" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#D4D4D4" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl lg:text-4xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent flex items-center gap-3">
                        <ClassesIcon />
                        Мастер-классы
                    </h1>
                    {isMaster && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 text-sm font-medium"
                        >
                            <span className="text-lg">+</span>
                            <span>Создать мастер-класс</span>
                        </button>
                    )}
                </div>

                {/* Вкладки */}
                <div className="flex gap-2 sm:gap-6 mb-8 border-b border-gray-200">
                    {[
                        { id: 'all', label: 'Все мастер-классы', icon: <ClassesIcon /> },
                        ...(session?.user ? [{ id: 'my', label: 'Мои записи', icon: <CalendarIcon />, count: myRegisteredClasses.length }] : []),
                        ...(isMaster ? [{ id: 'created', label: 'Мои мастер-классы', icon: <EditIcon className="w-4 h-4" color="#F4A67F" />, count: myCreatedClasses.length }] : [])
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'all' | 'my' | 'created')}
                            className={`pb-3 px-2 sm:px-4 font-medium transition-all duration-300 relative flex items-center gap-2 text-sm sm:text-base ${
                                activeTab === tab.id 
                                    ? 'text-firm-orange' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span className="w-5 h-5">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-1.5 px-2 py-0.5 bg-firm-orange text-white text-xs rounded-full min-w-[20px] text-center">
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Вкладка "Все мастер-классы" */}
                    {activeTab === 'all' && (
                        <motion.div
                            key="all"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col lg:flex-row gap-6"
                        >
                            {/* Календарь - на мобильных не фиксированный */}
                            <div className={`w-full lg:w-1/3 xl:w-1/4 bg-white rounded-2xl shadow-lg p-5 ${!isMobile ? 'sticky top-24' : ''}`}>
                                <div className="flex justify-between items-center mb-5">
                                    <button onClick={() => changeMonth(-1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-600">←</button>
                                    <h2 className="font-semibold text-base sm:text-lg text-gray-800">{monthNames[month]} {year}</h2>
                                    <button onClick={() => changeMonth(1)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-600">→</button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center mb-3">
                                    {weekDays.map(day => (
                                        <div key={day} className="text-xs sm:text-sm font-medium text-gray-500 py-1">
                                            {isMobile ? day.charAt(0) : day}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((date, idx) => {
                                        const isToday = date && date.toDateString() === today.toDateString()
                                        const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString()
                                        const classesOnDate = date ? getClassesForDate(date) : []
                                        
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => date && setSelectedDate(date)}
                                                className={`
                                                    aspect-square p-1 rounded-full text-sm transition-all relative
                                                    ${!date ? 'bg-gray-50' : 'hover:bg-gray-100 cursor-pointer'}
                                                    ${isToday ? 'bg-firm-orange/15 font-bold ring-2 ring-firm-orange/50' : ''}
                                                    ${isSelected ? 'ring-2 ring-firm-orange shadow-md bg-firm-orange/5' : ''}
                                                `}
                                                disabled={!date}
                                            >
                                                {date && (
                                                    <>
                                                        <span className={classesOnDate.length > 0 ? 'text-firm-orange font-semibold' : 'text-gray-700'}>
                                                            {date.getDate()}
                                                        </span>
                                                        {classesOnDate.length > 0 && (
                                                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-firm-orange rounded-full" />
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
                                    <div className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl p-3 flex items-center gap-2">
                                        <CalendarIcon />
                                        <p className="text-gray-600 text-sm">
                                            Мастер-классы на {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>
                                )}

                                {(() => {
                                    const classesToShow = selectedDate ? getClassesForDate(selectedDate) : masterClasses
                                    
                                    if (classesToShow.length === 0) {
                                        return (
                                            <div className="text-center py-16 bg-gray-50 rounded-xl">
                                                <div className="mb-4 flex justify-center">
                                                    <NoClassesIcon />
                                                </div>
                                                <p className="text-gray-400 text-base">Нет доступных мастер-классов</p>
                                                <p className="text-gray-300 text-sm mt-1">Попробуйте выбрать другую дату</p>
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
                        </motion.div>
                    )}

                    {activeTab === 'my' && (
                        <motion.div
                            key="my"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {!session ? (
                                <div className="text-center py-16 bg-gray-50 rounded-xl">
                                    <div className="mb-4 flex justify-center">
                                        <LockIcon />
                                    </div>
                                    <p className="text-gray-500 mb-4">Для просмотра ваших мастер-классов необходимо авторизоваться</p>
                                    <Link href="/auth/signin" className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition">
                                        Войти
                                    </Link>
                                </div>
                            ) : myRegisteredClasses.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 rounded-xl">
                                    <div className="mb-4 flex justify-center">
                                        <NoRegistrationsIcon />
                                    </div>
                                    <p className="text-gray-400 text-base">Вы еще не записаны ни на один мастер-класс</p>
                                    <button onClick={() => setActiveTab('all')} className="text-firm-orange hover:underline mt-2">
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
                        </motion.div>
                    )}

                    {/* Вкладка "Мои мастер-классы" */}
                    {activeTab === 'created' && isMaster && (
                        <motion.div
                            key="created"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {myCreatedClasses.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 rounded-xl">
                                    <div className="mb-4 flex justify-center">
                                        <NoCreatedIcon />
                                    </div>
                                    <p className="text-gray-400 text-base">У вас нет созданных мастер-классов</p>
                                    <button onClick={() => setShowCreateModal(true)} className="text-firm-orange hover:underline mt-2">
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
                        </motion.div>
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