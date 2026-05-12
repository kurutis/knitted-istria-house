"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (masterClass) {
      setFormData({
        title: masterClass.title || "",
        description: masterClass.description || "",
        type: masterClass.type || "online",
        price: masterClass.price.toString(),
        max_participants: masterClass.max_participants.toString(),
        date_time: masterClass.date_time || "",
        duration_minutes: masterClass.duration_minutes.toString(),
        location: masterClass.location || "",
        online_link: masterClass.online_link || "",
        materials: masterClass.materials || "",
      });
    }
  }, [masterClass]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert("Введите название мастер-класса");
      return;
    }
    if (!formData.description) {
      alert("Введите описание мастер-класса");
      return;
    }
    if (!formData.date_time) {
      alert("Укажите дату и время проведения");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/master/master-classes/${masterClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          price: parseFloat(formData.price),
          max_participants: parseInt(formData.max_participants),
          date_time: formData.date_time,
          duration_minutes: parseInt(formData.duration_minutes),
          location: formData.location,
          online_link: formData.online_link,
          materials: formData.materials,
        }),
      });

      if (!response.ok) throw new Error("Failed to update master class");

      alert("Мастер-класс успешно обновлен");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Ошибка при обновлении мастер-класса");
    } finally {
      setSaving(false);
    }
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
            Редактировать мастер-класс
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Название *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Тип</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="online"
                    checked={formData.type === "online"}
                    onChange={handleInputChange}
                    className="w-4 h-4 accent-firm-orange"
                  />
                  <span>Онлайн</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="offline"
                    checked={formData.type === "offline"}
                    onChange={handleInputChange}
                    className="w-4 h-4 accent-firm-pink"
                  />
                  <span>Офлайн</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Описание *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              required
              className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Цена (₽)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="100"
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Максимум участников
              </label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleInputChange}
                min="1"
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Дата и время *
              </label>
              <input
                type="datetime-local"
                name="date_time"
                value={formData.date_time}
                onChange={handleInputChange}
                required
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Длительность (мин)
              </label>
              <input
                type="number"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleInputChange}
                min="30"
                step="30"
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              />
            </div>
          </div>

          {formData.type === "offline" && (
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Место проведения
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              />
            </div>
          )}

          {formData.type === "online" && (
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Ссылка на трансляцию
              </label>
              <input
                type="url"
                name="online_link"
                value={formData.online_link}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Необходимые материалы
            </label>
            <textarea
              name="materials"
              value={formData.materials}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-firm-pink to-purple-500 text-white rounded-xl font-medium disabled:opacity-50"
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