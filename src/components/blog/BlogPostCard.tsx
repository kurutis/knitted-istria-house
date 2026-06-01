'use client';

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import MediaGallery from "@/components/blog/MediaGallery";
import { useSession } from "next-auth/react";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Импорт иконок из библиотеки
import { CalendarIcon } from "../icons/CalendarIcon";
import { ViewsIcon } from "../icons/ViewsIcon";
import { CommentIcon } from "../icons/CommentIcon";
import { LikeIcon } from "../icons/LikeIcon";
import { EditIcon } from "../icons/EditIcon";
import { DeleteIcon } from "../icons/DeleteIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { CheckCircleIcon } from "../icons/CheckCircleIcon";
import { SendIcon } from "../icons/SendIcon";

export interface BlogPostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    images?: Array<{ id: string; url?: string; image_url?: string; sort_order: number }> | string[];
    main_image_url?: string;
    created_at: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    author_name: string;
    author_avatar?: string;
    master_id: string;
    master_name?: string;
    master_avatar?: string;
    is_liked?: boolean;
    comments?: Array<{
      id: string;
      content: string;
      created_at: string;
      updated_at?: string;
      is_edited?: boolean;
      author_id: string;
      author_name: string;
      author_avatar?: string;
    }>;
  };
  showComments?: boolean;
  isOwner?: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  variant?: "default" | "compact" | "full";
}

const getImageUrl = (img: string | { id: string; url?: string; image_url?: string; sort_order: number }): string => {
  if (typeof img === 'string') return img;
  return img.url || img.image_url || '';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
  
  if (diff < 1) return "только что";
  if (diff < 60) return `${diff} мин назад`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
  return date.toLocaleDateString("ru-RU", { day: 'numeric', month: 'long' });
};

const UserAvatar = ({ userId, name, avatarUrl: initialAvatarUrl, size = 48 }: { 
  userId?: string; 
  name?: string; 
  avatarUrl?: string | null;
  size?: number;
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const [displayName, setDisplayName] = useState<string>(name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (initialAvatarUrl) {
        setAvatarUrl(initialAvatarUrl);
        setLoading(false);
        return;
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/profile?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          const profile = data.profile || data;
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url);
          }
          if (profile.fullname || profile.full_name) {
            setDisplayName(profile.fullname || profile.full_name);
          }
        } else if (name) {
          setDisplayName(name);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        if (name) setDisplayName(name);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId, initialAvatarUrl, name]);

  const getProxiedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/api/proxy/avatar')) return url;
    return `/api/proxy/avatar?url=${encodeURIComponent(url)}`;
  };

  const getInitials = () => {
    if (displayName && displayName.length > 0) return displayName.charAt(0).toUpperCase();
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    return "U";
  };

  if (loading) {
    return (
      <div className="rounded-full bg-gray-200 animate-pulse" style={{ width: size, height: size }} />
    );
  }

  if (avatarUrl && !avatarError) {
    const proxiedUrl = getProxiedUrl(avatarUrl);
    return (
      <img 
        src={proxiedUrl} 
        alt={displayName || name || "Avatar"} 
        className="rounded-full object-cover ring-2 ring-white shadow-md"
        style={{ width: size, height: size }} 
        onError={() => setAvatarError(true)} 
      />
    );
  }

  return (
    <div 
      className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold shadow-md" 
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
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

  const getProxiedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/api/proxy/avatar')) return url;
    return `/api/proxy/avatar?url=${encodeURIComponent(url)}`;
  };

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
    if (session?.user?.name) return session.user.name.charAt(0).toUpperCase();
    if (session?.user?.email) return session.user.email.charAt(0).toUpperCase();
    return "U";
  };

  if (loading) {
    return (
      <div className="rounded-full bg-gray-200 animate-pulse" style={{ width: size, height: size }} />
    );
  }

  if (avatarUrl && !avatarError) {
    const proxiedUrl = getProxiedUrl(avatarUrl);
    return (
      <img 
        src={proxiedUrl} 
        alt={userName || "Profile"} 
        className="rounded-full object-cover ring-2 ring-firm-orange/30" 
        style={{ width: size, height: size }} 
        onError={() => setAvatarError(true)} 
      />
    );
  }

  return (
    <div 
      className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold shadow-md" 
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials()}
    </div>
  );
};

// Обертка для LikeIcon с состоянием
const LikeButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
  <motion.button 
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick} 
    className="flex items-center gap-1.5 transition-all duration-300"
  >
    <LikeIcon color={isActive ? "#D97C8E" : "#737682"} className="w-6 h-6" />
  </motion.button>
);

// Обертка для CommentIcon с состоянием
const CommentButton = ({ isActive, onClick, count }: { isActive: boolean; onClick: () => void; count: number }) => (
  <motion.button 
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick} 
    className="flex items-center gap-1.5 transition-all duration-300"
  >
    <CommentIcon color={isActive ? "#F4A67F" : "#737682"} className="w-6 h-6" />
    <span className={`text-sm font-medium ${isActive ? 'text-firm-orange' : 'text-gray-500'}`}>
      {count}
    </span>
  </motion.button>
);

export default function BlogPostCard({ post, showComments: externalShowComments, isOwner = false, onEdit, onDelete, variant = "default" }: BlogPostCardProps) {
  const { data: session } = useSession();
  const [showCommentsState, setShowCommentsState] = useState(externalShowComments || false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [comments, setComments] = useState(post.comments || []);
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  
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
    type: 'warning'
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (externalShowComments !== undefined) setShowCommentsState(externalShowComments);
  }, [externalShowComments]);

  useEffect(() => {
    if (showCommentsState) fetchComments();
  }, [showCommentsState, post.id]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/blog/posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        let freshComments = [];
        
        if (data.comments && Array.isArray(data.comments)) {
          freshComments = data.comments;
        } else if (Array.isArray(data)) {
          freshComments = data;
        }
        
        setComments(freshComments);
        setCommentsCount(freshComments.length);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleLike = async () => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/blog";
      return;
    }
    
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);
    
    try {
      const response = await fetch(`/api/blog/posts/${post.id}/like`, { method: isLiked ? "DELETE" : "POST" });
      
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

  const handleCommentSubmit = async () => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/blog";
      return;
    }
    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      const response = await fetch(`/api/blog/posts/${post.id}/comments`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ content: commentText })
      });

      if (response.ok) {
        const data = await response.json();
        const newComment = {
          id: data.id, 
          content: data.content, 
          created_at: data.created_at, 
          updated_at: data.updated_at || data.created_at, 
          is_edited: false, 
          author_id: data.author_id, 
          author_name: data.author_name, 
          author_avatar: data.author_avatar
        };
        
        setComments([newComment, ...comments]);
        setCommentsCount(commentsCount + 1);
        setCommentText("");
        setShowCommentsState(true);
        toast.success("Комментарий добавлен");
      } else {
        const error = await response.json();
        toast.error(error.error || "Ошибка при добавлении комментария");
      }
    } catch (error) {
      console.error("Error in comment:", error);
      toast.error("Ошибка при добавлении комментария");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    setUpdatingComment(true);
    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ content: editingCommentText })
      });

      if (response.ok) {
        const data = await response.json();
        setComments(comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: data.content, updated_at: data.updated_at, is_edited: true } 
            : comment
        ));
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
            setComments(comments.filter(comment => comment.id !== commentId));
            setCommentsCount(commentsCount - 1);
            toast.success("Комментарий удален");
          } else {
            let errorMessage = "Ошибка при удалении комментария";
            try {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
              }
            } catch (e) {}
            toast.error(errorMessage);
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

  const galleryImages = useMemo(() => {
    const uniqueUrls = new Set<string>();
    
    if (post.main_image_url) uniqueUrls.add(post.main_image_url);
    
    if (post.images && Array.isArray(post.images)) {
      post.images.forEach(img => {
        const url = getImageUrl(img);
        if (url) uniqueUrls.add(url);
      });
    }
    
    return Array.from(uniqueUrls).map((url, index) => ({
      id: `img-${index}`, 
      url: url, 
      image_url: url, 
      sort_order: index
    }));
  }, [post.main_image_url, post.images]);

  const renderPostImages = () => {
    if (galleryImages.length === 0) return null;

    if (variant === "compact") {
      return (
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
          <Image 
            src={galleryImages[0].url} 
            alt={post.title} 
            fill 
            className="object-cover hover:scale-105 transition-transform duration-500" 
            sizes="(max-width: 768px) 100vw, 800px" 
          />
        </div>
      );
    }

    return (
      <div className="mb-6 -mx-2">
        <MediaGallery 
          images={galleryImages} 
          mainImageUrl={galleryImages[0]?.url} 
          video={null} 
          title={post.title} 
        />
      </div>
    );
  };

  const renderComments = () => {
    return (
      <AnimatePresence mode="wait">
        {showCommentsState && (
          <motion.div 
            key="comments" 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }} 
            transition={{ duration: 0.3, ease: "easeInOut" }} 
            className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/50 rounded-xl p-4"
          >
            {/* Форма добавления комментария */}
            {session && (
              <div className="flex gap-3 mb-6">
                <CurrentUserAvatar size={40} />
                <div className="flex-1">
                  <textarea 
                    value={commentText}  
                    onChange={(e) => setCommentText(e.target.value)} 
                    placeholder="Написать комментарий..." 
                    rows={2} 
                    className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all duration-300 text-sm placeholder:text-gray-400 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCommentSubmit} 
                      disabled={commentLoading || !commentText.trim()} 
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm font-['Montserrat_Alternates'] font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {commentLoading ? (
                        <>
                          <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" 
                          />
                          <span>Отправка...</span>
                        </>
                      ) : (
                        <>
                          <SendIcon className="w-4 h-4" color="#FFFFFF" size={16} />
                          <span>Отправить</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Список комментариев */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {comments.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gray-400 text-sm text-center py-8"
                >
                  Будьте первым, кто оставит комментарий
                </motion.p>
              ) : (
                comments.map((comment, idx) => (
                  <motion.div 
                    key={comment.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex gap-3 group"
                  >
                    <UserAvatar 
                      userId={comment.author_id} 
                      name={comment.author_name} 
                      avatarUrl={comment.author_avatar} 
                      size={36} 
                    />
                    <div className="flex-1">
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{comment.author_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <CalendarIcon className="w-3 h-3" color="#9CA3AF" size={12} />
                              <p className="text-xs text-gray-400">{formatDate(comment.created_at)}</p>
                              {comment.is_edited && (
                                <span className="text-xs text-gray-400">(ред.)</span>
                              )}
                            </div>
                          </div>
                          
                          {session?.user?.id === comment.author_id && (
                            <div className={`flex gap-1 ${!isMobile ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                              {editingCommentId === comment.id ? (
                                <>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleUpdateComment(comment.id)} 
                                    disabled={updatingComment}
                                    className="p-1 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" color="#22C55E" size={16} />
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText("");
                                    }}
                                    className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                    <CloseIcon className="w-4 h-4" color="#EF4444" size={16} />
                                  </motion.button>
                                </>
                              ) : (
                                <>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentText(comment.content);
                                    }}
                                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <EditIcon className="w-4 h-4" color="#6B7280" size={16} />
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDeleteComment(comment.id)} 
                                    disabled={deletingCommentId === comment.id} 
                                    className="p-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                  >
                                    <DeleteIcon className="w-4 h-4" color="#EF4444" size={16} />
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
                            rows={3} 
                            autoFocus 
                          />
                        ) : (
                          <p className="text-gray-700 text-sm mt-2 leading-relaxed">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderActions = () => {
    return (
      <div className="flex items-center gap-6 pt-4 mt-4 border-t border-gray-100">
        <LikeButton isActive={isLiked} onClick={handleLike} />
        <span className={`text-sm font-medium ${isLiked ? 'text-firm-pink' : 'text-gray-500'}`}>
          {likesCount}
        </span>
        
        <CommentButton 
          isActive={showCommentsState} 
          onClick={() => setShowCommentsState(!showCommentsState)} 
          count={commentsCount}
        />

        {isOwner && (
          <div className="flex gap-2 ml-auto">
            {onEdit && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onEdit(post.id)} 
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-firm-orange rounded-lg hover:bg-gray-100 transition-all duration-300"
              >
                <EditIcon className="w-4 h-4" color="#6B7280" size={16} />
                <span>Редактировать</span>
              </motion.button>
            )}
            {onDelete && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDelete(post.id)} 
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all duration-300"
              >
                <DeleteIcon className="w-4 h-4" color="#EF4444" size={16} />
                <span>Удалить</span>
              </motion.button>
            )}
          </div>
        )}

        <div className="flex-1"></div>
        
        <div className="flex items-center gap-1.5">
          <ViewsIcon />
          <span className="font-['Raleway'] text-sm text-gray-500">{post.views_count}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.article 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        whileHover={{ boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
        transition={{ duration: 0.3 }}
        className="p-6 transition-all duration-300 bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="max-w-3xl mx-auto">
          {/* Автор */}
          <Link href={`/masters/${post.master_id}`} className="flex items-center gap-3 group mb-5">
            <UserAvatar 
              userId={post.master_id} 
              name={post.author_name} 
              avatarUrl={post.author_avatar || post.master_avatar} 
              size={52} 
            />
            <div>
              <p className="font-semibold text-gray-800 group-hover:text-firm-orange transition-colors duration-300">
                {post.author_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <CalendarIcon className="w-3.5 h-3.5" color="#9CA3AF" size={14} />
                <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
              </div>
            </div>
          </Link>

          {/* Заголовок */}
          <h3 className="font-['Montserrat_Alternates'] font-bold text-2xl mb-4 hover:text-firm-orange transition-colors duration-300">
            <Link href={`/blog/${post.id}`}>{post.title}</Link>
          </h3>

          {/* Изображения */}
          {renderPostImages()}

          {/* Контент */}
          <p className="text-gray-600 mt-4 leading-relaxed line-clamp-3">
            {post.excerpt || post.content?.substring(0, 300)}...
          </p>

          {/* Кнопка "Читать полностью" */}
          <Link 
            href={`/blog/${post.id}`} 
            className="inline-flex items-center gap-2 text-firm-orange hover:text-firm-pink text-sm font-medium mt-3 group transition-colors duration-300"
          >
            <span>Читать полностью</span>
            <motion.span 
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              className="inline-block"
            >
              →
            </motion.span>
          </Link>

          {/* Действия */}
          {renderActions()}

          {/* Комментарии */}
          {renderComments()}
        </div>
      </motion.article>

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