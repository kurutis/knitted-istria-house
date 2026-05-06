// components/modals/AddClassModal.tsx
"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClassModal({ isOpen, onClose, onSuccess }: AddClassModalProps) {
  const [saving, setSaving] = useState(false);
  const [classImages, setClassImages] = useState<File[]>([]);
  const [classImagePreviews, setClassImagePreviews] = useState<string[]>([]);
  const classFileInputRef = useRef<HTMLInputElement>(null);
  const [classForm, setClassForm] = useState({
    title: "",
    description: "",
    type: "online",
    price: "",
    max_participants: "",
    date_time: "",
    duration_minutes: "",
    location: "",
    online_link: "",
    materials: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClassForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (classImages.length + files.length > 10) {
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
    setClassImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setClassImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeClassImage = (index: number) => {
    setClassImages(prev => prev.filter((_, i) => i !== index));
    setClassImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.title) { alert("Введите название мастер-класса"); return; }
    if (!classForm.description) { alert("Введите описание мастер-класса"); return; }
    if (!classForm.date_time) { alert("Укажите дату и время проведения"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", classForm.title);
      formData.append("description", classForm.description);
      formData.append("type", classForm.type);
      formData.append("price", classForm.price);
      formData.append("max_participants", classForm.max_participants);
      formData.append("date_time", classForm.date_time);
      formData.append("duration_minutes", classForm.duration_minutes);
      formData.append("location", classForm.location);
      formData.append("online_link", classForm.online_link);
      formData.append("materials", classForm.materials);
      if (classImages.length > 0) formData.append("image", classImages[0]);
      const response = await fetch("/api/master/master-classes", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to create master class");
      alert("Мастер-класс успешно создан!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Ошибка при создании мастер-класса");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setClassForm({
      title: "", description: "", type: "online", price: "", max_participants: "",
      date_time: "", duration_minutes: "", location: "", online_link: "", materials: "",
    });
    setClassImages([]);
    setClassImagePreviews([]);
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
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-pink to-purple-500 bg-clip-text text-transparent">
            Создать мастер-класс
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Анонсирующее изображение</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-pink transition cursor-pointer" onClick={() => classFileInputRef.current?.click()}>
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" ref={classFileInputRef} />
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-500">Загрузить изображение</span>
                <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
              </div>
            </div>
            {classImagePreviews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-4 gap-3">
                  {classImagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                      <Image width={160} height={160} src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeClassImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Название *</label>
              <input type="text" name="title" value={classForm.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Тип</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="radio" name="type" value="online" checked={classForm.type === "online"} onChange={handleInputChange} className="w-4 h-4 accent-firm-orange" /><span>Онлайн</span></label>
                <label className="flex items-center gap-2"><input type="radio" name="type" value="offline" checked={classForm.type === "offline"} onChange={handleInputChange} className="w-4 h-4 accent-firm-pink" /><span>Офлайн</span></label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Описание *</label>
            <textarea name="description" value={classForm.description} onChange={handleInputChange} rows={4} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-gray-700 mb-1 font-medium">Цена (₽)</label><input type="number" name="price" value={classForm.price} onChange={handleInputChange} min="0" step="100" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" /></div>
            <div><label className="block text-gray-700 mb-1 font-medium">Максимум участников</label><input type="number" name="max_participants" value={classForm.max_participants} onChange={handleInputChange} min="1" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-gray-700 mb-1 font-medium">Дата и время *</label><input type="datetime-local" name="date_time" value={classForm.date_time} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" /></div>
            <div><label className="block text-gray-700 mb-1 font-medium">Длительность (мин)</label><input type="number" name="duration_minutes" value={classForm.duration_minutes} onChange={handleInputChange} min="30" step="30" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" /></div>
          </div>

          {classForm.type === "offline" && (
            <div><label className="block text-gray-700 mb-1 font-medium">Место проведения</label><input type="text" name="location" value={classForm.location} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" /></div>
          )}

          {classForm.type === "online" && (
            <div><label className="block text-gray-700 mb-1 font-medium">Ссылка на трансляцию</label><input type="url" name="online_link" value={classForm.online_link} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" /></div>
          )}

          <div><label className="block text-gray-700 mb-1 font-medium">Необходимые материалы</label><textarea name="materials" value={classForm.materials} onChange={handleInputChange} rows={3} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink" /></div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-firm-pink to-purple-500 text-white rounded-xl font-medium disabled:opacity-50">
              {saving ? "Создание..." : "Создать мастер-класс"}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50">Отмена</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}