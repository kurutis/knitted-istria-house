"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { RefreshIcon } from "@/components/icons/RefreshIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { ViewsIcon } from "@/components/icons/ViewsIcon";
import { LikeIcon } from "@/components/icons/LikeIcon";
import { DislikeIcon } from "@/components/icons/DislikeIcon";
import { SaveIcon } from "@/components/icons/SaveIcon";
import { TagIcon } from "@/components/icons/TagIcon";
import { CalendarIcon } from "@/components/icons/CalendarIcon";

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author_id: number;
  author_name: string;
  views: number;
  helpful_count: number;
  not_helpful_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  article_count: number;
}

export default function KnowledgeBasePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);
  const [articleForm, setArticleForm] = useState({title: "", content: "", category: "", tags: "", is_published: true});
  const [categoryForm, setCategoryForm] = useState({name: "", slug: "", description: ""});

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== 'admin') {
      router.push("/auth/signin");
      return;
    }
    loadData();
  }, [session, status, router]);

  useEffect(() => {
    loadArticles();
  }, [selectedCategory, searchQuery]);

  const loadData = async () => {
    await Promise.all([loadCategories(), loadArticles()]);
  };

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/admin/support/knowledge-base/categories");
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Ошибка загрузки категорий");
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/admin/support/knowledge-base/articles?${params}`);
      const data = await response.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading articles:", error);
      toast.error("Ошибка загрузки статей");
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const tagsArray = articleForm.tags.split(",").map((tag) => tag.trim()).filter((tag) => tag);
      const url = editingArticle ? `/api/admin/support/knowledge-base/articles/${editingArticle.id}` : "/api/admin/support/knowledge-base/articles";
      const response = await fetch(url, {
        method: editingArticle ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...articleForm, tags: tagsArray})
      });

      if (response.ok) {
        setShowArticleModal(false);
        resetArticleForm();
        loadArticles();
        toast.success(editingArticle ? "Статья обновлена" : "Статья создана");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка сохранения");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/admin/support/knowledge-base/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm)
      });

      if (response.ok) {
        setShowCategoryModal(false);
        setCategoryForm({ name: "", slug: "", description: "" });
        loadCategories();
        toast.success("Категория создана");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка создания категории");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при создании категории");
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (id: number) => {
    if (!confirm("Удалить статью?")) return;

    try {
      const response = await fetch(`/api/admin/support/knowledge-base/articles/${id}`, { method: "DELETE" });

      if (response.ok) {
        loadArticles();
        toast.success("Статья удалена");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка удаления");
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Удалить категорию? Все статьи в ней будут перемещены в "Общее".')) return;

    try {
      const response = await fetch(`/api/admin/support/knowledge-base/categories/${id}`, { method: "DELETE" });

      if (response.ok) {
        loadCategories();
        if (selectedCategory !== "all") loadArticles();
        toast.success("Категория удалена");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка удаления");
    }
  };

  const resetArticleForm = () => {
    setArticleForm({title: "", content: "", category: "", tags: "", is_published: true});
    setEditingArticle(null);
  };

  const editArticle = (article: Article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags.join(", "),
      is_published: article.is_published
    });
    setShowArticleModal(true);
  };

  const togglePublish = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/support/knowledge-base/articles/${id}/publish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !currentStatus })
      });

      if (response.ok) {
        loadArticles();
        toast.success(currentStatus ? "Статья снята с публикации" : "Статья опубликована");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка изменения статуса");
      }
    } catch (error) {
      console.error(error);
      toast.error("Ошибка изменения статуса");
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[60vh] bg-main"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
          />
          <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray flex items-center justify-center gap-2">
            <RefreshIcon size={18} color="#737682" className="animate-spin" />
            Загрузка базы знаний...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-main min-h-screen">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
            База знаний
          </h1>
          <p className="text-firm-gray text-sm mt-1">Управление статьями поддержки</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-firm-gray text-white rounded-xl hover:bg-opacity-80 transition flex items-center gap-2"
          >
            <SaveIcon size={18} color="#ffffff" />
            Новая категория
          </button>
          <button
            onClick={() => { resetArticleForm(); setShowArticleModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
          >
            <PlusIcon size={18} color="#ffffff" />
            Новая статья
          </button>
        </div>
      </div>

      {/* Поиск и фильтр */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon size={18} color="#737682" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск статей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-forms text-text rounded-xl focus:outline-none focus:ring-2 focus:ring-firm-orange"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-forms text-text rounded-xl focus:outline-none focus:ring-2 focus:ring-firm-pink cursor-pointer"
          >
            <option value="all">Все категории</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name} ({cat.article_count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Категории */}
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-2xl shadow-md p-4 flex-1 min-w-[200px] hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <SaveIcon size={24} color="#D97C8E" />
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text">{category.name}</h3>
                </div>
                <p className="text-sm text-firm-gray mt-1 line-clamp-2">{category.description}</p>
                <p className="text-xs text-firm-gray mt-2 flex items-center gap-1">
                  <TagIcon size={12} color="#737682" />
                  {category.article_count} статей
                </p>
              </div>
              <button
                onClick={() => deleteCategory(category.id)}
                className="p-1 text-firm-gray hover:text-firm-red transition"
                title="Удалить категорию"
              >
                <DeleteIcon size={18} color="currentColor" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Таблица статей */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-forms border-b border-gray-200">
              <tr>
                <th className="text-left p-4 text-firm-gray font-['Montserrat_Alternates'] font-semibold">Название</th>
                <th className="text-left p-4 text-firm-gray font-['Montserrat_Alternates'] font-semibold hidden sm:table-cell">Категория</th>
                <th className="text-left p-4 text-firm-gray font-['Montserrat_Alternates'] font-semibold hidden md:table-cell">Теги</th>
                <th className="text-left p-4 text-firm-gray font-['Montserrat_Alternates'] font-semibold hidden lg:table-cell">Просмотры</th>
                <th className="text-left p-4 text-firm-gray font-['Montserrat_Alternates'] font-semibold">Помогло</th>
                <th className="text-left p-4 text-firm-gray font-['Montserrat_Alternates'] font-semibold hidden sm:table-cell">Статус</th>
                <th className="text-left p-4 text-firm-gray font-['Montserrat_Alternates'] font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-12 text-firm-gray">
                    <SaveIcon size={48} color="#737682" className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Нет статей</p>
                    <p className="text-sm mt-2">Создайте первую статью!</p>
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="border-b border-gray-100 hover:bg-forms transition-all duration-300">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-text">{article.title}</p>
                        <p className="text-xs text-firm-gray mt-1 flex items-center gap-1">
                          <CalendarIcon size={12} color="#737682" />
                          {new Date(article.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-2 py-1 bg-firm-pink/20 text-firm-pink rounded-xl text-xs font-medium">
                        {article.category}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {article.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-forms text-firm-gray rounded-full text-xs">
                            #{tag}
                          </span>
                        ))}
                        {article.tags.length > 2 && (
                          <span className="text-xs text-firm-gray">+{article.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-sm text-firm-gray flex items-center gap-1">
                        <ViewsIcon size={14} color="#737682" />
                        {article.views}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3 text-sm">
                        <span className="text-firm-green flex items-center gap-1">
                          <LikeIcon size={14} color="#94D06C" />
                          {article.helpful_count}
                        </span>
                        <span className="text-firm-red flex items-center gap-1">
                          <DislikeIcon size={14} color="#D77C7C" />
                          {article.not_helpful_count}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <button
                        onClick={() => togglePublish(article.id, article.is_published)}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                          article.is_published 
                            ? "bg-firm-green/20 text-firm-green" 
                            : "bg-forms text-firm-gray"
                        }`}
                      >
                        {article.is_published ? "Опубликовано" : "Черновик"}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editArticle(article)}
                          className="p-1 text-firm-gray hover:text-firm-orange transition"
                          title="Редактировать"
                        >
                          <EditIcon size={18} color="currentColor" />
                        </button>
                        <button
                          onClick={() => deleteArticle(article.id)}
                          className="p-1 text-firm-gray hover:text-firm-red transition"
                          title="Удалить"
                        >
                          <DeleteIcon size={18} color="currentColor" />
                        </button>
                        <Link
                          href={`/support/knowledge-base/${article.id}`}
                          target="_blank"
                          className="p-1 text-firm-gray hover:text-firm-pink transition"
                          title="Просмотреть"
                        >
                          <ViewsIcon size={18} color="currentColor" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно для статьи */}
      <AnimatePresence>
        {showArticleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowArticleModal(false); resetArticleForm(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                    {editingArticle ? "Редактировать статью" : "Новая статья"}
                  </h2>
                  <button
                    onClick={() => { setShowArticleModal(false); resetArticleForm(); }}
                    className="text-firm-gray hover:text-text transition-colors"
                  >
                    <CloseIcon size={24} color="#737682" />
                  </button>
                </div>
                <form onSubmit={handleArticleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-text mb-1 font-['Montserrat_Alternates']">Название *</label>
                    <input
                      type="text"
                      value={articleForm.title}
                      onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                      required
                      className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-text mb-1 font-['Montserrat_Alternates']">Категория *</label>
                      <select
                        value={articleForm.category}
                        onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                        required
                        className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink cursor-pointer"
                      >
                        <option value="">Выберите категорию</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-text mb-1 font-['Montserrat_Alternates']">Теги (через запятую)</label>
                      <input
                        type="text"
                        value={articleForm.tags}
                        onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })}
                        placeholder="например: оплата, доставка, возврат"
                        className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-text mb-1 font-['Montserrat_Alternates']">Содержание *</label>
                    <textarea
                      value={articleForm.content}
                      onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                      required
                      rows={12}
                      className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink font-mono text-sm"
                      placeholder="Подробное описание решения проблемы..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={articleForm.is_published}
                      onChange={(e) => setArticleForm({ ...articleForm, is_published: e.target.checked })}
                      className="w-5 h-5 rounded accent-firm-orange"
                    />
                    <label className="text-text">Опубликовать сразу</label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshIcon size={18} color="#ffffff" className="animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        editingArticle ? "Обновить" : "Создать"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowArticleModal(false); resetArticleForm(); }}
                      className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-forms transition-all duration-300 text-text"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно для категории */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                    Новая категория
                  </h2>
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="text-firm-gray hover:text-text transition-colors"
                  >
                    <CloseIcon size={24} color="#737682" />
                  </button>
                </div>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-text mb-1 font-['Montserrat_Alternates']">Название *</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                      className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-text mb-1 font-['Montserrat_Alternates']">
                      Slug (URL) * <span className="text-xs text-firm-gray ml-2">на английском</span>
                    </label>
                    <input
                      type="text"
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm({
                        ...categoryForm,
                        slug: e.target.value.toLowerCase().replace(/\s/g, "-")
                      })}
                      required
                      className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-pink"
                      placeholder="naprimer: payment"
                    />
                  </div>
                  <div>
                    <label className="block text-text mb-1 font-['Montserrat_Alternates']">Описание</label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      rows={3}
                      className="w-full p-3 rounded-xl bg-forms text-text outline-none focus:ring-2 focus:ring-firm-orange"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <RefreshIcon size={18} color="#ffffff" className="animate-spin" />
                          Создание...
                        </>
                      ) : (
                        <>
                          <PlusIcon size={18} color="#ffffff" />
                          Создать
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(false)}
                      className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-forms transition-all duration-300 text-text"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}