"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import MediaGallery from "@/components/blog/MediaGallery";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { PasswordIcon } from "@/components/icons/PasswordIcon";

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

const LikeIcon = ({ isActive }: { isActive: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.2002 1.25C27.3399 1.25011 30.7498 4.79098 30.75 9.59082C30.75 12.501 29.5561 15.2315 27.25 18.3066C24.9278 21.4031 21.584 24.7143 17.4414 28.8086L17.4395 28.8105L16 30.2383L14.5605 28.8105L14.5586 28.8086C10.416 24.7143 7.07223 21.4031 4.75 18.3066C2.44386 15.2315 1.25 12.501 1.25 9.59082C1.25022 4.79098 4.6601 1.25011 8.7998 1.25C11.164 1.25 13.487 2.4569 15.0176 4.40039L16 5.64746L16.9824 4.40039C18.513 2.4569 20.836 1.25 23.2002 1.25Z" stroke={isActive ? "#D97C8E" : "#737682"} strokeWidth="2.5" fill={isActive ? "#D97C8E" : "none"} />
  </svg>
);

const CommentIcon = ({ isActive }: { isActive: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 37 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 9.62622 19.897)" fill={isActive ? "#F4A67F" : "#737682"}/>
    <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 16.9839 19.897)" fill={isActive ? "#F4A67F" : "#737682"}/>
    <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 24.729 19.897)" fill={isActive ? "#F4A67F" : "#737682"}/>
    <path d="M19.6262 32.0648C28.4628 32.0648 35.6262 25.1667 35.6262 16.6574C35.6262 8.14813 28.4628 1.25 19.6262 1.25C10.7897 1.25 3.62622 8.14813 3.62622 16.6574C3.62622 20.4012 5.01285 23.8331 7.31853 26.5029C6.91254 29.643 5.86044 31.0025 3.62622 33.25C6.96012 32.6917 8.71604 32.0376 11.6262 30.0036C13.9796 31.3145 16.7119 32.0648 19.6262 32.0648Z" stroke={isActive ? "#F4A67F" : "#737682"} strokeWidth="2.5"/>
  </svg>
);

const ViewsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#737682" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

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
    return (<img  src={getProxiedUrl(avatarUrl)} alt={name || "Avatar"} className="rounded-full object-cover" style={{ width: size, height: size }} onError={() => setAvatarError(true)}  />)}

  return (
    <div className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {getInitials()}
    </div>
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
      <img src={`/api/proxy/avatar?url=${encodeURIComponent(avatarUrl)}`} alt={userName || "Profile"} className="rounded-full object-cover" style={{ width: size, height: size }} onError={() => setAvatarError(true)} />
    );
  }

  return (
    <div className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {getInitials()}
    </div>
  );
};

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
      message: 'Вы уверены, что хотите удалить этот комментарий?',
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
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60);

    if (diff < 1) return "только что";
    if (diff < 24) return `${diff} ч назад`;
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const blogTags = ["Мастер-класс", "Обзор пряжи", "Новая коллекция", "Советы", "Вдохновение", "История создания", "Техника вязания", "Новости"];
  const isAuthor = session?.user?.id === post?.master_id;

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <p className="mt-4 font-['Montserrat_Alternates'] text-text">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <p className="text-firm-red mb-4">{error || "Пост не найден"}</p>
          <Link href="/blog" className="px-6 py-3 bg-firm-orange text-main rounded-lg inline-block">Вернуться в блог</Link>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl mb-6">Редактирование поста</h1>

        <form onSubmit={handleUpdatePost} className="space-y-6">
          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium">Заголовок <span className="text-firm-red">*</span></label>
            <input type="text" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} required className="w-full p-3 rounded-lg bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" />
          </div>

          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium">Категория</label>
            <select value={editForm.category} onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full p-3 rounded-lg bg-main border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all">
              <option value="">Выберите категорию</option>
              {blogTags.map((tag) => (<option key={tag} value={tag}>{tag}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium">Теги (через запятую)</label>
            <input type="text" value={editForm.tags} onChange={(e) => setEditForm((prev) => ({ ...prev, tags: e.target.value }))} className="w-full p-3 rounded-lg bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" placeholder="Мастер-класс, Советы, Обзор" />
          </div>

          <div>
            <label className="block text-text mb-1 font-['Montserrat_Alternates'] font-medium">Содержание <span className="text-firm-red">*</span></label>
            <textarea value={editForm.content} onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))} rows={15} required className="w-full p-3 rounded-lg bg-main border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all" />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="px-6 py-2 bg-firm-orange text-main rounded-lg hover:bg-opacity-90 transition" >Сохранить</button>
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"> Отмена </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8 ">
        <div className="text-sm text-firm-gray mb-6 w-full">
          <Link href="/" className="hover:text-firm-orange">Главная</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-firm-orange">Блог</Link>
          <span className="mx-2">/</span>
          <span className="text-text line-clamp-1">{post.title}</span>
        </div>

        {/* Кнопки редактирования для автора */}
        {isAuthor && (
          <div className="flex justify-end gap-3 mb-4">
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm bg-firm-orange text-main rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"><EditIcon className="w-4 h-4" color="#f9f9f9" />Редактировать</button>
            <button onClick={handleDeletePost}  disabled={deleting} className="px-4 py-2 text-sm bg-firm-red text-main rounded-lg hover:bg-firm-red transition disabled:opacity-50 flex items-center gap-2"><DeleteIcon className="w-4 h-4" color="#f9f9f9" />{deleting ? "Удаление..." : "Удалить"}</button>
          </div>
        )}

        <Link href={`/masters/${post.master_id}`} className="flex items-center gap-3 group mb-6">
          <UserAvatar name={post.master_name} avatarUrl={post.master_avatar} size={48} />
          <div>
            <p className="font-semibold group-hover:text-firm-orange transition-colors">{post.master_name}</p>
            <p className="text-xs text-firm-gray">{formatDate(post.created_at)}</p>
          </div>
        </Link>

        <div className="flex flex-wrap gap-2 mb-4">
          {post.category && (<span className="px-2 py-1 bg-firm-orange/10 text-firm-orange rounded-full text-xs sm:text-sm">{post.category}</span>)}
          {post.tags?.map((tag, idx) => (<span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs sm:text-sm">#{tag}</span>))}
        </div>

        <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl md:text-4xl mb-6">{post.title}</h1>

        {(post.images?.length || 0) > 0 || post.main_image_url ? (<div className="mb-8"><MediaGallery images={post.images || []} mainImageUrl={post.main_image_url} video={null} title={post.title} /></div>) : null}

        <div className="mb-8">
          <div className="text-text whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{post.content}</div>
        </div>

        <div className="flex items-center gap-6 py-4 border-t border-b border-gray-200 mb-8">
          <button onClick={handleLike} className="flex items-center gap-1.5 transition-all duration-300 hover:scale-110">
            <LikeIcon isActive={isLiked} />
            <span className={`text-sm ${isLiked ? 'text-firm-pink' : 'text-firm-gray'}`}>{likesCount}</span>
          </button>

          <button onClick={() => setShowCommentsState(!showCommentsState)} className="flex items-center gap-1.5 transition-all duration-300 hover:scale-110">
            <CommentIcon isActive={showCommentsState} />
            <span className={`text-sm ${showCommentsState ? 'text-firm-orange' : 'text-firm-gray'}`}>{commentsCount}</span>
          </button>

          <div className="flex-1"></div>

          <div className="flex items-center gap-4">
            <button onClick={handleShare} className="text-firm-gray hover:text-firm-orange transition">
              <ShareIcon />
            </button>
            <div className="flex items-center gap-1.5">
              <ViewsIcon />
              <span className="text-sm text-firm-gray">{post.views_count}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-6">Комментарии ({commentsCount})</h3>

          {session ? (
            <div className="flex gap-3 mb-8">
              <CurrentUserAvatar size={40} />
              <div className="flex-1">
                <textarea  value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Написать комментарий..." rows={3} className="w-full p-3 rounded-xl bg-forms border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all duration-300 text-sm placeholder:text-firm-gray resize-none" />
                <div className="flex justify-end mt-2">
                  <button onClick={handleComment} disabled={commentLoading || !commentText.trim()} className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl text-sm font-['Montserrat_Alternates'] font-medium hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100" style={{ color: '#f9f9f9' }} >
                    {commentLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Отправка...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Отправить</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-main rounded-xl p-6 text-center mb-8 border border-gray-200">
              <p className="text-firm-gray text-sm mb-3 flex items-center justify-center gap-2">
                <PasswordIcon color="#737682" className="w-4 h-4" />
                Чтобы оставить комментарий, необходимо авторизоваться
              </p>
              <Link href={`/auth/signin?callbackUrl=/blog/${id}`} className="inline-block px-5 py-2 bg-firm-orange text-main rounded-lg text-sm hover:bg-opacity-90 transition">Войти</Link>
            </div>
          )}

          <AnimatePresence mode="wait">
            {showCommentsState && (
              <div className="space-y-5">
                {comments.length === 0 ? (
                  <p className="text-firm-gray text-center py-8 text-sm">Будьте первым, кто оставит комментарий</p>
                ) : (
                  comments.map((comment, idx) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <UserAvatar name={comment.author_name} avatarUrl={comment.author_avatar} size={40} />
                      <div className="flex-1">
                        <div className="bg-main rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">{comment.author_name}</p>
                              <p className="text-xs text-firm-gray mt-0.5">
                                {formatDate(comment.created_at)}
                                {comment.is_edited && <span className="ml-2 text-firm-gray text-xs">(ред.)</span>}
                              </p>
                            </div>

                            {(session?.user?.id === comment.author_id || isAuthor) && (
                              <div className={`flex gap-2 ${!isMobile ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                                {session?.user?.id === comment.author_id && editingCommentId === comment.id ? (
                                  <>
                                    <button onClick={() => handleUpdateComment(comment.id)} disabled={updatingComment} className="w-5 h-5 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"><Image src="/save.svg" alt="Сохранить" width={16} height={16} /></button>
                                    <button onClick={() => {setEditingCommentId(null); setEditingCommentText("")}} className="w-5 h-5 flex items-center justify-center hover:scale-110 transition-transform"><Image src="/delete.svg" alt="Отмена" width={16} height={16} /></button>
                                  </>
                                ) : (
                                  <>
                                    {session?.user?.id === comment.author_id && (
                                      <button onClick={() => {setEditingCommentId(comment.id); setEditingCommentText(comment.content)}}className="w-5 h-5 flex items-center justify-center hover:scale-110 transition-transform"><Image src="/edit.svg" alt="Редактировать" width={16} height={16} /> </button>)}
                                    <button onClick={() => handleDeleteComment(comment.id)} disabled={deletingCommentId === comment.id} className="w-5 h-5 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"><Image src="/delete.svg" alt="Удалить" width={16} height={16} /></button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {editingCommentId === comment.id ? (
                            <textarea value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} className="w-full p-2 mt-2 rounded-lg bg-main border border-gray-200 outline-firm-orange text-sm" rows={3} autoFocus />
                          ) : (
                            <p className="text-text text-sm mt-2">{comment.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
    </>
  );
}