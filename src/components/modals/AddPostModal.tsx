// components/modals/AddPostModal.tsx
"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface AddPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string;
    };
  } | null;
}

const blogTags = [
  "Мастер-класс", "Обзор пряжи", "Новая коллекция", "Советы",
  "Вдохновение", "История создания", "Техника вязания", "Новости",
];

export default function AddPostModal({ isOpen, onClose, onSuccess, session }: AddPostModalProps) {
  const [saving, setSaving] = useState(false);
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    tags: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPostForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (postImages.length + files.length > 10) {
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
    setPostImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPostImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePostImage = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
    setPostImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title) { alert("Введите заголовок поста"); return; }
    if (!postForm.content) { alert("Введите содержание поста"); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", postForm.title);
      formData.append("content", postForm.content);
      formData.append("excerpt", postForm.excerpt);
      formData.append("category", postForm.category);
      formData.append("tags", postForm.tags);
      postImages.forEach(image => formData.append("images", image));
      const response = await fetch("/api/master/blog", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to create post");
      alert("Пост успешно создан!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Ошибка при создании поста");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPostForm({ title: "", content: "", excerpt: "", category: "", tags: "" });
    setPostImages([]);
    setPostImagePreviews([]);
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
            Новая запись в блоге
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Добавьте фото</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-500 transition cursor-pointer" onClick={() => postFileInputRef.current?.click()}>
              <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={postFileInputRef} />
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-500">Загрузить с устройства</span>
                <span className="text-xs text-gray-400">PNG, JPG, WEBP до 10MB</span>
              </div>
            </div>
            {postImagePreviews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-4 gap-3">
                  {postImagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                      <Image width={160} height={160} src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removePostImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Заголовок *</label>
            <input type="text" name="title" value={postForm.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Категория</label>
              <select name="category" value={postForm.category} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500">
                <option value="">Выберите категорию</option>
                {blogTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-medium">Теги</label>
              <select name="tags" value={postForm.tags} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500">
                <option value="">Выберите тег</option>
                {blogTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Краткое описание (анонс)</label>
            <textarea name="excerpt" value={postForm.excerpt} onChange={handleInputChange} rows={2} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500" />
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Содержание *</label>
            <textarea name="content" value={postForm.content} onChange={handleInputChange} rows={10} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-gray-500" />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-medium disabled:opacity-50">
              {saving ? "Публикация..." : "Опубликовать пост"}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50">Отмена</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}