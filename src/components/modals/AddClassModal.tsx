"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { CameraIcon } from "@/components/icons/CameraIcon";
import { CalendarIcon } from "@/components/icons/CalendarIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";
import { LocateIcon } from "@/components/icons/LocateIcon";
import { OnlineIcon } from "@/components/icons/OnlineIcon";

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
  const [classForm, setClassForm] = useState({title: "", description: "", type: "online", price: "", max_participants: "", date_time: "", duration_minutes: "", location: "", online_link: "", materials: ""});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClassForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (classImages.length + files.length > 10) {
      toast.error("Можно загрузить не более 10 фотографий");
      return;
    }
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 10MB`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`Файл ${file.name} не является изображением`);
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
    if (!classForm.title) { 
      toast.error("Введите название мастер-класса"); 
      return; 
    }
    if (!classForm.description) { 
      toast.error("Введите описание мастер-класса"); 
      return; 
    }
    if (!classForm.date_time) { 
      toast.error("Укажите дату и время проведения"); 
      return; 
    }
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
      toast.success("Мастер-класс успешно создан!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при создании мастер-класса");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setClassForm({title: "", description: "", type: "online", price: "", max_participants: "", date_time: "", duration_minutes: "", location: "", online_link: "", materials: ""});
    setClassImages([]);
    setClassImagePreviews([]);
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-main rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-main border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Создать мастер-класс</h2>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition"><CloseIcon className="w-5 h-5" color="#737682" /></motion.button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div>
            <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates'] font-medium">Анонсирующее изображение</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-firm-orange transition cursor-pointer bg-gray-50" onClick={() => classFileInputRef.current?.click()}>
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" ref={classFileInputRef} />
              <CameraIcon className="w-10 h-10 mx-auto text-firm-gray mb-2" />
              <span className="text-firm-gray text-sm">Загрузить изображение</span>
              <p className="text-xs text-firm-gray mt-1">PNG, JPG, WEBP до 10MB</p>
            </div>
            
            {classImagePreviews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-4 gap-3">
                  {classImagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => removeClassImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-firm-red text-main rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><CloseIcon className="w-3 h-3" color="#f9f9f9" /></motion.button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Название <span className="text-firm-red">*</span></label>
              <input type="text" name="title" value={classForm.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Введите название" />
            </div>
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Тип</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="online" checked={classForm.type === "online"} onChange={handleInputChange} className="w-4 h-4 accent-firm-orange" />
                  <span className="text-sm text-text">Онлайн</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="offline" checked={classForm.type === "offline"} onChange={handleInputChange} className="w-4 h-4 accent-firm-pink" />
                  <span className="text-sm text-text">Офлайн</span></label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Описание <span className="text-firm-red">*</span></label>
            <textarea name="description" value={classForm.description} onChange={handleInputChange} rows={4} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm resize-none" placeholder="Опишите, что будет на мастер-классе..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Цена (₽)</label>
              <input type="number" name="price" value={classForm.price} onChange={handleInputChange} min="0" step="100" className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="0" />
            </div>
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Максимум участников</label>
              <input type="number" name="max_participants" value={classForm.max_participants} onChange={handleInputChange} min="1" className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="10" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Дата и время <span className="text-firm-red">*</span></label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-firm-gray" />
                <input type="datetime-local" name="date_time" value={classForm.date_time} onChange={handleInputChange} required className="w-full p-3 pl-10 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Длительность (мин)</label>
              <div className="relative">
                <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-firm-gray" />
                <input type="number" name="duration_minutes" value={classForm.duration_minutes} onChange={handleInputChange} min="30" step="30" className="w-full p-3 pl-10 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="60" />
              </div>
            </div>
          </div>

          {classForm.type === "offline" && (
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Место проведения</label>
              <div className="relative">
                <LocateIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-firm-gray" />
                <input type="text" name="location" value={classForm.location} onChange={handleInputChange} className="w-full p-3 pl-10 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Адрес проведения" />
              </div>
            </div>
          )}

          {classForm.type === "online" && (
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Ссылка на трансляцию</label>
              <div className="relative">
                <OnlineIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" color="#737682" />
                <input type="url" name="online_link" value={classForm.online_link} onChange={handleInputChange} className="w-full p-3 pl-10 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="https://..." />
              </div>
            </div>
          )}

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Необходимые материалы</label>
            <textarea name="materials" value={classForm.materials} onChange={handleInputChange} rows={3} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm resize-none" placeholder="Список материалов, которые понадобятся участникам..." />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="flex-1 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm sm:text-base">{saving ? "Создание..." : "Создать мастер-класс"}</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 text-sm sm:text-base text-text">Отмена</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}