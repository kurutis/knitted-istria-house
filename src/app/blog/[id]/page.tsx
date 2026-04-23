"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import MediaGallery from "@/components/blog/MediaGallery";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  main_image_url: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  master_id: string;
  master_name: string;
  master_avatar: string;
  is_liked: boolean;
  is_author?: boolean;
  comments: Comment[];
  images?: Array<{ id: string; url: string; sort_order: number }>;
}

export default function BlogPostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);

  const isAuthor = session?.user?.id === post?.master_id;
  const blogTags = [
    "Мастер-класс",
    "Обзор пряжи",
    "Новая коллекция",
    "Советы",
    "Вдохновение",
    "История создания",
    "Техника вязания",
    "Новости",
  ];

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blog/posts/${id}`);
      if (!response.ok) throw new Error("Пост не найден");
      const data = await response.json();
      setPost(data);
      setEditForm({
        title: data.title,
        content: data.content,
        category: data.category || "",
        tags: data.tags?.join(", ") || "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/blog/${id}`);
      return;
    }

    try {
      const response = await fetch(`/api/blog/posts/${id}/like`, {
        method: post?.is_liked ? "DELETE" : "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setPost((prev) =>
          prev
            ? {
                ...prev,
                is_liked: data.is_liked,
                likes_count: data.likes_count,
              }
            : null,
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    setUpdatingComment(true);
    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingCommentText }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map((c) =>
                  c.id === commentId
                    ? { ...c, content: updatedComment.content }
                    : c,
                ),
              }
            : null,
        );
        setEditingCommentId(null);
        setEditingCommentText("");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при обновлении комментария");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Ошибка при обновлении комментария");
    } finally {
      setUpdatingComment(false);
    }
  };

  const handleComment = async () => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/blog/${id}`);
      return;
    }

    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      const response = await fetch(`/api/blog/posts/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments: [newComment, ...(prev.comments || [])],
                comments_count: prev.comments_count + 1,
              }
            : null,
        );
        setCommentText("");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Удалить комментарий?")) return;

    setDeletingCommentId(commentId);
    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.filter((c) => c.id !== commentId),
                comments_count: prev.comments_count - 1,
              }
            : null,
        );
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Ошибка при удалении комментария");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/blog/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          content: editForm.content,
          category: editForm.category,
          tags: editForm.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setIsEditing(false);
        alert("Пост обновлен");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при обновлении");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Ошибка при обновлении поста");
    }
  };

  const handleDeletePost = async () => {
    if (
      !confirm(
        "Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.",
      )
    )
      return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/blog/posts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/blog");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Ошибка при удалении поста");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60);

    if (diff < 1) return "только что";
    if (diff < 24) return `${diff} ч назад`;
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка...
          </p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Пост не найден"}</p>
          <Link
            href="/blog"
            className="px-6 py-3 bg-firm-orange text-white rounded-lg"
          >
            Вернуться в блог
          </Link>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl mb-6">
          Редактирование поста
        </h1>

        <form onSubmit={handleUpdatePost} className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
              Заголовок <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, title: e.target.value }))
              }
              required
              className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
              Категория
            </label>
            <select
              value={editForm.category}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
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
            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
              Теги (через запятую)
            </label>
            <input
              type="text"
              value={editForm.tags}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, tags: e.target.value }))
              }
              className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
              placeholder="Мастер-класс, Советы, Обзор"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
              Содержание <span className="text-red-500">*</span>
            </label>
            <textarea
              value={editForm.content}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, content: e.target.value }))
              }
              rows={15}
              required
              className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Хлебные крошки */}
      <div className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-firm-orange">
          Главная
        </Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-firm-orange">
          Блог
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{post.title}</span>
      </div>

      {/* Кнопки управления для автора */}
      {isAuthor && (
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
          >
            ✏️ Редактировать
          </button>
          <button
            onClick={handleDeletePost}
            disabled={deleting}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
          >
            {deleting ? "Удаление..." : "🗑️ Удалить"}
          </button>
        </div>
      )}

      {/* Автор и дата */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/masters/${post.master_id}`}
          className="flex items-center gap-3 hover:opacity-80"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
            {post.master_avatar ? (
              <img
                src={post.master_avatar}
                alt={post.master_name}
                className="w-full h-full object-cover"
              />
            ) : (
              post.master_name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-semibold text-lg">{post.master_name}</p>
            <p className="text-sm text-gray-400">
              {formatDate(post.created_at)}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {post.views_count}
          </span>
          {isAuthor && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
              ✏️ Ваш пост
            </span>
          )}
        </div>
      </div>

      {/* Категория и теги */}
      <div className="flex flex-wrap gap-2 mb-4">
        {post.category && (
          <span className="px-2 py-1 bg-firm-orange bg-opacity-10 text-firm-orange rounded-full text-sm">
            {post.category}
          </span>
        )}
        {post.tags?.map((tag, idx) => (
          <span
            key={idx}
            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Заголовок */}
      <h1 className="font-['Montserrat_Alternates'] font-bold text-4xl mb-6">
        {post.title}
      </h1>

      {/* Изображения */}
      {(post.images?.length > 0 || post.main_image_url) && (
        <div className="mb-8">
          <MediaGallery
            images={
              post.images || [
                { id: "main", url: post.main_image_url, sort_order: 0 },
              ]
            }
            video={null}
            title={post.title}
          />
        </div>
      )}

      {/* Содержание */}
      <div className="prose max-w-none mb-8 break-words">
        <div className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </div>
      </div>

      {/* Кнопки лайка и комментариев */}
      <div className="flex items-center gap-6 py-4 border-t border-b border-gray-200 mb-8">
        <AnimatedButton
          icon={
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill={post.is_liked ? "#D97C8E" : "none"}
              stroke={post.is_liked ? "#D97C8E" : "#9CA3AF"}
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          }
          count={post.likes_count}
          isActive={post.is_liked}
          onClick={handleLike}
          activeColor="text-firm-pink"
        />

        <div className="flex items-center gap-2">
          <svg
            className="w-7 h-7 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-gray-600">
            {post.comments_count} комментариев
          </span>
        </div>
      </div>

      {/* Комментарии */}
      <div>
        <h3 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">
          Комментарии ({post.comments_count})
        </h3>

        {/* Форма добавления комментария */}
        {session ? (
          <div className="flex gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold flex-shrink-0">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать комментарий..."
                rows={3}
                className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-orange resize-none"
              />
              <button
                onClick={handleComment}
                disabled={commentLoading || !commentText.trim()}
                className="mt-2 px-5 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
              >
                {commentLoading ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center mb-8">
            <p className="text-gray-500 mb-3">
              Чтобы оставить комментарий, необходимо авторизоваться
            </p>
            <Link
              href={`/auth/signin?callbackUrl=/blog/${id}`}
              className="inline-block px-5 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
            >
              Войти
            </Link>
          </div>
        )}

        {/* Список комментариев */}
        <div className="space-y-6">
          {post.comments?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Будьте первым, кто оставит комментарий
            </p>
          ) : (
            post.comments?.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {comment.author_avatar ? (
                    <img
                      src={comment.author_avatar}
                      alt={comment.author_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    comment.author_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">
                          {comment.author_name}
                          <span className="text-xs text-gray-400 ml-2 font-normal">
                            {formatDate(comment.created_at)}
                          </span>
                        </p>
                      </div>

                      {/* Кнопки для автора комментария */}
                      {session?.user?.id === comment.author_id && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          {editingCommentId === comment.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateComment(comment.id)}
                                disabled={updatingComment}
                                className="text-xs text-green-600 hover:text-green-700"
                              >
                                {updatingComment ? "..." : "Сохранить"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText("");
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Отмена
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.content);
                                }}
                                className="text-xs text-blue-500 hover:text-blue-700"
                              >
                                Редактировать
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={deletingCommentId === comment.id}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Удалить
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Кнопка удаления для автора поста (чужой комментарий) */}
                      {isAuthor && session?.user?.id !== comment.author_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingCommentId === comment.id}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition"
                        >
                          Удалить
                        </button>
                      )}
                    </div>

                    {editingCommentId === comment.id ? (
                      <textarea
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className="w-full p-2 rounded-lg bg-white border border-gray-200 outline-firm-orange text-sm"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <p className="text-gray-700">{comment.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
