"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

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

const blogTags = [
  "Мастер-класс", "Обзор пряжи", "Новая коллекция", "Советы",
  "Вдохновение", "История создания", "Техника вязания", "Новости",
];

export default function EditPostModal({
  isOpen,
  onClose,
  onSuccess,
  post,
}: EditPostModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    tags: "",
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || "",
        content: post.content || "",
        excerpt: post.excerpt || "",
        category: post.category || "",
        tags: post.tags || "",
      });
    }
  }, [post]);

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
      const response = await fetch(`/api/master/blog/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          category: formData.category,
          tags: formData.tags,
        }),
      });

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
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent">
            Редактировать пост
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Заголовок *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Категория
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">Выберите категорию</option>
                {blogTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">
                Теги
              </label>
              <select
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">Выберите тег</option>
                {blogTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Краткое описание (анонс)
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleInputChange}
              rows={2}
              className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="Краткий анонс поста..."
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">
              Содержание *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              rows={10}
              required
              className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-medium disabled:opacity-50"
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