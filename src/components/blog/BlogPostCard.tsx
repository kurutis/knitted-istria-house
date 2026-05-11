"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import MediaGallery from "@/components/blog/MediaGallery";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useSession } from "next-auth/react";

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
        let freshComments: {
          id: string;
          content: string;
          created_at: string;
          updated_at?: string;
          is_edited?: boolean;
          author_id: string;
          author_name: string;
          author_avatar?: string;
        }[] = [];
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
        method: post.is_liked ? "DELETE" : "POST",
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
      const response = await fetch(`/api/blog/posts/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        await fetchComments();
        setCommentText("");
        setShowCommentsState(true);
      } else {
        const error = await response.json();
        console.error("Error adding comment:", error);
        alert(error.error || "Ошибка при добавлении комментария");
      }
    } catch (error) {
      console.error("Error in comment:", error);
      alert("Ошибка при добавлении комментария");
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
        await fetchComments();
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

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Удалить комментарий?")) return;

    setDeletingCommentId(commentId);
    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchComments();
      } else {
        alert("Ошибка при удалении комментария");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Ошибка при удалении комментария");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const getGalleryImages = () => {
    const imageUrls = (post.images || [])
      .map(img => getImageUrl(img))
      .filter(Boolean);
    
    if (post.main_image_url && !imageUrls.includes(post.main_image_url)) {
      return [post.main_image_url, ...imageUrls];
    }
    
    return imageUrls;
  };

  const renderPostImages = () => {
    const galleryImages = getGalleryImages();
    
    if (galleryImages.length === 0) return null;

    if (variant === "compact") {
      return (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-4">
          <Image
            src={galleryImages[0]}
            alt={post.title}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      );
    }

    const mediaGalleryImages = galleryImages.map((url, index) => ({
      id: `img-${index}`,
      url: url,
      image_url: url,
      sort_order: index
    }));

    return (
      <div className="mb-6">
        <MediaGallery
          images={mediaGalleryImages}
          mainImageUrl={galleryImages[0]}
          video={null}
          title={post.title}
        />
      </div>
    );
  };

  const renderComments = () => {
    if (!showCommentsState) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 pt-4 border-t bg-gray-50 rounded-xl p-4 overflow-hidden"
      >
        {session && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {session.user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать комментарий..."
                rows={2}
                className="w-full p-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300"
              />
              <button
                onClick={handleCommentSubmit}
                disabled={commentLoading || !commentText.trim()}
                className="mt-2 px-5 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl text-sm hover:shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                {commentLoading ? "Отправка..." : "Отправить"}
              </button>
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
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                  {comment.author_avatar ? (
                    <Image
                      src={comment.author_avatar}
                      alt={comment.author_name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    comment.author_name?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
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
        <AnimatedButton
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill={isLiked ? "#D97C8E" : "none"} stroke={isLiked ? "#D97C8E" : "#9CA3AF"} strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          }
          count={likesCount}
          isActive={isLiked}
          onClick={handleLike}
          activeColor="text-firm-pink"
        />

        <AnimatedButton
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={showCommentsState ? "#F97316" : "#9CA3AF"} strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          }
          count={commentsCount}
          isActive={showCommentsState}
          onClick={() => setShowCommentsState(!showCommentsState)}
          activeColor="text-firm-orange"
        />

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
        <span className="text-sm text-gray-400 flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          {post.views_count}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ backgroundColor: "#f9fafb" }}
      className="p-6 transition-all duration-300 bg-white rounded-2xl shadow-xl hover:shadow-2xl overflow-hidden"
    >
      <div className="max-w-3xl mx-auto">
        <Link href={`/masters/${post.master_id}`} className="flex items-center gap-3 group mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
            {post.author_avatar ? (
              <Image src={post.author_avatar} alt={post.author_name} width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">{post.author_name?.charAt(0).toUpperCase() || "М"}</span>
            )}
          </div>
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
          <span className="inline-block">→</span>
        </Link>

        {renderActions()}

        <AnimatePresence>
          {renderComments()}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}