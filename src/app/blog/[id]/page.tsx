"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import MediaGallery from "@/components/blog/MediaGallery";
import ConfirmModal from "@/components/ui/ConfirmModal";

import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { PasswordIcon } from "@/components/icons/PasswordIcon";
import { LikeIcon } from "@/components/icons/LikeIcon";
import { CommentIcon } from "@/components/icons/CommentIcon";
import { ViewsIcon } from "@/components/icons/ViewsIcon";
import { CalendarIcon } from "@/components/icons/CalendarIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon";
import { SendIcon } from "@/components/icons/SendIcon";
import { ShareIcon } from "@/components/icons/ShareIcon";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
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
  master_avatar: string | null;
  is_liked: boolean;
  is_author?: boolean;
  comments?: Comment[];
  images?: Array<{ id: string; url: string; sort_order: number }>;
}

const UserAvatar = ({ name, avatarUrl, size = 48 }: { name?: string; avatarUrl?: string | null; size?: number }) => {
  const [avatarError, setAvatarError] = useState(false);

  const getProxiedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/api/proxy/avatar')) return url;
    return `/api/proxy/avatar?url=${encodeURIComponent(url)}`;
  };

  const getInitials = () => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    return "U";
  };

  if (avatarUrl && !avatarError) {
    return (
      <motion.img 
        src={getProxiedUrl(avatarUrl)} 
        alt={name || "Avatar"} 
        className="rounded-full object-cover ring-2 ring-white shadow-md"
        style={{ width: size, height: size }} 
        onError={() => setAvatarError(true)} 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring" }}
      />
    );
  }

  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring" }}
      className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold shadow-md" 
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials()}
    </motion.div>
  );
};

const CurrentUserAvatar = ({ size = 32 }: { size?: number }) => {
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMaster = session?.user?.role === "master";

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const loadCurrentUserProfile = async () => {
      try {
        if (isMaster) {
          const response = await fetch("/api/master/profile");
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.profile) {
              if (data.profile.avatar_url) setAvatarUrl(data.profile.avatar_url);
              if (data.profile.fullname && data.profile.fullname.trim()) {
                setUserName(data.profile.fullname);
              } else {
                const email = session.user?.email;
                if (email) setUserName(email.split('@')[0]);
                else setUserName("Мастер");
              }
            }
          }
        } else {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const data = await response.json();
            let avatar = null;
            let name = "";
            
            if (data.profile) {
              avatar = data.profile.avatar_url;
              name = data.profile.fullname || "";
            } else {
              avatar = data.avatar_url;
              name = data.full_name || data.fullname || "";
            }
            
            if (avatar) setAvatarUrl(avatar);
            if (name && name.trim()) {
              setUserName(name);
            } else {
              const email = session.user?.email;
              if (email) setUserName(email.split('@')[0]);
              else setUserName("Пользователь");
            }
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        const email = session.user?.email;
        if (email) setUserName(email.split('@')[0]);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUserProfile();
  }, [session, isMaster]);

  const getInitials = () => {
    if (loading) return "U";
    if (userName && userName.length > 0) return userName.charAt(0).toUpperCase();
    return "U";
  };

  if (loading) {
    return <div className="rounded-full bg-gray-200 animate-pulse" style={{ width: size, height: size }} />;
  }

  if (avatarUrl && !avatarError) {
    return (
      <motion.img 
        src={`/api/proxy/avatar?url=${encodeURIComponent(avatarUrl)}`} 
        alt={userName || "Profile"} 
        className="rounded-full object-cover ring-2 ring-firm-orange/30" 
        style={{ width: size, height: size }} 
        onError={() => setAvatarError(true)} 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring" }}
      />
    );
  }

  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring" }}
      className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold shadow-md" 
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials()}
    </motion.div>
  );
};

const LikeButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
  <motion.button 
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick} 
    className="flex items-center gap-1.5 transition-all duration-300"
  >
    <LikeIcon color={isActive ? "#D97C8E" : "#737682"} className="w-5 h-5 sm:w-6 sm:h-6" />
  </motion.button>
);

const CommentButton = ({ isActive, onClick, count }: { isActive: boolean; onClick: () => void; count: number }) => (
  <motion.button 
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick} 
    className="flex items-center gap-1.5 transition-all duration-300"
  >
    <CommentIcon color={isActive ? "#F4A67F" : "#737682"} className="w-5 h-5 sm:w-6 sm:h-6" />
    <span className={`text-xs sm:text-sm font-medium ${isActive ? 'text-firm-orange' : 'text-gray-500'}`}>
      {count}
    </span>
  </motion.button>
);

export default function BlogPostPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [showCommentsState, setShowCommentsState] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "", category: "", tags: "" });
  const [deleting, setDeleting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      setIsLiked(data.is_liked || false);
      setLikesCount(data.likes_count || 0);
      setComments(data.comments || []);
      setCommentsCount(data.comments_count || 0);
      setEditForm({title: data.title, content: data.content, category: data.category || "", tags: data.tags?.join(", ") || ""});
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/blog/${id}`);
      return;
    }

    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);

    try {
      const response = await fetch(`/api/blog/posts/${id}/like`, {method: isLiked ? "DELETE" : "POST"});

      if (!response.ok) {
        setIsLiked(isLiked);
        setLikesCount(likesCount);
      } else {
        const data = await response.json();
        setIsLiked(data.is_liked);
        setLikesCount(data.likes_count);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    setUpdatingComment(true);
    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {method: "PUT",  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editingCommentText })});

      if (response.ok) {
        const data = await response.json();
        const updatedComment = data.comment || data;
        
        setComments(comments.map((c) => c.id === commentId ? { ...c, content: updatedComment.content, updated_at: updatedComment.updated_at, is_edited: true } : c));
        setEditingCommentId(null);
        setEditingCommentText("");
        toast.success("Комментарий обновлен");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка при обновлении комментария");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Ошибка при обновлении комментария");
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
      const response = await fetch(`/api/blog/posts/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: commentText })});

      if (response.ok) {
        const data = await response.json();
        const newComment: Comment = { id: data.id, content: data.content, created_at: data.created_at, updated_at: data.created_at, is_edited: false, author_id: data.author_id, author_name: data.author_name, author_avatar: data.author_avatar};
        
        setComments([newComment, ...comments]);
        setCommentsCount(commentsCount + 1);
        setCommentText("");
        toast.success("Комментарий добавлен");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Ошибка при добавлении комментария");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление комментария',
      message: 'Вы уверены, что хотите удалить этот комментарий? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setDeletingCommentId(commentId);
        try {
          const response = await fetch(`/api/blog/comments/${commentId}`, { method: "DELETE" });

          if (response.ok) {
            setComments(comments.filter((c) => c.id !== commentId));
            setCommentsCount(commentsCount - 1);
            toast.success("Комментарий удален");
          }
        } catch (error) {
          console.error("Error deleting comment:", error);
          toast.error("Ошибка при удалении комментария");
        } finally {
          setDeletingCommentId(null);
        }
      }
    });
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/blog/posts/${id}`, {method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: editForm.title, content: editForm.content, category: editForm.category, tags: editForm.tags.split(",").map((t) => t.trim()).filter((t) => t)})});

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setIsEditing(false);
        toast.success("Пост обновлен");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка при обновлении");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Ошибка при обновлении поста");
    }
  };

  const handleDeletePost = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Удаление поста',
      message: 'Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setDeleting(true);
        try {
          const response = await fetch(`/api/blog/posts/${id}`, { method: "DELETE" });

          if (response.ok) {
            router.push("/blog");
          } else {
            const error = await response.json();
            toast.error(error.error || "Ошибка при удалении");
          }
        } catch (error) {
          console.error("Error deleting post:", error);
          toast.error("Ошибка при удалении поста");
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title, text: "Посмотрите этот пост в блоге!", url: url });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована в буфер обмена!");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

    if (diff < 1) return "только что";
    if (diff < 60) return `${diff} мин назад`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const blogTags = ["Мастер-класс", "Обзор пряжи", "Новая коллекция", "Советы", "Вдохновение", "История создания", "Техника вязания", "Новости"];
  const isAuthor = session?.user?.id === post?.master_id;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }} 
            className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" 
          />
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-500">Загрузка поста...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-firm-red mb-4">{error || "Пост не найден"}</p>
          <Link href="/blog" className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300">
            Вернуться в блог
          </Link>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 py-6 sm:py-8"
      >
        <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl mb-6 text-text">Редактирование поста</h1>

        <form onSubmit={handleUpdatePost} className="space-y-5">
          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium text-sm">Заголовок <span className="text-firm-red">*</span></label>
            <input type="text" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} required className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" />
          </div>

          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium text-sm">Категория</label>
            <select value={editForm.category} onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all">
              <option value="">Выберите категорию</option>
              {blogTags.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium text-sm">Теги (через запятую)</label>
            <input type="text" value={editForm.tags} onChange={(e) => setEditForm((prev) => ({ ...prev, tags: e.target.value }))} className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" placeholder="Мастер-класс, Советы, Обзор" />
          </div>

          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium text-sm">Содержание <span className="text-firm-red">*</span></label>
            <textarea value={editForm.content} onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))} rows={15} required className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all" />
          </div>

          <div className="flex gap-3 pt-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="px-6 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300"
            >
              Сохранить
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button" 
              onClick={() => setIsEditing(false)} 
              className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition-all duration-300"
            >
              Отмена
            </motion.button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Хлебные крошки */}
        <div className="text-xs sm:text-sm text-firm-gray mb-6">
          <Link href="/" className="hover:text-firm-orange transition-colors">Главная</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-firm-orange transition-colors">Блог</Link>
          <span className="mx-2">/</span>
          <span className="text-text truncate">{post.title}</span>
        </div>

        {/* Кнопки для автора */}
        {isAuthor && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end gap-3 mb-6"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(true)} 
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
              <EditIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" color="#FFFFFF" />
              <span className="hidden sm:inline">Редактировать</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeletePost} 
              disabled={deleting} 
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-firm-red text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
            >
              <DeleteIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" color="#FFFFFF" />
              <span className="hidden sm:inline">{deleting ? "Удаление..." : "Удалить"}</span>
            </motion.button>
          </motion.div>
        )}

        {/* Автор */}
        <Link href={`/masters/${post.master_id}`} className="flex items-center gap-3 sm:gap-4 group mb-6">
          <UserAvatar name={post.master_name} avatarUrl={post.master_avatar} size={isMobile ? 44 : 56} />
          <div>
            <p className="font-semibold text-text group-hover:text-firm-orange transition-colors text-sm sm:text-base">
              {post.master_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" color="#9CA3AF" />
              <p className="text-[10px] sm:text-xs text-gray-400">{formatDate(post.created_at)}</p>
            </div>
          </div>
        </Link>

        {/* Категории и теги */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.category && (
            <motion.span 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-2 py-1 bg-firm-orange/10 text-firm-orange rounded-full text-xs sm:text-sm"
            >
              {post.category}
            </motion.span>
          )}
          {post.tags?.map((tag, idx) => (
            <motion.span 
              key={idx}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs sm:text-sm"
            >
              #{tag}
            </motion.span>
          ))}
        </div>

        {/* Заголовок */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl md:text-4xl mb-6 text-text"
        >
          {post.title}
        </motion.h1>

        {/* Изображения */}
        {(post.images?.length || 0) > 0 || post.main_image_url ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <MediaGallery images={post.images || []} mainImageUrl={post.main_image_url} video={null} title={post.title} />
          </motion.div>
        ) : null}

        {/* Контент */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base prose prose-sm max-w-none">
            {post.content}
          </div>
        </motion.div>

        {/* Действия (лайки, комментарии, шаринг) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-4 sm:gap-6 py-4 border-t border-b border-gray-100 mb-8"
        >
          <div className="flex items-center gap-1">
            <LikeButton isActive={isLiked} onClick={handleLike} />
            <span className={`text-xs sm:text-sm font-medium ${isLiked ? 'text-firm-pink' : 'text-gray-500'}`}>
              {likesCount}
            </span>
          </div>

          <CommentButton 
            isActive={showCommentsState} 
            onClick={() => setShowCommentsState(!showCommentsState)} 
            count={commentsCount}
          />

          <div className="flex-1"></div>

          <div className="flex items-center gap-3 sm:gap-4">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare} 
              className="text-gray-400 hover:text-firm-orange transition-colors"
            >
              <ShareIcon className="w-5 h-5" color="#737682" />
            </motion.button>
            <div className="flex items-center gap-1.5">
              <ViewsIcon />
              <span className="text-xs sm:text-sm text-gray-500">{post.views_count}</span>
            </div>
          </div>
        </motion.div>

        {/* Комментарии */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg sm:text-xl mb-5 text-text">
            Комментарии ({commentsCount})
          </h3>

          {session ? (
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="hidden sm:block">
                <CurrentUserAvatar size={44} />
              </div>
              <div className="flex-1">
                <textarea 
                  value={commentText} 
                  onChange={(e) => setCommentText(e.target.value)} 
                  placeholder="Написать комментарий..." 
                  rows={isMobile ? 3 : 2} 
                  className="w-full p-3 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all duration-300 text-sm placeholder:text-gray-400 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleComment} 
                    disabled={commentLoading || !commentText.trim()} 
                    className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-xs sm:text-sm font-['Montserrat_Alternates'] font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {commentLoading ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full" 
                        />
                        <span>Отправка...</span>
                      </>
                    ) : (
                      <>
                        <SendIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#FFFFFF" />
                        <span>Отправить</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl p-6 text-center mb-8 border border-gray-100 shadow-sm"
            >
              <p className="text-gray-500 text-sm mb-3 flex items-center justify-center gap-2">
                <PasswordIcon color="#737682" className="w-4 h-4" />
                Чтобы оставить комментарий, необходимо авторизоваться
              </p>
              <Link href={`/auth/signin?callbackUrl=/blog/${id}`} className="inline-block px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm hover:shadow-lg transition-all duration-300">
                Войти
              </Link>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {showCommentsState && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 sm:space-y-5"
              >
                {comments.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">💬 Будьте первым, кто оставит комментарий</p>
                ) : (
                  comments.map((comment, idx) => (
                    <motion.div 
                      key={comment.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-3 group"
                    >
                      <UserAvatar name={comment.author_name} avatarUrl={comment.author_avatar} size={isMobile ? 32 : 40} />
                      <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-gray-800 truncate">{comment.author_name}</p>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                <CalendarIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" color="#9CA3AF" />
                                <p className="text-[10px] sm:text-xs text-gray-400">{formatDate(comment.created_at)}</p>
                                {comment.is_edited && <span className="text-[10px] sm:text-xs text-gray-400">(ред.)</span>}
                              </div>
                            </div>

                            {(session?.user?.id === comment.author_id || isAuthor) && (
                              <div className={`flex gap-1 ${!isMobile ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                                {session?.user?.id === comment.author_id && editingCommentId === comment.id ? (
                                  <>
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleUpdateComment(comment.id)} 
                                      disabled={updatingComment} 
                                      className="p-1 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                                    >
                                      <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" color="#22C55E" />
                                    </motion.button>
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => {setEditingCommentId(null); setEditingCommentText("")}} 
                                      className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                      <CloseIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" color="#EF4444" />
                                    </motion.button>
                                  </>
                                ) : (
                                  <>
                                    {session?.user?.id === comment.author_id && (
                                      <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {setEditingCommentId(comment.id); setEditingCommentText(comment.content)}}
                                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <EditIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" color="#6B7280" />
                                      </motion.button>
                                    )}
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleDeleteComment(comment.id)} 
                                      disabled={deletingCommentId === comment.id} 
                                      className="p-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                      <DeleteIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" color="#EF4444" />
                                    </motion.button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {editingCommentId === comment.id ? (
                            <textarea 
                              value={editingCommentText} 
                              onChange={(e) => setEditingCommentText(e.target.value)} 
                              className="w-full p-2 mt-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-1 focus:ring-firm-orange text-sm" 
                              rows={isMobile ? 4 : 3} 
                              autoFocus 
                            />
                          ) : (
                            <p className="text-gray-700 text-xs sm:text-sm mt-2 leading-relaxed break-words">{comment.content}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        type={confirmModal.type} 
        onConfirm={confirmModal.onConfirm} 
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
      />
    </>
  );
}