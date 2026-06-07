'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertIcon } from '@/components/icons/AlertIcon';
import { WarningIcon } from '@/components/icons/WarningIcon';
import { InfoIcon } from '@/components/icons/InfoIcon';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({isOpen, title, message, confirmText = 'Подтвердить', cancelText = 'Отмена', onConfirm, onCancel, type = 'warning'}: ConfirmModalProps) {
    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {bg: 'bg-firm-red', hover: 'hover:bg-red-600', border: 'border-firm-red/20', icon: <AlertIcon size={28} color="#D77C7C" />};
            case 'warning':
                return {bg: 'bg-firm-orange', hover: 'hover:bg-firm-pink', border: 'border-firm-orange/20', icon: <WarningIcon size={28} color="#F4A67F" />};
            case 'info':
                return {bg: 'bg-firm-pink', hover: 'hover:bg-firm-orange', border: 'border-firm-pink/20', icon: <InfoIcon size={28} color="#D97C8E" />};
            default:
                return { bg: 'bg-firm-orange', hover: 'hover:bg-firm-pink', border: 'border-gray-200', icon: <InfoIcon size={28} color="#F4A67F" />};
        }
    };

    const styles = getTypeStyles();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
                    <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className={`p-6 border-b ${styles.border}`}>
                            <div className="flex items-center gap-3">
                                {styles.icon}
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">{title}</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-firm-gray whitespace-pre-line">{message}</p>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={onConfirm} className={`flex-1 px-4 py-2 ${styles.bg} text-white rounded-xl font-medium ${styles.hover} transition-all duration-300`}>{confirmText}</button>
                            <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-medium hover:bg-forms transition-all duration-300 text-text">{cancelText}</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}