"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { CameraIcon } from "@/components/icons/CameraIcon";
import { BlogIcon } from "@/components/icons/BlogIcon";

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

const blogTags = ["Мастер-класс", "Обзор пряжи", "Новая коллекция", "Советы", "Вдохновение", "История создания", "Техника вязания", "Новости"];

// Функция сжатия изображения
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

export default function AddPostModal({ isOpen, onClose, onSuccess, session }: AddPostModalProps) {
  const [saving, setSaving] = useState(false);
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const [postForm, setPostForm] = useState({ title: "", content: "", excerpt: "", category: "", tags: "" });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPostForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (postImages.length + files.length > 10) {
      toast.error("Можно загрузить не более 10 фотографий");
      return;
    }

    // Сжимаем каждый файл и создаём превью
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
        
        // Создаём превью
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

    setPostImages(prev => [...prev, ...compressedFiles]);
    setPostImagePreviews(prev => [...prev, ...previews]);
  };

  const removePostImage = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
    setPostImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title) {
      toast.error("Введите заголовок поста");
      return;
    }
    if (!postForm.content) {
      toast.error("Введите содержание поста");
      return;
    }
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
      
      toast.success("Пост успешно создан!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при создании поста");
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-main rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-main border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl bg-linear-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent flex items-center gap-2">
            <BlogIcon className="w-5 h-5 sm:w-6 sm:h-6" color="#4B5563" />
            Новая запись в блоге
          </h2>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition">
            <CloseIcon className="w-5 h-5" color="#737682" />
          </motion.button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div>
            <label className="block text-text mb-2 text-sm font-['Montserrat_Alternates'] font-medium">Фотографии для поста</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-500 transition cursor-pointer bg-gray-50" onClick={() => postFileInputRef.current?.click()}>
              <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={postFileInputRef} />
              <CameraIcon className="w-10 h-10 mx-auto text-firm-gray mb-2" />
              <span className="text-firm-gray text-sm">Загрузить с устройства</span>
              <p className="text-xs text-firm-gray mt-1">PNG, JPG, WEBP до 10MB (изображения будут сжаты)</p>
            </div>
            
            {postImagePreviews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-4 gap-3">
                  {postImagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => removePostImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-firm-red text-main rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <CloseIcon className="w-3 h-3" color="#f9f9f9" />
                      </motion.button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Заголовок <span className="text-firm-red">*</span></label>
            <input type="text" name="title" value={postForm.title} onChange={handleInputChange} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm" placeholder="Введите заголовок поста" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Категория</label>
              <select name="category" value={postForm.category} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm">
                <option value="">Выберите категорию</option>
                {blogTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Теги</label>
              <select name="tags" value={postForm.tags} onChange={handleInputChange} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm">
                <option value="">Выберите тег</option>
                {blogTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Краткое описание (анонс)</label>
            <textarea name="excerpt" value={postForm.excerpt} onChange={handleInputChange} rows={2} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm resize-none" placeholder="Краткий анонс поста..." />
          </div>

          <div>
            <label className="block text-text mb-1.5 text-sm font-['Montserrat_Alternates'] font-medium">Содержание <span className="text-firm-red">*</span></label>
            <textarea name="content" value={postForm.content} onChange={handleInputChange} rows={10} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all text-sm resize-none" placeholder="Текст поста..." />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={saving} className="flex-1 py-3 bg-linear-to-r from-gray-600 to-gray-700 text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm sm:text-base">
              {saving ? "Публикация..." : "Опубликовать пост"}
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