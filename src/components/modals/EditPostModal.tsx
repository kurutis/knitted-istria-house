"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { CatalogPinkIcon } from "@/components/icons/CatalogPinkIcon";
import { TagIcon } from "@/components/icons/TagIcon";

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post: {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    category: string;
    tags: string;
    main_image_url?: string;
    images?: Array<{ id: string; image_url: string; sort_order: number }>;
  };
}

const blogTags = ["Мастер-класс", "Обзор пряжи", "Новая коллекция", "Советы", "Вдохновение", "История создания", "Техника вязания", "Новости"];

export default function EditPostModal({isOpen, onClose, onSuccess, post}: EditPostModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({title: "", content: "", excerpt: "", category: "", tags: ""});

  useEffect(() => {if (post) { setFormData({ title: post.title || "", content: post.content || "", excerpt: post.excerpt || "", category: post.category || "", tags: post.tags || ""})}}, [post]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Введите заголовок поста");
      return;
    }
    if (!formData.content) {
      toast.error("Введите содержание поста");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/master/blog/${post.id}`, {method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({title: formData.title, content: formData.content, excerpt: formData.excerpt, category: formData.category, tags: formData.tags})});

      if (!response.ok) throw new Error("Failed to update post");

      toast.success("Пост успешно обновлен");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при обновлении поста");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-main rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-main border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl bg-linear-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent flex items-center gap-2"><EditIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#4B5563" />Редактировать пост</h2>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition"><CloseIcon className="w-5 h-5" color="#737682" /></motion.button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Заголовок <span className="text-firm-red">*</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm" placeholder="Введите заголовок поста" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><CatalogPinkIcon className="w-4 h-4" color="#737682" />Категория</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm">
                <option value="">Выберите категорию</option>
                {blogTags.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
              </select>
            </div>
            <div>
              <label className="text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium flex items-center gap-2"><TagIcon className="w-4 h-4" color="#737682" />Теги</label>
              <select name="tags" value={formData.tags} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm">
                <option value="">Выберите тег</option>
                {blogTags.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Краткое описание (анонс)</label>
            <textarea name="excerpt" value={formData.excerpt} onChange={handleInputChange} rows={2} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm resize-none" placeholder="Краткий анонс поста..." />
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Содержание <span className="text-firm-red">*</span></label>
            <textarea name="content" value={formData.content} onChange={handleInputChange} rows={10} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm resize-none" placeholder="Текст поста..." />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="flex-1 py-3 bg-linear-to-r from-gray-600 to-gray-700 text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm sm:text-base">{saving ? "Сохранение..." : "Сохранить изменения"}</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 text-sm sm:text-base text-text">Отмена</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}