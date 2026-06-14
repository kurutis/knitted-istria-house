"use client";

import React, { useState, useRef, JSX } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { CameraIcon } from "@/components/icons/CameraIcon";
import { ProductsIcon } from "@/components/icons/ProductsIcon";
import { CatalogPinkIcon } from "@/components/icons/CatalogPinkIcon";
import { PriceIcon } from "@/components/icons/PriceIcon";

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

const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Ошибка сжатия"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function AddProductModal({isOpen, onClose, onSuccess, categories, yarns}: AddProductModalProps) {
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const techniques = ["Лицевая гладь", "Изнаночная гладь", "Резинка", "Платочная вязка", "Косы", "Араны", "Жаккард", "Ленивый жаккард", "Патентная резинка", "Ажур", "Сетка", "Рис", "Путанка", "Бриошь", "Другое"];
  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Не применимо"];
  
  const [productForm, setProductForm] = useState({title: "", description: "", price: "", category: "", technique: "", size: "", care_instructions: "", yarn_id: "", custom_yarn: "", color: ""});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      toast.error("Можно загрузить не более 10 фотографий");
      return;
    }
    
    const compressedFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 10MB`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`Файл ${file.name} не является изображением`);
        continue;
      }

      try {
        // Сжимаем изображение
        const compressed = await compressImage(file, 1000, 0.75);
        compressedFiles.push(compressed);
        
        // Создаём превью из сжатого файла
        const reader = new FileReader();
        const previewPromise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressed);
        });
        previews.push(await previewPromise);
      } catch (error) {
        console.error("Ошибка сжатия:", error);
        toast.error(`Не удалось обработать ${file.name}`);
      }
    }

    setImages(prev => [...prev, ...compressedFiles]);
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const renderCategoryOptions = (cats: CategoryItem[], level = 0): JSX.Element[] => {
    if (!cats || !Array.isArray(cats)) {
      return [];
    }
    
    const options: JSX.Element[] = [];
    cats.forEach(cat => {
      const prefix = "—".repeat(level);
      options.push(<option key={cat.id} value={cat.name}>{prefix} {cat.name}</option>);
      if (cat.subcategories && Array.isArray(cat.subcategories) && cat.subcategories.length) {options.push(...renderCategoryOptions(cat.subcategories, level + 1))}
    });
    return options;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      toast.error("Добавьте хотя бы одну фотографию товара");
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
      toast.success("Товар успешно создан и отправлен на модерацию");
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при создании товара");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setProductForm({title: "", description: "", price: "", category: "", technique: "", size: "", care_instructions: "", yarn_id: "", custom_yarn: "", color: ""});
    setImages([]);
    setImagePreviews([]);
  };

  if (!isOpen) return null;
  
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-main rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-main border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent flex items-center gap-2">
            <ProductsIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#F4A67F" />
            Добавить товар
          </h2>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition">
            <CloseIcon className="w-5 h-5" color="#737682" />
          </motion.button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div>
            <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates'] font-medium">Фотографии товара (до 10 шт.) <span className="text-firm-red">*</span></label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-firm-orange transition cursor-pointer bg-gray-50" onClick={() => fileInputRef.current?.click()}>
              <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={fileInputRef} />
              <CameraIcon className="w-10 h-10 mx-auto text-firm-gray mb-2" />
              <span className="text-firm-gray text-sm">Нажмите для выбора файлов</span>
              <p className="text-xs text-firm-gray mt-1">PNG, JPG, WEBP до 10MB (изображения будут сжаты)</p>
            </div>
            
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-4 gap-3">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-firm-red text-main rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <CloseIcon className="w-3 h-3" color="#f9f9f9" />
                      </motion.button>
                      {idx === 0 && (<div className="absolute bottom-1 left-1 bg-linear-to-r from-firm-orange to-firm-pink text-main text-[10px] px-1.5 py-0.5 rounded">Главное</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Название товара <span className="text-firm-red">*</span></label>
              <input type="text" name="title" value={productForm.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Введите название" />
            </div>
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2">
                <CatalogPinkIcon className="w-4 h-4" color="#737682" />
                Категория <span className="text-firm-red">*</span>
              </label>
              <select name="category" value={productForm.category} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm">
                <option value="">Выберите категорию</option>
                {renderCategoryOptions(safeCategories)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Пряжа</label>
              <select name="yarn_id" value={productForm.yarn_id} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm">
                <option value="">Выберите пряжу</option>
                {Array.isArray(yarns) && yarns.map(yarn => (<option key={yarn.id} value={yarn.id}>{yarn.name} - {yarn.brand} </option>))}
                <option value="custom">Другая пряжа (указать вручную)</option>
              </select>
              {productForm.yarn_id === "custom" && (<input type="text" name="custom_yarn" value={productForm.custom_yarn} onChange={handleInputChange} placeholder="Укажите название пряжи" className="w-full mt-2 p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" />)}
            </div>
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Техника вязки</label>
              <select name="technique" value={productForm.technique} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm">
                <option value="">Выберите технику</option>
                {techniques.map(tech => <option key={tech} value={tech}>{tech}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Описание</label>
            <textarea name="description" value={productForm.description} onChange={handleInputChange} rows={4} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm resize-none" placeholder="Подробное описание товара..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Цвет</label>
              <input type="text" name="color" value={productForm.color} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Например, Серый" />
            </div>
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Уход</label>
              <input type="text" name="care_instructions" value={productForm.care_instructions} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" placeholder="Рекомендации по уходу" />
            </div>
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Размер</label>
            <div className="flex flex-wrap gap-3">
              {sizes.map(size => (
                <label key={size} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="size" value={size} checked={productForm.size === size} onChange={handleInputChange} className="w-4 h-4 accent-firm-orange" />
                  <span className="text-sm text-text">{size}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2">
              <PriceIcon className="w-4 h-4" color="#737682" />
              Цена <span className="text-firm-red">*</span>
            </label>
            <div className="relative">
              <input type="number" name="price" value={productForm.price} onChange={handleInputChange} required min="0" step="100" className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="0" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-firm-gray text-sm">₽</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="flex-1 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm sm:text-base">
              {saving ? "Сохранение..." : "Опубликовать товар"}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 text-sm sm:text-base text-text">
              Отмена
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}