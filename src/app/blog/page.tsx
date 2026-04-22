"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { debounce } from "lodash";
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
  comments: Comment[];
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

      // Загружаем посты
      const postsRes = await fetch("/api/blog/posts");
      const postsData = await postsRes.json();
      setPosts(postsData || []);

      // Загружаем мастеров (подписки и рекомендации)
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
                  comments_count: p.comments_count + 1,
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

        // Обновляем followingMasters
        if (data.is_following) {
          // Если подписались - нужно добавить мастера в followingMasters
          // Находим мастера в recommendedMasters или searchResults
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
          // Если отписались - удаляем из followingMasters
          setFollowingMasters((prev) => prev.filter((m) => m.id !== masterId));
        }

        // Обновляем recommendedMasters (меняем статус is_following)
        setRecommendedMasters((prev) =>
          prev.map((m) =>
            m.id === masterId ? { ...m, is_following: data.is_following } : m,
          ),
        );

        // Обновляем searchResults если есть
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
          <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">
            Загрузка...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">
          Блог
        </h1>
        {isMaster && (
          <button
            onClick={() => setShowAddPostModal(true)}
            className="px-4 py-2 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"
          >
            Написать пост
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Левая колонка - мастера */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по блогу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 pl-10 rounded-lg bg-[#f1f1f1] outline-firm-orange"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
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
                  <div className="w-5 h-5 border-2 border-firm-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {showSearchResults &&
            searchResults.masters &&
            searchResults.masters.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">
                  Мастера ({searchResults.masters.length})
                </h2>
                <div className="space-y-3">
                  {searchResults.masters.map((master) => (
                    <div
                      key={master.id}
                      className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition"
                    >
                      <Link
                        href={`/masters/${master.id}`}
                        className="flex items-center gap-3 flex-1"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
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
                          <p className="font-medium">{master.name}</p>
                          <p className="text-xs text-gray-400">
                            {master.city || "Город не указан"}
                          </p>
                          <div className="flex gap-3 text-xs text-gray-400 mt-1">
                            <span>📦 {master.products_count || 0} товаров</span>
                            <span>📝 {master.posts_count || 0} постов</span>
                          </div>
                        </div>
                      </Link>
                      {session && currentMasterId !== master.id && (
                        <button
                          onClick={() =>
                            handleFollow(
                              master.id,
                              master.is_following || false,
                            )
                          }
                          className={`text-xs px-3 py-1 rounded-full transition ${
                            master.is_following
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              : "bg-firm-orange text-white hover:bg-opacity-90"
                          }`}
                        >
                          {master.is_following ? "Отписаться" : "Подписаться"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {!showSearchResults && (
            <>
              {followingMasters.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">
                    Отслеживаемые
                  </h2>
                  <div className="space-y-3">
                    {followingMasters.map((master) => (
                      <div
                        key={master.id}
                        className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition"
                      >
                        <Link
                          href={`/masters/${master.id}`}
                          className="flex items-center gap-3 flex-1"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
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
                            <p className="font-medium">{master.name}</p>
                            <p className="text-xs text-gray-400">
                              {master.city}
                            </p>
                          </div>
                        </Link>
                        {currentMasterId !== master.id && (
                          <button
                            onClick={() => handleFollow(master.id, true)}
                            className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                          >
                            Отписаться
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendedMasters.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">
                    Рекомендуемые
                  </h2>
                  <div className="space-y-3">
                    {recommendedMasters.map((master) => (
                      <div
                        key={master.id}
                        className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition"
                      >
                        <Link
                          href={`/masters/${master.id}`}
                          className="flex items-center gap-3 flex-1"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
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
                            <p className="font-medium">{master.name}</p>
                            <p className="text-xs text-gray-400">
                              {master.city || "Город не указан"}
                            </p>
                          </div>
                        </Link>
                        {session && currentMasterId !== master.id && (
                          <button
                            onClick={() =>
                              handleFollow(
                                master.id,
                                master.is_following || false,
                              )
                            }
                            className={`text-xs px-3 py-1 rounded-full transition ${
                              master.is_following
                                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                : "bg-firm-orange text-white hover:bg-opacity-90"
                            }`}
                          >
                            {master.is_following ? "Отписаться" : "Подписаться"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Правая колонка - посты */}
        <div className="flex-1 space-y-6 w-2/3">
          {showSearchResults && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              Найдено {searchResults.masters?.length || 0} мастеров и{" "}
              {searchResults.posts?.length || 0} постов по запросу "
              {searchQuery}"
            </div>
          )}

          {displayPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <p>{searchQuery ? "Посты не найдены" : "Пока нет постов"}</p>
            </div>
          ) : (
            displayPosts.map((post: any) => (
              <div
                key={post.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between border-b border-gray-200">
                  <Link
                    href={`/masters/${post.master_id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
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
                      <p className="font-semibold">{post.master_name}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(post.created_at)}
                      </p>
                    </div>
                  </Link>
                </div>

                <div className="p-4">
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-2">
                    {showSearchResults && post.highlighted_title ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: post.highlighted_title,
                        }}
                      />
                    ) : (
                      post.title
                    )}
                  </h3>

                  {(post.images?.length > 0 || post.main_image_url) && (
                    <MediaGallery
                      images={
                        post.images || [
                          {
                            url: post.main_image_url,
                            id: "main",
                            sort_order: 0,
                          },
                        ]
                      }
                      video={null}
                      title={post.title}
                    />
                  )}

                  <div className="text-gray-700 mt-4">
                    {showSearchResults && post.highlighted_content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: post.highlighted_content + "...",
                        }}
                        className="line-clamp-3"
                      />
                    ) : (
                      <p className="line-clamp-3">
                        {post.content?.substring(0, 300)}...
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/blog/${post.id}`}
                    className="text-firm-orange hover:underline text-sm mt-2 inline-block"
                  >
                    Читать полностью →
                  </Link>
                </div>

                <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-6">
                  <AnimatedButton
                    icon={
                      <svg
                        className="w-6 h-6"
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
                        className="w-6 h-6"
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
                    count={post.comments_count}
                    isActive={showComments === post.id}
                    onClick={() =>
                      setShowComments(showComments === post.id ? null : post.id)
                    }
                    activeColor="text-firm-orange"
                  />

                  <div className="flex-1"></div>
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
                </div>

                {showComments === post.id && (
                  <div className="px-4 py-3 border-t bg-gray-50">
                    {session && (
                      <div className="flex gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {session.user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Написать комментарий..."
                            rows={2}
                            className="w-full p-2 rounded-lg bg-white border border-gray-200 outline-firm-orange text-sm"
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={commentLoading || !commentText.trim()}
                            className="mt-2 px-4 py-1.5 bg-firm-orange text-white rounded-lg text-sm hover:bg-opacity-90 transition disabled:opacity-50"
                          >
                            {commentLoading ? "Отправка..." : "Отправить"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {post.comments?.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">
                          Будьте первым, кто оставит комментарий
                        </p>
                      ) : (
                        post.comments?.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
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
                              <div className="bg-white rounded-lg p-3">
                                <p className="font-semibold text-sm">
                                  {comment.author_name}
                                </p>
                                <p className="text-gray-700 text-sm mt-1">
                                  {comment.content}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDate(comment.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Модальное окно добавления поста */}
      {showAddPostModal && isMaster && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddPostModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">
                Новая запись в блоге
              </h2>
              <button
                onClick={() => setShowAddPostModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitPost} className="p-6 space-y-6">
              <div>
                <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] font-medium">
                  Добавьте фото
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-firm-pink transition cursor-pointer"
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
                      className="w-12 h-12 text-gray-400"
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
                    <span className="text-gray-500">Загрузить изображение</span>
                    <span className="text-xs text-gray-400">
                      PNG, JPG, WEBP до 10MB
                    </span>
                  </div>
                </div>
                {postImagePreviews.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-4 gap-3">
                      {postImagePreviews.map((preview, idx) => (
                        <div
                          key={idx}
                          className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200"
                        >
                          <img
                            src={preview}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePostImage(idx)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
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
                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                  Заголовок <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={postForm.title}
                  onChange={handlePostInputChange}
                  required
                  className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                  placeholder="Например: Как выбрать пряжу для зимнего свитера"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                  Категория
                </label>
                <select
                  name="category"
                  value={postForm.category}
                  onChange={handlePostInputChange}
                  className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
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
                  Теги
                </label>
                <input
                  type="text"
                  name="tags"
                  value={postForm.tags}
                  onChange={handlePostInputChange}
                  className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                  placeholder="Мастер-класс, Обзор, Советы (через запятую)"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                  Краткое описание (анонс)
                </label>
                <textarea
                  name="excerpt"
                  value={postForm.excerpt}
                  onChange={handlePostInputChange}
                  rows={2}
                  className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                  placeholder="Краткое описание поста, которое будет отображаться в ленте..."
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates'] font-medium">
                  Содержание <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="content"
                  value={postForm.content}
                  onChange={handlePostInputChange}
                  rows={10}
                  required
                  className="w-full p-3 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                  placeholder="Напишите ваш пост..."
                />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50 font-['Montserrat_Alternates'] font-medium"
                >
                  {saving ? "Публикация..." : "Опубликовать пост"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPostModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
