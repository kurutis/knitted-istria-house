'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    onConfirm,
    onCancel,
    type = 'warning'
}: ConfirmModalProps) {
    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    bg: 'bg-red-500',
                    hover: 'hover:bg-red-600',
                    border: 'border-red-200',
                    icon: '⚠️'
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-500',
                    hover: 'hover:bg-yellow-600',
                    border: 'border-yellow-200',
                    icon: '⚠️'
                };
            default:
                return {
                    bg: 'bg-firm-orange',
                    hover: 'hover:bg-firm-pink',
                    border: 'border-gray-200',
                    icon: '❓'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`p-6 border-b ${styles.border}`}>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{styles.icon}</span>
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl">
                                    {title}
                                </h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 whitespace-pre-line">{message}</p>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={onConfirm}
                                className={`flex-1 px-4 py-2 ${styles.bg} text-white rounded-xl font-medium ${styles.hover} transition-all duration-300`}
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all duration-300"
                            >
                                {cancelText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}