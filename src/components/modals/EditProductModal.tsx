"use client";

import React, { useState, useEffect, JSX } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

interface CategoryItem {
  id: number;
  name: string;
  subcategories?: CategoryItem[];
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    technique: string;
    size: string;
    care_instructions: string;
    color: string;
  };
  categories: CategoryItem[];
}

const techniques = [
  "Лицевая гладь", "Изнаночная гладь", "Резинка", "Платочная вязка",
  "Косы", "Араны", "Жаккард", "Ленивый жаккард", "Патентная резинка",
  "Ажур", "Сетка", "Рис", "Путанка", "Бриошь", "Другое",
];
const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Не применимо"];

export default function EditProductModal({
  isOpen,
  onClose,
  onSuccess,
  product,
  categories,
}: EditProductModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    technique: "",
    size: "",
    care_instructions: "",
    color: "",
  });

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || "",
        description: product.description || "",
        price: product.price.toString(),
        category: product.category || "",
        technique: product.technique || "",
        size: product.size || "",
        care_instructions: product.care_instructions || "",
        color: product.color || "",
      });
    }
  }, [product]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderCategoryOptions = (cats: CategoryItem[], level = 0): JSX.Element[] => {
    if (!cats || !Array.isArray(cats)) {
      return [];
    }
    const options: JSX.Element[] = [];
    cats.forEach(cat => {
      const prefix = "—".repeat(level);
      options.push(
        <option key={cat.id} value={cat.name}>
          {prefix} {cat.name}
        </option>
      );
      if (cat.subcategories && Array.isArray(cat.subcategories) && cat.subcategories.length) {
        options.push(...renderCategoryOptions(cat.subcategories, level + 1));
      }
    });
    return options;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast.error("Пожалуйста, выберите категорию товара");
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        technique: formData.technique,
        size: formData.size,
        care_instructions: formData.care_instructions,
        color: formData.color,
      };
      
      const response = await fetch(`/api/master/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка при обновлении");
      }
      
      toast.success("Товар успешно обновлен");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Ошибка при обновлении товара");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const safeCategories = Array.isArray(categories) ? categories : [];

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
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
            Редактировать товар
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Название товара <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Категория <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              >
                <option value="">Выберите категорию</option>
                {renderCategoryOptions(safeCategories)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Техника вязки</label>
              <select
                name="technique"
                value={formData.technique}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
              >
                <option value="">Выберите технику</option>
                {techniques.map(tech => <option key={tech} value={tech}>{tech}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Размер</label>
              <select
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              >
                <option value="">Выберите размер</option>
                {sizes.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Цвет</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
                placeholder="Красный, Синий, Зеленый..."
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Уход</label>
              <input
                type="text"
                name="care_instructions"
                value={formData.care_instructions}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
                placeholder="Ручная стирка при 30°C..."
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Цена <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                min="0"
                step="100"
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-medium disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}