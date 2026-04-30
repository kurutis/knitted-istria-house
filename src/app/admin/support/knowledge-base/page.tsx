"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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
    if (!session || session.user?.role !== "admin") {
      router.push("/auth/signin");
      return;
    }
    loadData();
  }, [session, status, router]);

  useEffect(() => {
    loadArticles();
  }, [selectedCategory, searchQuery]);

  const loadData = async () => {await Promise.all([loadCategories(), loadArticles()])};

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/admin/support/knowledge-base/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
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
      setArticles(data);
    } catch (error) {
      console.error("Error loading articles:", error);
    }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const tagsArray = articleForm.tags.split(",").map((tag) => tag.trim()).filter((tag) => tag);
      const url = editingArticle ? `/api/admin/support/knowledge-base/articles/${editingArticle.id}` : "/api/admin/support/knowledge-base/articles";
      const response = await fetch(url, {method: editingArticle ? "PUT" : "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({...articleForm, tags: tagsArray})});

      if (response.ok) {
        setShowArticleModal(false);
        resetArticleForm();
        loadArticles();
        alert(editingArticle ? "Статья обновлена" : "Статья создана");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка сохранения");
      }
    } catch (error) {
      alert("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/admin/support/knowledge-base/categories", {method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(categoryForm)});

      if (response.ok) {
        setShowCategoryModal(false);
        setCategoryForm({ name: "", slug: "", description: "" });
        loadCategories();
        alert("Категория создана");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка создания категории");
      }
    } catch (error) {
      alert("Ошибка при создании категории");
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (id: number) => {
    if (!confirm("Удалить статью?")) return;

    try {
      const response = await fetch(`/api/admin/support/knowledge-base/articles/${id}`, {method: "DELETE"});

      if (response.ok) {
        loadArticles();
        alert("Статья удалена");
      }
    } catch (error) {
      alert("Ошибка удаления");
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Удалить категорию? Все статьи в ней будут перемещены в "Общее".')) return;

    try {
      const response = await fetch(`/api/admin/support/knowledge-base/categories/${id}`, {method: "DELETE"});

      if (response.ok) {
        loadCategories();
        if (selectedCategory !== "all") loadArticles();
        alert("Категория удалена");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка удаления");
      }
    } catch (error) {
      alert("Ошибка удаления");
    }
  };

  const resetArticleForm = () => {
    setArticleForm({title: "",  content: "", category: "", tags: "", is_published: true});
    setEditingArticle(null);
  };

  const editArticle = (article: Article) => {
    setEditingArticle(article);
    setArticleForm({title: article.title, content: article.content, category: article.category, tags: article.tags.join(", "), is_published: article.is_published});
    setShowArticleModal(true);
  };

  const togglePublish = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/support/knowledge-base/articles/${id}/publish`, {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ is_published: !currentStatus })});

      if (response.ok) {
        loadArticles();
      }
    } catch (error) {
      alert("Ошибка изменения статуса");
    }
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка базы знаний...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">База знаний</h1>
          <p className="text-gray-500 mt-1">Управление статьями поддержки</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">+ Новая категория</button>
          <button onClick={() => {resetArticleForm(); setShowArticleModal(true)}} className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition">+ Новая статья</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input type="text" placeholder="Поиск статей..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-firm-orange" />
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-firm-orange">
            <option value="all">Все категории</option>
            {categories.map((cat) => (<option key={cat.id} value={cat.slug}>{cat.name} ({cat.article_count})</option>))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-md p-4 flex-1 min-w-[200px]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                <p className="text-xs text-gray-400 mt-2">{category.article_count} статей</p>
              </div>
              <button onClick={() => deleteCategory(category.id)} className="text-red-500 hover:text-red-700 text-sm">🗑️</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">Название</th>
                <th className="text-left p-4">Категория</th>
                <th className="text-left p-4">Теги</th>
                <th className="text-left p-4">Просмотры</th>
                <th className="text-left p-4">Помогло</th>
                <th className="text-left p-4">Статус</th>
                <th className="text-left p-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-gray-500">Нет статей. Создайте первую статью!</td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(article.created_at).toLocaleDateString("ru-RU")}</p>
                      </div>
                    </td>
                    <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded-full text-xs">{article.category}</span></td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {article.tags.slice(0, 3).map((tag) => (<span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{tag}</span>))}
                        {article.tags.length > 3 && ( <span className="text-xs text-gray-400">+{article.tags.length - 3}</span>)}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{article.views}</td>
                    <td className="p-4">
                      <div className="flex gap-2 text-sm">
                        <span className="text-green-600">👍 {article.helpful_count}</span>
                        <span className="text-red-600">👎 {article.not_helpful_count}</span>
                      </div>
                    </td>
                    <td className="p-4"><button onClick={() => togglePublish(article.id, article.is_published)}  className={`px-2 py-1 rounded-full text-xs ${article.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{article.is_published ? "Опубликовано" : "Черновик"}</button></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => editArticle(article)} className="text-blue-500 hover:text-blue-700">✏️</button>
                        <button onClick={() => deleteArticle(article.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                        <Link href={`/support/knowledge-base/${article.id}`} target="_blank" className="text-gray-500 hover:text-gray-700">👁️</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showArticleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">{editingArticle ? "Редактировать статью" : "Новая статья"}</h2>
                <button onClick={() => {setShowArticleModal(false); resetArticleForm();}} className="text-gray-500 hover:text-gray-700 text-xl"> ✕</button>
              </div>
              <form onSubmit={handleArticleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1">Название *</label>
                  <input type="text" value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} required className="w-full p-2 rounded-lg bg-gray-100 outline-firm-orange" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Категория *</label>
                    <select value={articleForm.category} onChange={(e) => setArticleForm({...articleForm, category: e.target.value,  })} required className="w-full p-2 rounded-lg bg-gray-100 outline-firm-orange">
                      <option value="">Выберите категорию</option>
                      {categories.map((cat) => (<option key={cat.id} value={cat.slug}>{cat.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Теги (через запятую)</label>
                    <input type="text"  value={articleForm.tags} onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })} placeholder="например: оплата, доставка, возврат" className="w-full p-2 rounded-lg bg-gray-100 outline-firm-orange" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Содержание *</label>
                  <textarea value={articleForm.content} onChange={(e) => setArticleForm({...articleForm, content: e.target.value})} required rows={12} className="w-full p-2 rounded-lg bg-gray-100 outline-firm-orange font-mono text-sm" placeholder="Подробное описание решения проблемы..." />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={articleForm.is_published} onChange={(e) => setArticleForm({...articleForm, is_published: e.target.checked})} className="w-5 h-5 accent-firm-orange" />
                  <label className="text-gray-700">Опубликовать сразу</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">{saving ? "Сохранение..." : editingArticle ? "Обновить" : "Создать"}</button>
                  <button type="button" onClick={() => {setShowArticleModal(false); resetArticleForm()}} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Новая категория</h2>
                <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
              </div>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-1">Название *</label>
                  <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required className="w-full p-2 rounded-lg bg-gray-100 outline-firm-orange" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Slug (URL) *<span className="text-xs text-gray-500 ml-2"> на английском</span></label>
                  <input type="text" value={categoryForm.slug} onChange={(e) => setCategoryForm({...categoryForm, slug: e.target.value.toLowerCase().replace(/\s/g, "-"),})} required className="w-full p-2 rounded-lg bg-gray-100 outline-firm-orange" placeholder="naprimer: payment" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Описание</label>
                  <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value, }) } rows={3} className="w-full p-2 rounded-lg bg-gray-100 outline-firm-orange" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">{saving ? "Создание..." : "Создать"}</button>
                  <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
