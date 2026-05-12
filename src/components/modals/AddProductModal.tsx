"use client";

import React, { useState, useRef, useEffect, JSX } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface CategoryItem {
  id: number;
  name: string;
  subcategories?: CategoryItem[];
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: CategoryItem[];
  yarns: { id: string; name: string; brand: string }[];
}

export default function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  yarns,
}: AddProductModalProps) {
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const techniques = [
    "Лицевая гладь", "Изнаночная гладь", "Резинка", "Платочная вязка",
    "Косы", "Араны", "Жаккард", "Ленивый жаккард", "Патентная резинка",
    "Ажур", "Сетка", "Рис", "Путанка", "Бриошь", "Другое",
  ];
  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Не применимо"];
  
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    technique: "",
    size: "",
    care_instructions: "",
    yarn_id: "",
    custom_yarn: "",
    color: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      alert("Можно загрузить не более 10 фотографий");
      return;
    }
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Файл ${file.name} превышает 10MB`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        alert(`Файл ${file.name} не является изображением`);
        return false;
      }
      return true;
    });
    setImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const renderCategoryOptions = (cats: CategoryItem[], level = 0): JSX.Element[] => {
    // Добавляем проверку, что cats - массив
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
    if (images.length === 0) {
      alert("Добавьте хотя бы одну фотографию товара");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", productForm.title);
      formData.append("description", productForm.description);
      formData.append("price", productForm.price);
      formData.append("category", productForm.category);
      formData.append("technique", productForm.technique);
      formData.append("size", productForm.size);
      formData.append("care_instructions", productForm.care_instructions);
      formData.append("color", productForm.color);
      if (productForm.yarn_id === "custom") {
        formData.append("custom_yarn", productForm.custom_yarn);
      } else if (productForm.yarn_id) {
        formData.append("yarn_id", productForm.yarn_id);
      }
      images.forEach(image => formData.append("images", image));
      const response = await fetch("/api/master/products", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to create product");
      alert("Товар успешно создан и отправлен на модерацию");
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Ошибка при создании товара");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setProductForm({
      title: "", description: "", price: "", category: "", technique: "",
      size: "", care_instructions: "", yarn_id: "", custom_yarn: "", color: "",
    });
    setImages([]);
    setImagePreviews([]);
  };

  // Добавляем проверку перед рендером
  if (!isOpen) return null;
  
  // Проверяем, что categories - массив
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
            Добавить товар
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Фото */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Добавьте фото (до 10 шт.) *</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-orange transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={fileInputRef} />
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-500">Нажмите для выбора файлов</span>
                <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
              </div>
            </div>
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-4 gap-3">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                      <Image width={160} height={160} src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                      {idx === 0 && <div className="absolute bottom-1 left-1 bg-firm-orange text-white text-xs px-1.5 py-0.5 rounded">Главное</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Название товара *</label>
              <input type="text" name="title" value={productForm.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Категория *</label>
              <select name="category" value={productForm.category} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink">
                <option value="">Выберите категорию</option>
                {renderCategoryOptions(safeCategories)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Название пряжи</label>
              <select name="yarn_id" value={productForm.yarn_id} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange">
                <option value="">Выберите пряжу</option>
                {Array.isArray(yarns) && yarns.map(yarn => <option key={yarn.id} value={yarn.id}>{yarn.name} - {yarn.brand}</option>)}
                <option value="custom">Другая пряжа (указать вручную)</option>
              </select>
              {productForm.yarn_id === "custom" && (
                <input type="text" name="custom_yarn" value={productForm.custom_yarn} onChange={handleInputChange} placeholder="Укажите название пряжи" className="w-full mt-2 p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" />
              )}
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Техника вязки</label>
              <select name="technique" value={productForm.technique} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange">
                <option value="">Выберите технику</option>
                {techniques.map(tech => <option key={tech} value={tech}>{tech}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Описание</label>
            <textarea name="description" value={productForm.description} onChange={handleInputChange} rows={4} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Цвет</label>
              <input type="text" name="color" value={productForm.color} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Уход</label>
              <input type="text" name="care_instructions" value={productForm.care_instructions} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Размер</label>
            <div className="flex flex-wrap gap-3">
              {sizes.map(size => (
                <label key={size} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="size" value={size} checked={productForm.size === size} onChange={handleInputChange} className="w-4 h-4 accent-firm-orange" />
                  <span className="text-sm">{size}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Цена *</label>
            <div className="relative">
              <input type="number" name="price" value={productForm.price} onChange={handleInputChange} required min="0" step="100" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-medium disabled:opacity-50">
              {saving ? "Сохранение..." : "Опубликовать товар"}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50">Отмена</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}