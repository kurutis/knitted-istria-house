"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface AddYarnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddYarnModal({ isOpen, onClose, onSuccess }: AddYarnModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '', article: '', brand: '', color: '', composition: '',
        weight_grams: '', length_meters: '', price: '', in_stock: true,
        stock_quantity: '', image_url: '', description: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/admin/yarn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    weight_grams: formData.weight_grams ? parseFloat(formData.weight_grams) : null,
                    length_meters: formData.length_meters ? parseFloat(formData.length_meters) : null,
                    price: formData.price ? parseFloat(formData.price) : null,
                    stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create yarn');
            }

            resetForm();
            onSuccess();
            onClose();
            toast.success('Пряжа успешно добавлена');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании пряжи';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', article: '', brand: '', color: '', composition: '',
            weight_grams: '', length_meters: '', price: '', in_stock: true,
            stock_quantity: '', image_url: '', description: ''
        });
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
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Добавить пряжу
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                Название <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                                Артикул <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="article"
                                value={formData.article}
                                onChange={handleInputChange}
                                required
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Бренд</label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Цвет</label>
                            <input
                                type="text"
                                name="color"
                                value={formData.color}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Состав</label>
                        <input
                            type="text"
                            name="composition"
                            value={formData.composition}
                            onChange={handleInputChange}
                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Вес (г)</label>
                            <input
                                type="number"
                                name="weight_grams"
                                value={formData.weight_grams}
                                onChange={handleInputChange}
                                step="0.01"
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Длина (м)</label>
                            <input
                                type="number"
                                name="length_meters"
                                value={formData.length_meters}
                                onChange={handleInputChange}
                                step="0.01"
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Цена (₽)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    step="0.01"
                                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Количество на складе</label>
                            <input
                                type="number"
                                name="stock_quantity"
                                value={formData.stock_quantity}
                                onChange={handleInputChange}
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            name="in_stock"
                            checked={formData.in_stock}
                            onChange={handleInputChange}
                            className="w-5 h-5 rounded accent-firm-orange"
                        />
                        <label className="text-gray-700">В наличии</label>
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">URL изображения</label>
                        <input
                            type="url"
                            name="image_url"
                            value={formData.image_url}
                            onChange={handleInputChange}
                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition"
                            placeholder="https://..."
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">Описание</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium"
                        >
                            {saving ? '⏳ Сохранение...' : '➕ Добавить пряжу'}
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
            </motion.div>
        </motion.div>
    );
}