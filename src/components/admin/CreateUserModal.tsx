// components/admin/CreateUserModal.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'buyer'
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create user');
            }

            resetForm();
            onSuccess();
            onClose();
            alert('Пользователь успешно создан');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании пользователя';
            alert(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({ email: '', password: '', name: '', phone: '', role: 'buyer' });
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                            Создать пользователя
                        </h2>
                        <button 
                            onClick={onClose} 
                            className="text-gray-400 hover:text-gray-600 text-2xl transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                Пароль <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                minLength={6}
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                            />
                            <p className="text-xs text-gray-400 mt-1">Минимум 6 символов</p>
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Имя</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Телефон</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Роль</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                            >
                                <option value="buyer">Покупатель</option>
                                <option value="master">Мастер</option>
                                <option value="admin">Администратор</option>
                            </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
                            >
                                {saving ? '⏳ Создание...' : '👤 Создать пользователя'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                            >
                                Отмена
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
}