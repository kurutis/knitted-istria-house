"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { CalendarIcon } from "@/components/icons/CalendarIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";
import { LocateIcon } from "@/components/icons/LocateIcon";
import { OnlineIcon } from "@/components/icons/OnlineIcon";
import { PriceIcon } from "@/components/icons/PriceIcon";
import { UsersIcon } from "@/components/icons/UsersIcon";
import { EditIcon } from "@/components/icons/EditIcon";

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  masterClass: {
    id: string;
    title: string;
    description: string;
    type: string;
    price: number;
    max_participants: number;
    date_time: string;
    duration_minutes: number;
    location?: string;
    online_link?: string;
    materials?: string;
    image_url?: string;
  };
}

export default function EditClassModal({
  isOpen,
  onClose,
  onSuccess,
  masterClass,
}: EditClassModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({title: "", description: "", type: "online", price: "", max_participants: "", date_time: "", duration_minutes: "", location: "", online_link: "", materials: ""});

  useEffect(() => {if (masterClass) {setFormData({title: masterClass.title || "", description: masterClass.description || "", type: masterClass.type || "online", price: masterClass.price?.toString() || "", max_participants: masterClass.max_participants?.toString() || "", date_time: masterClass.date_time || "", duration_minutes: masterClass.duration_minutes?.toString() || "", location: masterClass.location || "", online_link: masterClass.online_link || "", materials: masterClass.materials || ""})}}, [masterClass]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Введите название мастер-класса");
      return;
    }
    if (!formData.description) {
      toast.error("Введите описание мастер-класса");
      return;
    }
    if (!formData.date_time) {
      toast.error("Укажите дату и время проведения");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/master/master-classes/${masterClass.id}`, {method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({title: formData.title, description: formData.description, type: formData.type, price: parseFloat(formData.price), max_participants: parseInt(formData.max_participants), date_time: formData.date_time, duration_minutes: parseInt(formData.duration_minutes), location: formData.location, online_link: formData.online_link, materials: formData.materials})});

      if (!response.ok) throw new Error("Failed to update master class");

      toast.success("Мастер-класс успешно обновлен");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при обновлении мастер-класса");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-main rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-main border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent flex items-center gap-2"><EditIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#F4A67F" />Редактировать мастер-класс</h2>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition"><CloseIcon className="w-5 h-5" color="#737682" /></motion.button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Название <span className="text-firm-red">*</span></label>
              <input type="text" name="title" value={formData.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Название мастер-класса" />
            </div>
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Тип</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="online" checked={formData.type === "online"} onChange={handleInputChange} className="w-4 h-4 accent-firm-orange" />
                  <OnlineIcon className="w-4 h-4" color="#737682" />
                  <span className="text-sm text-text">Онлайн</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="offline" checked={formData.type === "offline"} onChange={handleInputChange} className="w-4 h-4 accent-firm-pink" />
                  <LocateIcon className="w-4 h-4" color="#737682" />
                  <span className="text-sm text-text">Офлайн</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Описание <span className="text-firm-red">*</span></label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm resize-none" placeholder="Подробное описание мастер-класса..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><PriceIcon className="w-4 h-4" color="#737682" />Цена (₽)</label>
              <input type="number" name="price" value={formData.price} onChange={handleInputChange} min="0" step="100" className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="0" />
            </div>
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><UsersIcon className="w-4 h-4" color="#737682" />Максимум участников</label>
              <input type="number" name="max_participants" value={formData.max_participants} onChange={handleInputChange} min="1" className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="10" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><CalendarIcon className="w-4 h-4" color="#737682" />Дата и время <span className="text-firm-red">*</span></label>
              <input type="datetime-local" name="date_time" value={formData.date_time} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" />
            </div>
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><ClockIcon className="w-4 h-4" color="#737682" />Длительность (мин)</label>
              <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange} min="30" step="30" className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="60" />
            </div>
          </div>

          {formData.type === "offline" && (
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><LocateIcon className="w-4 h-4" color="#737682" />Место проведения</label>
              <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Адрес проведения" />
            </div>
          )}

          {formData.type === "online" && (
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><OnlineIcon className="w-4 h-4" color="#737682" />Ссылка на трансляцию</label>
              <input type="url" name="online_link" value={formData.online_link} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="https://..." />
            </div>
          )}

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Необходимые материалы</label>
            <textarea name="materials" value={formData.materials} onChange={handleInputChange} rows={3} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm resize-none" placeholder="Список материалов, которые понадобятся участникам..." />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="flex-1 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm sm:text-base">{saving ? "Сохранение..." : "Сохранить изменения"}</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 text-sm sm:text-base text-text">Отмена</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}