'use client';

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import MediaGallery from "@/components/blog/MediaGallery";
import { useSession } from "next-auth/react";
import ConfirmModal from "@/components/ui/ConfirmModal";

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
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60);
  if (diff < 1) return "только что";
  if (diff < 24) return `${diff} ч назад`;
  return date.toLocaleDateString("ru-RU");
};

// SVG иконка лайка (сердечко)
const LikeIcon = ({ isActive }: { isActive: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M23.2002 1.25C27.3399 1.25011 30.7498 4.79098 30.75 9.59082C30.75 12.501 29.5561 15.2315 27.25 18.3066C24.9278 21.4031 21.584 24.7143 17.4414 28.8086L17.4395 28.8105L16 30.2383L14.5605 28.8105L14.5586 28.8086C10.416 24.7143 7.07223 21.4031 4.75 18.3066C2.44386 15.2315 1.25 12.501 1.25 9.59082C1.25022 4.79098 4.6601 1.25011 8.7998 1.25C11.164 1.25 13.487 2.4569 15.0176 4.40039L16 5.64746L16.9824 4.40039C18.513 2.4569 20.836 1.25 23.2002 1.25Z" 
      stroke={isActive ? "#D97C8E" : "#737682"}
      strokeWidth="2.5"
      fill={isActive ? "#D97C8E" : "none"}
    />
  </svg>
);

// SVG иконка комментариев (чатов)
const CommentIcon = ({ isActive }: { isActive: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 37 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 9.62622 19.897)" fill={isActive ? "#F4A67F" : "#737682"}/>
    <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 16.9839 19.897)" fill={isActive ? "#F4A67F" : "#737682"}/>
    <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 24.729 19.897)" fill={isActive ? "#F4A67F" : "#737682"}/>
    <path d="M19.6262 32.0648C28.4628 32.0648 35.6262 25.1667 35.6262 16.6574C35.6262 8.14813 28.4628 1.25 19.6262 1.25C10.7897 1.25 3.62622 8.14813 3.62622 16.6574C3.62622 20.4012 5.01285 23.8331 7.31853 26.5029C6.91254 29.643 5.86044 31.0025 3.62622 33.25C6.96012 32.6917 8.71604 32.0376 11.6262 30.0036C13.9796 31.3145 16.7119 32.0648 19.6262 32.0648Z" stroke={isActive ? "#F4A67F" : "#737682"} strokeWidth="2.5"/>
  </svg>
);

// SVG иконка просмотров
const ViewsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#737682" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

// Компонент аватарки для любого пользователя по ID
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
      // Если уже есть прямой URL аватара, не загружаем через API
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
        // Пробуем загрузить профиль через API пользователя
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

  const getInitials = () => {
    if (displayName && displayName.length > 0) {
      return displayName.charAt(0).toUpperCase();
    }
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return "U";
  };

  if (loading) {
    return (
      <div 
        className="rounded-full bg-gray-200 animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  // Если есть аватар и нет ошибки - показываем его
  if (avatarUrl && !avatarError) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || name || "Avatar"}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setAvatarError(true)}
      />
    );
  }

  // Fallback - инициалы
  return (
    <div 
      className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold"
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
              if (data.profile.avatar_url) {
                setAvatarUrl(data.profile.avatar_url);
              }
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
            
            if (avatar) {
              setAvatarUrl(avatar);
            }
            
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
    if (userName && userName.length > 0) {
      return userName.charAt(0).toUpperCase();
    }
    if (session?.user?.name) {
      return session.user.name.charAt(0).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  if (loading) {
    return (
      <div 
        className="rounded-full bg-gray-200 animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  if (avatarUrl && !avatarError) {
    return (
      <img
        src={avatarUrl}
        alt={userName || "Profile"}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setAvatarError(true)}
      />
    );
  }

  return (
    <div 
      className="rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials()}
    </div>
  );
};

export default function BlogPostCard({ 
  post, 
  showComments: externalShowComments,
  isOwner = false,
  onEdit,
  onDelete,
  variant = "default"
}: BlogPostCardProps) {
  const { data: session } = useSession();
  const [showCommentsState, setShowCommentsState] = useState(externalShowComments || false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  
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
    if (externalShowComments !== undefined) {
      setShowCommentsState(externalShowComments);
    }
  }, [externalShowComments]);

  useEffect(() => {
    if (showCommentsState) {
      fetchComments();
    }
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
      const response = await fetch(`/api/blog/posts/${post.id}/like`, {
        method: isLiked ? "DELETE" : "POST",
      });
      
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
        body: JSON.stringify({ content: commentText }),
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
      } else {
        const error = await response.json();
        console.error("Error adding comment:", error);
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
        body: JSON.stringify({ content: editingCommentText }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedComment = data;
        
        setComments(comments.map(comment => 
          comment.id === commentId 
            ? {
                ...comment,
                content: updatedComment.content,
                updated_at: updatedComment.updated_at,
                is_edited: true
              }
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
      message: 'Вы уверены, что хотите удалить этот комментарий?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setDeletingCommentId(commentId);
        try {
          const response = await fetch(`/api/blog/comments/${commentId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            setComments(comments.filter(comment => comment.id !== commentId));
            setCommentsCount(commentsCount - 1);
            toast.success("Комментарий удален");
          } else {
            const error = await response.json();
            toast.error(error.error || "Ошибка при удалении комментария");
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

  // Уникальные изображения для галереи
  const galleryImages = useMemo(() => {
    const uniqueUrls = new Set<string>();
    
    if (post.main_image_url) {
      uniqueUrls.add(post.main_image_url);
    }
    
    if (post.images && Array.isArray(post.images)) {
      post.images.forEach(img => {
        const url = getImageUrl(img);
        if (url) {
          uniqueUrls.add(url);
        }
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
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-4">
          <Image
            src={galleryImages[0].url}
            alt={post.title}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      );
    }

    return (
      <div className="mb-6">
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
            className="mt-4 pt-4 border-t bg-gray-50 rounded-xl p-4 overflow-hidden"
          >
            {session && (
              <div className="flex gap-3 mb-4">
                <CurrentUserAvatar size={32} />
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Написать комментарий..."
                    rows={2}
                    className="w-full p-3 rounded-xl bg-white border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all duration-300 font-['Montserrat_Alternates'] text-sm placeholder:text-gray-400 resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                        onClick={handleCommentSubmit}
                        disabled={commentLoading || !commentText.trim()}
                        className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl text-sm font-['Montserrat_Alternates'] font-medium hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
                        style={{ color: 'var(--color-main)' }}
                      >
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
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  Будьте первым, кто оставит комментарий
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <UserAvatar 
                      userId={comment.author_id}
                      name={comment.author_name}
                      avatarUrl={comment.author_avatar}
                      size={32}
                    />
                    <div className="flex-1">
                      <div className="bg-white rounded-xl p-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">{comment.author_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDate(comment.created_at)}
                              {comment.is_edited && (
                                <span className="ml-2 text-gray-400 text-xs">(ред.)</span>
                              )}
                            </p>
                          </div>
                          
                          {session?.user?.id === comment.author_id && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                              {editingCommentId === comment.id ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateComment(comment.id)}
                                    disabled={updatingComment}
                                    className="text-xs text-green-600 hover:text-green-700"
                                  >
                                    {updatingComment ? "..." : "💾"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText("");
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    ✕
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
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    disabled={deletingCommentId === comment.id}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {editingCommentId === comment.id ? (
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full p-2 mt-2 rounded-lg bg-white border border-gray-200 outline-firm-orange text-sm"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <p className="text-gray-700 text-sm mt-2">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderActions = () => {
    if (variant === "compact") {
      return (
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span>❤️ {likesCount}</span>
          <span>💬 {commentsCount}</span>
          <span>👁️ {post.views_count}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-6 pt-4 mt-4 border-t border-gray-100">
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 transition-all duration-300 hover:scale-110"
        >
          <LikeIcon isActive={isLiked} />
          <span className={`text-sm ${isLiked ? 'text-firm-pink' : 'text-firm-gray'}`}>
            {likesCount}
          </span>
        </button>

        <button
          onClick={() => setShowCommentsState(!showCommentsState)}
          className="flex items-center gap-1.5 transition-all duration-300 hover:scale-110"
        >
          <CommentIcon isActive={showCommentsState} />
          <span className={`text-sm ${showCommentsState ? 'text-firm-orange' : 'text-firm-gray'}`}>
            {commentsCount}
          </span>
        </button>

        {isOwner && (
          <div className="flex gap-2 ml-auto">
            {onEdit && (
              <button onClick={() => onEdit(post.id)} className="text-gray-500 hover:text-firm-orange transition">
                ✏️ Редактировать
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(post.id)} className="text-gray-500 hover:text-red-500 transition">
                🗑️ Удалить
              </button>
            )}
          </div>
        )}

        <div className="flex-1"></div>
        <div className="flex items-center gap-1.5">
          <ViewsIcon />
          <span className="text-sm text-firm-gray">{post.views_count}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ backgroundColor: "#f9fafb" }}
        className="p-6 transition-all duration-300 bg-white rounded-2xl shadow-xl hover:shadow-2xl overflow-hidden"
      >
        <div className="max-w-3xl mx-auto">
          <Link href={`/masters/${post.master_id}`} className="flex items-center gap-3 group mb-4">
            <UserAvatar 
              userId={post.master_id}
              name={post.author_name}
              avatarUrl={post.author_avatar || post.master_avatar}
              size={48}
            />
            <div>
              <p className="font-semibold group-hover:text-firm-orange transition-colors">{post.author_name}</p>
              <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
            </div>
          </Link>

          <h3 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-3 hover:text-firm-orange transition-colors">
            <Link href={`/blog/${post.id}`}>{post.title}</Link>
          </h3>

          {renderPostImages()}

          <p className="text-gray-600 mt-4 line-clamp-3">
            {post.excerpt || post.content?.substring(0, 300)}...
          </p>

          <Link href={`/blog/${post.id}`} className="text-firm-orange hover:underline text-sm mt-3 inline-flex items-center gap-1 group">
            Читать полностью
            <span className="inline-block text-firm-orange">→</span>
          </Link>

          {renderActions()}

          {renderComments()}
        </div>
      </motion.div>

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