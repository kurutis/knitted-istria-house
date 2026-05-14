'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromptModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export default function PromptModal({
    isOpen,
    title,
    message,
    placeholder = 'Введите причину...',
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    defaultValue = '',
    onConfirm,
    onCancel
}: PromptModalProps) {
    const [value, setValue] = useState(defaultValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Сбрасываем значение при открытии с помощью key или через пропс
    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setValue(defaultValue);
            // Фокус после рендера
            const timer = setTimeout(() => textareaRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, defaultValue]);

    const handleConfirm = () => {
        if (value.trim()) {
            onConfirm(value.trim());
        }
    };

    const handleCancel = () => {
        setValue(defaultValue);
        onCancel();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleConfirm();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={handleCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">✏️</span>
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl">
                                    {title}
                                </h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-3">{message}</p>
                            <textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                rows={3}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                {value.length}/500 символов
                            </p>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={handleConfirm}
                                disabled={!value.trim()}
                                className="flex-1 px-4 py-2 bg-firm-orange text-white rounded-xl font-medium hover:bg-firm-pink transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={handleCancel}
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