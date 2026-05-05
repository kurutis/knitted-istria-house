'use client'

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";
import MediaGallery from "@/components/blog/MediaGallery";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

interface Master {
  id: string;
  name: string;
  avatar_url: string;
  city: string;
  products_count: number;
  posts_count: number;
  is_following?: boolean;
}

interface SearchPost {
  id: string;
  title: string;
  content: string;
  main_image_url: string;
  created_at: string;
  master_id: string;
  master_name: string;
  master_avatar: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  highlighted_title: string;
  highlighted_content: string;
  images?: Array<{ id: string; url: string; sort_order: number }>;
}

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
  comments?: Comment[];
  images?: Array<{ id: string; url: string; sort_order: number }>;
}

type DisplayPost = BlogPost | (SearchPost & { comments?: Comment[]; views_count?: number });



export default function BlogPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [followingMasters, setFollowingMasters] = useState<Master[]>([]);
  const [recommendedMasters, setRecommendedMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    masters: Master[];
    posts: SearchPost[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);
  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    tags: "",
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMasters, setShowMobileMasters] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isMaster = session?.user?.role === "master";
  const currentMasterId = session?.user?.id;
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

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/blog/search?q=${encodeURIComponent(query)}`,
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [],
  );

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults(null);
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const postsRes = await fetch("/api/blog/posts");
      const postsData = await postsRes.json();
      setPosts(postsData || []);
  
      const mastersRes = await fetch("/api/blog/masters");
      const mastersData = await mastersRes.json();

      setFollowingMasters(mastersData.following || []);
      setRecommendedMasters(mastersData.recommended || []);
    } catch (error) {
      console.error("Error fetching blog data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/blog";
      return;
    }

    try {
      const post = posts.find((p) => p.id === postId);
      const response = await fetch(`/api/blog/posts/${postId}/like`, {
        method: post?.is_liked ? "DELETE" : "POST",
      });

      if (response.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  is_liked: !p.is_liked,
                  likes_count: p.is_liked
                    ? p.likes_count - 1
                    : p.likes_count + 1,
                }
              : p,
          ),
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async (postId: string) => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/blog";
      return;
    }

    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      const response = await fetch(`/api/blog/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [newComment, ...(p.comments || [])],
                  comments_count: (p.comments_count || 0) + 1,
                }
              : p,
          ),
        );
        setCommentText("");
        setShowComments(postId);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleFollow = async (masterId: string, isFollowing: boolean) => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/blog";
      return;
    }

    try {
      const method = isFollowing ? "DELETE" : "POST";
      const response = await fetch("/api/masters/follow", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterId }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.is_following) {
          const masterToAdd =
            recommendedMasters.find((m) => m.id === masterId) ||
            searchResults?.masters.find((m) => m.id === masterId);
          if (masterToAdd && !followingMasters.find((m) => m.id === masterId)) {
            setFollowingMasters((prev) => [
              { ...masterToAdd, is_following: true },
              ...prev,
            ]);
          }
        } else {
          setFollowingMasters((prev) => prev.filter((m) => m.id !== masterId));
        }

        setRecommendedMasters((prev) =>
          prev.map((m) =>
            m.id === masterId ? { ...m, is_following: data.is_following } : m,
          ),
        );

        if (searchResults) {
          setSearchResults({
            ...searchResults,
            masters: searchResults.masters.map((m) =>
              m.id === masterId ? { ...m, is_following: data.is_following } : m,
            ),
          });
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const handlePostInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setPostForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (postImages.length + files.length > 10) {
      alert("Можно загрузить не более 10 фотографий");
      return;
    }

    const validFiles = files.filter((file) => {
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

    setPostImages((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePostImage = (index: number) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
    setPostImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!postForm.title) {
      alert("Введите заголовок поста");
      return;
    }

    if (!postForm.content) {
      alert("Введите содержание поста");
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

      postImages.forEach((image) => {
        formData.append("images", image);
      });

      const response = await fetch("/api/master/blog", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      setShowAddPostModal(false);
      resetPostForm();
      await fetchData();
      alert("Пост успешно создан!");
    } catch (error) {
      console.error("Ошибка при создании поста:", error);
      alert("Ошибка при создании поста");
    } finally {
      setSaving(false);
    }
  };

  const resetPostForm = () => {
    setPostForm({
      title: "",
      content: "",
      excerpt: "",
      category: "",
      tags: "",
    });
    setPostImages([]);
    setPostImagePreviews([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60);

    if (diff < 1) return "только что";
    if (diff < 24) return `${diff} ч назад`;
    return date.toLocaleDateString("ru-RU");
  };

  const showSearchResults = searchQuery.trim() !== "" && searchResults !== null;
  const displayPosts = showSearchResults ? searchResults.posts : posts;

  if (loading) {
    return (
      <div className="mt-5 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
          Блог
        </h1>
        {isMaster && (
          <motion.button
            onClick={() => setShowAddPostModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition flex items-center gap-2 text-sm sm:text-base"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ✍️ Написать пост
          </motion.button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Левая колонка - мастера (десктоп) */}
        {!isMobile && (
          <div className="w-full lg:w-80 flex-shrink-0">
            <MastersSidebar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearching={isSearching}
              showSearchResults={showSearchResults}
              searchResults={searchResults}
              followingMasters={followingMasters}
              recommendedMasters={recommendedMasters}
              session={session}
              currentMasterId={currentMasterId}
              handleFollow={handleFollow}
            />
          </div>
        )}

        {/* Мобильная кнопка показа мастеров */}
        {isMobile && (
          <motion.button
            onClick={() => setShowMobileMasters(!showMobileMasters)}
            className="flex items-center justify-between w-full p-3 bg-white rounded-xl shadow-md"
            whileTap={{ scale: 0.98 }}
          >
            <span className="font-['Montserrat_Alternates'] font-medium">
              Мастера и рекомендации
            </span>
            <motion.svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: showMobileMasters ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          </motion.button>
        )}

        {/* Мобильная панель мастеров */}
        <AnimatePresence>
          {isMobile && showMobileMasters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <MastersSidebar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  isSearching={isSearching}
                  showSearchResults={showSearchResults}
                  searchResults={searchResults}
                  followingMasters={followingMasters}
                  recommendedMasters={recommendedMasters}
                  session={session}
                  currentMasterId={currentMasterId}
                  handleFollow={handleFollow}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Правая колонка - посты */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6 overflow-hidden">
          {showSearchResults && (
            <div className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl p-3 text-xs sm:text-sm text-gray-600 break-words">
              🔍 Найдено {searchResults.masters?.length || 0} мастеров и{" "}
              {searchResults.posts?.length || 0} постов по запросу &quot;
              {searchQuery}&quot;
            </div>
          )}

          {displayPosts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center text-gray-500">
              <p className="text-lg">{searchQuery ? "Посты не найдены" : "Пока нет постов"}</p>
            </div>
          ) : (
            <AnimatePresence>
              {displayPosts.map((post: DisplayPost, index: number) => {
                const comments = post.comments || [];
                const hasComments = comments.length > 0;
                
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="p-3 sm:p-4 flex items-center justify-between border-b border-gray-100">
                      <Link
                        href={`/masters/${post.master_id}`}
                        className="flex items-center gap-2 sm:gap-3 group flex-shrink-0"
                      >
                        <motion.div
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden text-sm sm:text-base shadow-md"
                          whileHover={{ scale: 1.1 }}
                        >
                          {post.master_avatar ? (
                            <img
                              src={post.master_avatar}
                              alt={post.master_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            post.master_name?.charAt(0).toUpperCase()
                          )}
                        </motion.div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base group-hover:text-firm-orange transition truncate">
                            {post.master_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="p-3 sm:p-4">
                      <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg sm:text-xl mb-2 break-words">
                        {showSearchResults && 'highlighted_title' in post && post.highlighted_title ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: post.highlighted_title,
                            }}
                            className="break-words"
                          />
                        ) : (
                          post.title
                        )}
                      </h3>

                      {(post.images?.length || 0) > 0 || post.main_image_url ? (
                            <div className="mb-8">
                                <MediaGallery
                                    images={post.images || []}
                                    mainImageUrl={post.main_image_url}
                                    video={null}
                                    title={post.title}
                                />
                            </div>
                        ) : null}

                      <div className="text-gray-700 mt-3 sm:mt-4 break-words">
                        {showSearchResults && 'highlighted_content' in post && post.highlighted_content ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: post.highlighted_content + "...",
                            }}
                            className="line-clamp-3 text-sm sm:text-base break-words"
                          />
                        ) : (
                          <p className="line-clamp-3 text-sm sm:text-base break-words">
                            {post.content?.substring(0, 300)}...
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/blog/${post.id}`}
                        className="text-firm-orange hover:underline text-xs sm:text-sm mt-2 inline-block group"
                      >
                        Читать полностью{" "}
                        <motion.span
                          className="inline-block ml-1"
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          →
                        </motion.span>
                      </Link>
                    </div>

                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-100 flex items-center gap-4 sm:gap-6 flex-wrap">
                      <AnimatedButton
                        icon={
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
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
                        onClick={() => handleLike(post.id)}
                        activeColor="text-firm-pink"
                      />

                      <AnimatedButton
                        icon={
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={
                              showComments === post.id ? "#F4A67F" : "#9CA3AF"
                            }
                            strokeWidth="1.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        }
                        count={post.comments_count || 0}
                        isActive={showComments === post.id}
                        onClick={() =>
                          setShowComments(
                            showComments === post.id ? null : post.id,
                          )
                        }
                        activeColor="text-firm-orange"
                      />

                      <div className="flex-1"></div>
                      <span className="text-xs sm:text-sm text-gray-400 flex items-center gap-1 flex-shrink-0">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
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
                        {'views_count' in post ? post.views_count : 0}
                      </span>
                    </div>

                    {/* Комментарии */}
                    <AnimatePresence>
                      {showComments === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="px-3 sm:px-4 py-3 border-t bg-gradient-to-b from-gray-50 to-white"
                        >
                          {session ? (
                            <div className="flex gap-2 sm:gap-3 mb-4">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0 shadow-md">
                                {session.user.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder="Написать комментарий..."
                                  rows={2}
                                  className="w-full p-2 rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-firm-orange text-sm resize-none transition-all"
                                />
                                <motion.button
                                  onClick={() => handleComment(post.id)}
                                  disabled={commentLoading || !commentText.trim()}
                                  className="mt-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-xs sm:text-sm hover:shadow-lg transition disabled:opacity-50"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {commentLoading ? "Отправка..." : "Отправить"}
                                </motion.button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 text-center mb-4 border border-gray-100">
                              <p className="text-gray-500 text-sm mb-2 break-words">
                                🔒 Чтобы оставить комментарий, необходимо
                                авторизоваться
                              </p>
                              <Link
                                href={`/auth/signin?callbackUrl=/blog`}
                                className="inline-block px-4 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg text-sm hover:shadow-lg transition"
                              >
                                Войти
                              </Link>
                            </div>
                          )}

                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {!hasComments ? (
                              <p className="text-gray-400 text-sm text-center py-4">
                                Будьте первым, кто оставит комментарий
                              </p>
                            ) : (
                              <>
                                {comments.slice(-3).map((comment: Comment) => (
                                  <div key={comment.id} className="flex gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0 overflow-hidden">
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
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-white rounded-xl p-2 sm:p-3 shadow-sm border border-gray-100">
                                        <p className="font-semibold text-xs sm:text-sm break-words">
                                          {comment.author_name}
                                        </p>
                                        <p className="text-gray-700 text-xs sm:text-sm mt-1 break-words">
                                          {comment.content}
                                        </p>
                                      </div>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {formatDate(comment.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                
                                {comments.length > 3 && (
                                  <div className="text-center pt-2">
                                    <Link
                                      href={`/blog/${post.id}`}
                                      className="text-firm-orange hover:underline text-sm font-medium"
                                    >
                                      Показать все {comments.length} комментариев →
                                    </Link>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Модальное окно добавления поста (оставляем без изменений) */}
      <AnimatePresence>
        {showAddPostModal && isMaster && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddPostModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                  Новая запись
                </h2>
                <button
                  onClick={() => setShowAddPostModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmitPost} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium text-sm sm:text-base">
                    📷 Фото
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-firm-pink transition cursor-pointer bg-gray-50"
                    onClick={() =>
                      document.getElementById("post-image-input")?.click()
                    }
                  >
                    <input
                      id="post-image-input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePostImageSelect}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-gray-500 text-sm">
                        Нажмите для выбора файлов
                      </span>
                      <span className="text-xs text-gray-400">
                        PNG, JPG, WEBP до 10MB
                      </span>
                    </div>
                  </div>
                  {postImagePreviews.length > 0 && (
                    <div className="mt-4">
                      <div className="grid grid-cols-4 gap-2 sm:gap-3">
                        {postImagePreviews.map((preview, idx) => (
                          <div
                            key={idx}
                            className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
                          >
                            <img
                              src={preview}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePostImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium text-sm sm:text-base">
                    Заголовок <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={postForm.title}
                    onChange={handlePostInputChange}
                    required
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition text-sm sm:text-base"
                    placeholder="Например: Как выбрать пряжу для зимнего свитера"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium text-sm sm:text-base">
                    Категория
                  </label>
                  <select
                    name="category"
                    value={postForm.category}
                    onChange={handlePostInputChange}
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition text-sm sm:text-base"
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
                  <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium text-sm sm:text-base">
                    Теги
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={postForm.tags}
                    onChange={handlePostInputChange}
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition text-sm sm:text-base"
                    placeholder="Мастер-класс, Обзор, Советы (через запятую)"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium text-sm sm:text-base">
                    Краткое описание
                  </label>
                  <textarea
                    name="excerpt"
                    value={postForm.excerpt}
                    onChange={handlePostInputChange}
                    rows={2}
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition text-sm sm:text-base"
                    placeholder="Краткое описание поста, которое будет отображаться в ленте..."
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium text-sm sm:text-base">
                    Содержание <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="content"
                    value={postForm.content}
                    onChange={handlePostInputChange}
                    rows={10}
                    required
                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition text-sm sm:text-base"
                    placeholder="Напишите ваш пост..."
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <motion.button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-['Montserrat_Alternates'] font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? "⏳ Публикация..." : "📝 Опубликовать"}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setShowAddPostModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Компонент боковой панели с мастерами
function MastersSidebar({
  searchQuery,
  setSearchQuery,
  isSearching,
  showSearchResults,
  searchResults,
  followingMasters,
  recommendedMasters,
  session,
  currentMasterId,
  handleFollow,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  showSearchResults: boolean;
  searchResults: { masters: Master[]; posts: SearchPost[] } | null;
  followingMasters: Master[];
  recommendedMasters: Master[];
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string;
    };
  } | null;
  currentMasterId: string | undefined;
  handleFollow: (masterId: string, isFollowing: boolean) => Promise<void>;
}) {
  // Защита от не-массивов
  const safeFollowingMasters = Array.isArray(followingMasters) ? followingMasters : [];
  const safeRecommendedMasters = Array.isArray(recommendedMasters) ? recommendedMasters : [];
  const safeSearchMasters = searchResults?.masters && Array.isArray(searchResults.masters) ? searchResults.masters : [];
  
  const isCurrentMaster = (masterId: string) => {
    return currentMasterId === masterId;
  };

  return (
    <>
      {/* Поиск */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск по блогу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-firm-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Результаты поиска мастеров */}
      {showSearchResults && safeSearchMasters.length > 0 && (
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
            Мастера ({safeSearchMasters.length})
          </h2>
          <div className="space-y-3">
            {safeSearchMasters.map((master: Master, idx: number) => {
              const isCurrent = isCurrentMaster(master.id);
              return (
                <motion.div
                  key={master.id}
                  className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    href={`/masters/${master.id}`}
                    className="flex items-center gap-3 flex-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                      {master.avatar_url ? (
                        <img
                          src={master.avatar_url}
                          alt={master.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        master.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{master.name}</p>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-firm-orange/10 text-firm-orange text-xs rounded-full font-medium">
                            Вы
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {master.city || "Город не указан"}
                      </p>
                      <div className="flex gap-3 text-xs text-gray-400 mt-1">
                        <span>📦 {master.products_count || 0} товаров</span>
                        <span>📝 {master.posts_count || 0} постов</span>
                      </div>
                    </div>
                  </Link>
                  {session && !isCurrent && (
                    <motion.button
                      onClick={() =>
                        handleFollow(master.id, master.is_following || false)
                      }
                      className={`text-xs px-3 py-1 rounded-full transition ${
                        master.is_following
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-gradient-to-r from-firm-orange to-firm-pink text-white hover:shadow-md"
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {master.is_following ? "Отписаться" : "Подписаться"}
                    </motion.button>
                  )}
                  {!session && !isCurrent && (
                    <Link
                      href={`/auth/signin?callbackUrl=/blog`}
                      className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink text-white hover:shadow-md transition"
                    >
                      Подписаться
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Отслеживаемые мастера */}
      {!showSearchResults && safeFollowingMasters.length > 0 && (
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
            Отслеживаемые
          </h2>
          <div className="space-y-3">
            {safeFollowingMasters.map((master: Master) => {
              const isCurrent = isCurrentMaster(master.id);
              return (
                <div
                  key={master.id}
                  className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition group"
                >
                  <Link
                    href={`/masters/${master.id}`}
                    className="flex items-center gap-3 flex-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                      {master.avatar_url ? (
                        <img
                          src={master.avatar_url}
                          alt={master.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        master.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{master.name}</p>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-firm-orange/10 text-firm-orange text-xs rounded-full font-medium">
                            Вы
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{master.city}</p>
                    </div>
                  </Link>
                  {session && !isCurrent && (
                    <button
                      onClick={() => handleFollow(master.id, true)}
                      className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                    >
                      Отписаться
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Рекомендуемые мастера */}
      {!showSearchResults && safeRecommendedMasters.length > 0 && (
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
            Рекомендуемые
          </h2>
          <div className="space-y-3">
            {safeRecommendedMasters.map((master: Master, idx: number) => {
              const isCurrent = isCurrentMaster(master.id);
              return (
                <motion.div
                  key={master.id}
                  className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    href={`/masters/${master.id}`}
                    className="flex items-center gap-3 flex-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                      {master.avatar_url ? (
                        <img
                          src={master.avatar_url}
                          alt={master.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        master.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{master.name}</p>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-firm-orange/10 text-firm-orange text-xs rounded-full font-medium">
                            Вы
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {master.city || "Город не указан"}
                      </p>
                    </div>
                  </Link>
                  {session && !isCurrent && (
                    <motion.button
                      onClick={() =>
                        handleFollow(master.id, master.is_following || false)
                      }
                      className={`text-xs px-3 py-1 rounded-full transition ${
                        master.is_following
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-gradient-to-r from-firm-orange to-firm-pink text-white hover:shadow-md"
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {master.is_following ? "Отписаться" : "Подписаться"}
                    </motion.button>
                  )}
                  {!session && !isCurrent && (
                    <Link
                      href={`/auth/signin?callbackUrl=/blog`}
                      className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink text-white hover:shadow-md transition"
                    >
                      Подписаться
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </>
  );
}
