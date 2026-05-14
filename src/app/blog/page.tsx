"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import BlogPostCard from "@/components/blog/BlogPostCard";
import AddPostModal from "@/components/modals/AddPostModal";

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
  excerpt?: string;
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
  author_name?: string;
  author_avatar?: string;
  is_liked: boolean;
  comments?: Comment[];
  images?: Array<{ id: string; url: string; sort_order: number }>;
}

interface ApiPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  main_image_url?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  created_at: string;
  master_id: string;
  master_name?: string;
  master_avatar?: string;
  master_city?: string;
  is_liked?: boolean;
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
}

export default function BlogPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [followingMasters, setFollowingMasters] = useState<Master[]>([]);
  const [recommendedMasters, setRecommendedMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState<string | null>(null);
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

      let postsArray: BlogPost[] = [];

      if (postsData.posts && Array.isArray(postsData.posts)) {
        postsArray = postsData.posts.map((post: ApiPost) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt || post.content?.substring(0, 200),
          category: post.category || "",
          tags: post.tags || [],
          main_image_url: post.main_image_url || "",
          views_count: post.views_count || 0,
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          created_at: post.created_at,
          master_id: post.master_id,
          master_name: post.master_name || "Мастер",
          master_avatar: post.master_avatar || "",
          is_liked: post.is_liked || false,
          comments: [],
          images:
            post.images?.map((img) => ({
              id: img.id,
              url: img.image_url,
              sort_order: img.sort_order,
            })) || [],
        }));
      }

      setPosts(postsArray);

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

  const handleComment = async (postId: string, text: string) => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/blog";
      return false;
    }

    if (!text.trim()) return false;

    try {
      const response = await fetch(`/api/blog/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (response.ok) {
        const data = await response.json();
        const newComment = data.comment || data;

        const formattedComment: Comment = {
          id: newComment.id,
          content: newComment.content,
          created_at: newComment.created_at,
          author_id: newComment.author_id || session.user?.id || "",
          author_name:
            newComment.author_name || session.user?.name || "Пользователь",
          author_avatar: newComment.author_avatar || "",
        };

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [formattedComment, ...(p.comments || [])],
                  comments_count: (p.comments_count || 0) + 1,
                }
              : p,
          ),
        );
        setShowComments(postId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error adding comment:", error);
      return false;
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
            (searchResults?.masters && Array.isArray(searchResults.masters)
              ? searchResults.masters.find((m) => m.id === masterId)
              : undefined);
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

        if (
          searchResults &&
          searchResults.masters &&
          Array.isArray(searchResults.masters)
        ) {
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
      toast.error("Можно загрузить не более 10 фотографий");
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 10MB`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`Файл ${file.name} не является изображением`);
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
      toast.success("Пост успешно создан!");
    } catch (error) {
      console.error("Ошибка при создании поста:", error);
      toast.error("Ошибка при создании поста");
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

        {/* Правая колонка - посты с использованием BlogPostCard */}
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
              <p className="text-lg">
                {searchQuery ? "Посты не найдены" : "Пока нет постов"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {displayPosts.map((post) => {
                const normalizedPost = {
                  id: post.id,
                  title: post.title,
                  content: post.content,
                  excerpt:
                    "excerpt" in post
                      ? post.excerpt
                      : post.content?.substring(0, 200),
                  images: post.images || [],
                  main_image_url: post.main_image_url || "",
                  created_at: post.created_at,
                  views_count: ("views_count" in post
                    ? post.views_count
                    : 0) as number,
                  likes_count: post.likes_count || 0,
                  comments_count: post.comments_count || 0,
                  author_name: post.master_name,
                  author_avatar: post.master_avatar || "",
                  master_id: post.master_id,
                  master_name: post.master_name,
                  master_avatar: post.master_avatar,
                  is_liked: post.is_liked || false,
                  comments: ("comments" in post && post.comments
                    ? post.comments
                    : []
                  ).map(
                    (comment: {
                      id: string;
                      content: string;
                      created_at: string;
                      updated_at?: string;
                      is_edited?: boolean;
                      author_id?: string;
                      author_name: string;
                      author_avatar?: string;
                    }) => ({
                      id: comment.id,
                      content: comment.content,
                      created_at: comment.created_at,
                      updated_at: comment.updated_at || comment.created_at,
                      is_edited: comment.is_edited || false,
                      author_id: comment.author_id || "",
                      author_name: comment.author_name,
                      author_avatar: comment.author_avatar,
                    }),
                  ),
                };

                return (
                  <BlogPostCard
                    key={post.id}
                    post={normalizedPost}
                    showComments={showComments === post.id}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно добавления поста */}
      <AddPostModal
        isOpen={showAddPostModal}
        onClose={() => setShowAddPostModal(false)}
        onSuccess={() => {
          resetPostForm();
          fetchData();
        }}
        session={session}
      />
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
  const safeFollowingMasters = Array.isArray(followingMasters)
    ? followingMasters
    : [];
  const safeRecommendedMasters = Array.isArray(recommendedMasters)
    ? recommendedMasters
    : [];
  const safeSearchMasters =
    searchResults?.masters && Array.isArray(searchResults.masters)
      ? searchResults.masters
      : [];

  const isCurrentMaster = (masterId: string) => currentMasterId === masterId;

  return (
    <>
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
              <div className="w-4 h-4 border-2 border-firm-orange border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

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
            {safeSearchMasters.map((master, idx) => {
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
                        <Image
                          src={master.avatar_url}
                          alt={master.name}
                          width={40}
                          height={40}
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
                      className={`text-xs px-3 py-1 rounded-full transition ${master.is_following ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-gradient-to-r from-firm-orange to-firm-pink text-white hover:shadow-md"}`}
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
            {safeFollowingMasters.map((master) => {
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
                        <Image
                          src={master.avatar_url}
                          alt={master.name}
                          width={40}
                          height={40}
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
            {safeRecommendedMasters.map((master, idx) => {
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
                        <Image
                          src={master.avatar_url}
                          alt={master.name}
                          width={40}
                          height={40}
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
                      className={`text-xs px-3 py-1 rounded-full transition ${master.is_following ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-gradient-to-r from-firm-orange to-firm-pink text-white hover:shadow-md"}`}
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