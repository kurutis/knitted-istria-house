"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";
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
  const [searchResults, setSearchResults] = useState<{masters: Master[];posts: SearchPost[];} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);
  const [postForm, setPostForm] = useState({title: "", content: "", excerpt: "", category: "", tags: ""});
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

      if (postsData.posts && Array.isArray(postsData.posts)) {postsArray = postsData.posts.map((post: ApiPost) => ({id: post.id, title: post.title, content: post.content, excerpt: post.excerpt || post.content?.substring(0, 200), category: post.category || "", tags: post.tags || [], main_image_url: post.main_image_url || "", views_count: post.views_count || 0, likes_count: post.likes_count || 0, comments_count: post.comments_count || 0, created_at: post.created_at, master_id: post.master_id,  master_name: post.master_name || "Мастер",  master_avatar: post.master_avatar || "",  is_liked: post.is_liked || false, comments: [], images: post.images?.map((img) => ({ id: img.id, url: img.image_url, sort_order: img.sort_order})) || []}))}

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

  const handleFollow = async (masterId: string, isFollowing: boolean) => {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/blog";
      return;
    }

    try {
      const method = isFollowing ? "DELETE" : "POST";
      const response = await fetch("/api/masters/follow", {method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ masterId })});

      if (response.ok) {
        const data = await response.json();

        if (data.is_following) {
          const masterToAdd = recommendedMasters.find((m) => m.id === masterId) || (searchResults?.masters && Array.isArray(searchResults.masters) ? searchResults.masters.find((m) => m.id === masterId) : undefined);
          if (masterToAdd && !followingMasters.find((m) => m.id === masterId)) {
            setFollowingMasters((prev) => [{ ...masterToAdd, is_following: true }, ...prev,])}
        } else {
          setFollowingMasters((prev) => prev.filter((m) => m.id !== masterId));
        }

        setRecommendedMasters((prev) => prev.map((m) => m.id === masterId ? { ...m, is_following: data.is_following } : m ));

        if (
          searchResults &&
          searchResults.masters &&
          Array.isArray(searchResults.masters)
        ) {
          setSearchResults({...searchResults, masters: searchResults.masters.map((m) => m.id === masterId ? { ...m, is_following: data.is_following } : m)});
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const resetPostForm = () => {
    setPostForm({ title: "", content: "", excerpt: "", category: "", tags: ""});
    setPostImages([]);
    setPostImagePreviews([]);
  };

  const showSearchResults = searchQuery.trim() !== "" && searchResults !== null;
  const displayPosts = showSearchResults ? searchResults.posts : posts;

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

  return (
    <motion.div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Блог</h1>
        {isMaster && (<motion.button onClick={() => setShowAddPostModal(true)} className="px-4 py-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition flex items-center gap-2 text-sm sm:text-base" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Написать пост</motion.button>)}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {!isMobile && (
          <div className="w-full lg:w-80 shrink-0">
            <MastersSidebar searchQuery={searchQuery} setSearchQuery={setSearchQuery} isSearching={isSearching} showSearchResults={showSearchResults} searchResults={searchResults} followingMasters={followingMasters} recommendedMasters={recommendedMasters} session={session} currentMasterId={currentMasterId} handleFollow={handleFollow} />
          </div>
        )}

        {isMobile && (
          <motion.button onClick={() => setShowMobileMasters(!showMobileMasters)} className="flex items-center justify-between w-full p-3 bg-main rounded-xl shadow-md"whileTap={{ scale: 0.98 }}><span className="font-['Montserrat_Alternates'] font-medium">Мастера и рекомендации</span><motion.svg className="w-5 h-5 text-firm-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24" animate={{ rotate: showMobileMasters ? 180 : 0 }} transition={{ duration: 0.3 }} ><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></motion.svg></motion.button>)}

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
                <MastersSidebar searchQuery={searchQuery} setSearchQuery={setSearchQuery} isSearching={isSearching} showSearchResults={showSearchResults} searchResults={searchResults} followingMasters={followingMasters} recommendedMasters={recommendedMasters} session={session} currentMasterId={currentMasterId} handleFollow={handleFollow} /></div></motion.div>)}</AnimatePresence>

        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6 overflow-hidden">
          {showSearchResults && (<div className="bg-linear-to-r from-firm-orange/10 to-firm-pink/10 rounded-xl p-3 text-xs sm:text-sm text-gray-600 wrap-break-word flex items-center gap-2"><svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.4402 20.6277H21.9589L21.4339 20.1214C22.6057 18.7601 23.4621 17.1566 23.9419 15.4257C24.4216 13.6948 24.5128 11.8792 24.2089 10.1089C23.3277 4.89645 18.9777 0.733949 13.7277 0.0964494C11.882 -0.137052 10.0073 0.0547712 8.24712 0.657241C6.48694 1.25971 4.88791 2.25686 3.57238 3.57238C2.25686 4.88791 1.25971 6.48694 0.657241 8.24712C0.0547711 10.0073 -0.137052 11.882 0.0964494 13.7277C0.733949 18.9777 4.89645 23.3277 10.1089 24.209C11.8792 24.5128 13.6948 24.4216 15.4257 23.9419C17.1566 23.4621 18.7601 22.6057 20.1214 21.434L20.6277 21.959V23.4402L28.5964 31.409C29.3652 32.1777 30.6214 32.1777 31.3902 31.409C32.1589 30.6402 32.1589 29.384 31.3902 28.6152L23.4402 20.6277ZM12.1902 20.6277C7.52145 20.6277 3.7527 16.8589 3.7527 12.1902C3.7527 7.52145 7.52145 3.7527 12.1902 3.7527C16.8589 3.7527 20.6277 7.52145 20.6277 12.1902C20.6277 16.8589 16.8589 20.6277 12.1902 20.6277Z" fill="#D97C8E"/></svg><span>Найдено {searchResults.masters?.length || 0} мастеров и {searchResults.posts?.length || 0} постов по запросу &quot;{searchQuery}&quot;</span></div>)}
          {displayPosts.length === 0 ? (
            <div className="bg-main rounded-2xl shadow-xl p-8 sm:p-12 text-center text-firm-gray">
              <p className="text-lg">{searchQuery ? "Посты не найдены" : "Пока нет постов"}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {displayPosts.map((post) => {const normalizedPost = {id: post.id, title: post.title, content: post.content, excerpt:  "excerpt" in post  ? post.excerpt   : post.content?.substring(0, 200), images: post.images || [], main_image_url: post.main_image_url || "", created_at: post.created_at,views_count: ("views_count" in post  ? post.views_count  : 0) as number, likes_count: post.likes_count || 0, comments_count: post.comments_count || 0, author_name: post.master_name, author_avatar: post.master_avatar || "", master_id: post.master_id, master_name: post.master_name, master_avatar: post.master_avatar, is_liked: post.is_liked || false, comments: ("comments" in post && post.comments  ? post.comments  : [] ).map((comment: {id: string; content: string; created_at: string; updated_at?: string; is_edited?: boolean; author_id?: string; author_name: string; author_avatar?: string;}) => ({id: comment.id, content: comment.content, created_at: comment.created_at, updated_at: comment.updated_at || comment.created_at, is_edited: comment.is_edited || false, author_id: comment.author_id || "", author_name: comment.author_name, author_avatar: comment.author_avatar}))};

                return (<BlogPostCard key={post.id} post={normalizedPost} showComments={showComments === post.id} />);
              })}
            </div>
          )}
        </div>
      </div>

      <AddPostModal isOpen={showAddPostModal} onClose={() => setShowAddPostModal(false)} onSuccess={() => {resetPostForm(); fetchData(); }} session={session} />
    </motion.div>
  );
}

function MastersSidebar({searchQuery, setSearchQuery, isSearching, showSearchResults, searchResults, followingMasters, recommendedMasters, session, currentMasterId, handleFollow}: {searchQuery: string; setSearchQuery: (query: string) => void; isSearching: boolean; showSearchResults: boolean; searchResults: { masters: Master[]; posts: SearchPost[] } | null; followingMasters: Master[]; recommendedMasters: Master[]; session: {user?: {id?: string; name?: string | null; email?: string | null; role?: string}} | null; currentMasterId: string | undefined; handleFollow: (masterId: string, isFollowing: boolean) => Promise<void>;}) {
  const safeFollowingMasters = Array.isArray(followingMasters)  ? followingMasters  : [];
  const safeRecommendedMasters = Array.isArray(recommendedMasters)  ? recommendedMasters  : [];
  const safeSearchMasters = searchResults?.masters && Array.isArray(searchResults.masters)  ? searchResults.masters  : [];

  const isCurrentMaster = (masterId: string) => currentMasterId === masterId;

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <input type="text" placeholder="Поиск по блогу..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-3 pl-10 rounded-xl bg-forms outline-none focus:ring-2 focus:ring-firm-orange transition text-sm" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-firm-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24" >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-firm-orange border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {showSearchResults && safeSearchMasters.length > 0 && (
        <motion.div className="bg-main rounded-2xl shadow-xl p-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Мастера ({safeSearchMasters.length})</h2>
          <div className="space-y-3">
            {safeSearchMasters.map((master, idx) => {
              const isCurrent = isCurrentMaster(master.id);
              return (
                <motion.div key={master.id} className="flex items-center gap-3 hover:bg-main p-2 rounded-xl transition group" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Link href={`/masters/${master.id}`} className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                      {master.avatar_url ? (
                        <Image src={master.avatar_url} alt={master.name} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        master.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{master.name}</p>
                        {isCurrent && (<span className="px-2 py-0.5 bg-firm-orange/10 text-firm-orange text-xs rounded-full font-medium">Вы</span>)}
                      </div>
                      <p className="text-xs text-firm-gray">{master.city || "Город не указан"}</p>
                      <div className="flex gap-3 text-xs text-firm-gray mt-1">
                        <span className="flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.14627 33.25H29.4532C29.9487 33.25 30.3495 32.9503 30.3495 32.58V4.06481C30.3495 3.69444 29.9487 3.39478 29.4532 3.39478C28.5209 3.39478 27.5841 3.39478 26.6518 3.39478C28.5525 3.39478 30.4531 3.39478 32.3537 3.39478C32.8492 3.39478 33.25 3.69444 33.25 4.06481V32.58C33.25 32.9503 32.8492 33.25 32.3537 33.25H2.14627ZM2.14627 33.25C1.65084 33.25 1.25 32.9503 1.25 32.58V4.06481C1.25 3.69444 1.65084 3.39478 2.14627 3.39478M2.14627 3.39478H5.65479M2.14627 3.39478H5.64577M8.67236 3.39478C13.6671 3.39478 18.6664 3.39478 23.6612 3.39478M8.7309 3.39478C13.7167 3.39478 18.707 3.39478 23.6928 3.39478M11.4062 10.149H25.742M10.2352 14.1456H24.571M10.8342 18.1423H25.1746M11.69 21.8426H26.0258M10.8342 26.2736H25.1746M6.55556 1.25H7.77611C8.27111 1.25 8.67238 1.54998 8.67238 1.92003V6.36448C8.67238 6.73453 8.27111 7.03451 7.77611 7.03451H6.55556C6.06057 7.03451 5.65928 6.73453 5.65928 6.36448V1.92003C5.65928 1.54998 6.06057 1.25 6.55556 1.25ZM24.562 1.25H25.7826C26.2776 1.25 26.6788 1.54998 26.6788 1.92003V6.36448C26.6788 6.73453 26.2776 7.03451 25.7826 7.03451H24.562C24.067 7.03451 23.6657 6.73453 23.6657 6.36448V1.92003C23.6657 1.54998 24.067 1.25 24.562 1.25ZM6.55556 8.883H8.14993C8.64492 8.883 9.04621 9.18298 9.04621 9.55303V10.7449C9.04621 11.115 8.64492 11.415 8.14993 11.415H6.55556C6.06057 11.415 5.65928 11.115 5.65928 10.7449V9.55303C5.65928 9.18298 6.06057 8.883 6.55556 8.883ZM6.55556 12.8796H8.14993C8.64492 12.8796 9.04621 13.1796 9.04621 13.5497V14.7416C9.04621 15.1116 8.64492 15.4116 8.14993 15.4116H6.55556C6.06057 15.4116 5.65928 15.1116 5.65928 14.7416V13.5497C5.65928 13.1796 6.06057 12.8796 6.55556 12.8796ZM6.3709 16.8763H7.96526C8.46026 16.8763 8.86154 17.1762 8.86154 17.5463V18.7382C8.86154 19.1083 8.46026 19.4083 7.96526 19.4083H6.3709C5.87591 19.4083 5.47462 19.1083 5.47462 18.7382V17.5463C5.47462 17.1762 5.87591 16.8763 6.3709 16.8763ZM6.55556 20.5766H8.14993C8.64492 20.5766 9.04621 20.8766 9.04621 21.2466V22.4386C9.04621 22.8086 8.64492 23.1086 8.14993 23.1086H6.55556C6.06057 23.1086 5.65928 22.8086 5.65928 22.4386V21.2466C5.65928 20.8766 6.06057 20.5766 6.55556 20.5766ZM6.55556 25.0076H8.14993C8.64492 25.0076 9.04621 25.3076 9.04621 25.6776V26.8695C9.04621 27.2396 8.64492 27.5396 8.14993 27.5396H6.55556C6.06057 27.5396 5.65928 27.2396 5.65928 26.8695V25.6776C5.65928 25.3076 6.06057 25.0076 6.55556 25.0076Z" stroke="#D97C8E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {master.products_count || 0} товаров
                        </span>
                        <span className="flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4H20V20H4V4Z" stroke="#D97C8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 8H16" stroke="#D97C8E" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M8 12H14" stroke="#D97C8E" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M8 16H12" stroke="#D97C8E" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          {master.posts_count || 0} постов
                        </span>
                      </div>
                    </div>
                  </Link>
                  {session && !isCurrent && (<motion.button onClick={() => handleFollow(master.id, master.is_following || false)} className={`text-xs px-3 py-1 rounded-full transition ${master.is_following ? "bg-gray-200 text-text hover:bg-gray-300" : "bg-linear-to-r from-firm-orange to-firm-pink text-main hover:shadow-md"}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>{master.is_following ? "Отписаться" : "Подписаться"}</motion.button> )}
                  {!session && !isCurrent && (<Link href={`/auth/signin?callbackUrl=/blog`} className="text-xs px-3 py-1 rounded-full bg-linear-to-r from-firm-orange to-firm-pink text-main hover:shadow-md transition">Подписаться</Link>)}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {!showSearchResults && safeFollowingMasters.length > 0 && (
        <motion.div className="bg-main rounded-2xl shadow-xl p-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Отслеживаемые</h2>
          <div className="space-y-3">
            {safeFollowingMasters.map((master) => {
              const isCurrent = isCurrentMaster(master.id);
              return (
                <div key={master.id} className="flex items-center gap-3 hover:bg-main p-2 rounded-xl transition group">
                  <Link href={`/masters/${master.id}`} className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                      {master.avatar_url ? (
                        <Image src={master.avatar_url} alt={master.name} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        master.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{master.name}</p>
                        {isCurrent && (<span className="px-2 py-0.5 bg-firm-orange/10 text-firm-orange text-xs rounded-full font-medium">Вы</span>)}
                      </div>
                      <p className="text-xs text-gray-400">{master.city}</p>
                    </div>
                  </Link>
                  {session && !isCurrent && (<button onClick={() => handleFollow(master.id, true)} className="text-xs px-3 py-1 rounded-full bg-gray-200 text-text hover:bg-gray-300 transition">Отписаться</button>)}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {!showSearchResults && safeRecommendedMasters.length > 0 && (
        <motion.div className="bg-main rounded-2xl shadow-xl p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Рекомендуемые</h2>
          <div className="space-y-3">
            {safeRecommendedMasters.map((master, idx) => {
              const isCurrent = isCurrentMaster(master.id);
              return (
                <motion.div key={master.id} className="flex items-center gap-3 hover:bg-main p-2 rounded-xl transition group" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Link href={`/masters/${master.id}`} className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold overflow-hidden shadow-md">
                      {master.avatar_url ? (
                        <Image src={master.avatar_url} alt={master.name} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        master.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{master.name}</p>
                        {isCurrent && (<span className="px-2 py-0.5 bg-firm-orange/10 text-firm-orange text-xs rounded-full font-medium">Вы</span>)}
                      </div>
                      <p className="text-xs text-firm-gray">{master.city || "Город не указан"}</p>
                    </div>
                  </Link>
                  {session && !isCurrent && (
                    <motion.button
                      onClick={() =>
                        handleFollow(master.id, master.is_following || false)
                      }
                      className={`text-xs px-3 py-1 rounded-full transition ${master.is_following ? "bg-gray-200 text-text hover:bg-gray-300" : "bg-linear-to-r from-firm-orange to-firm-pink text-main hover:shadow-md"}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>{master.is_following ? "Отписаться" : "Подписаться"}</motion.button>)}
                  {!session && !isCurrent && ( <Link href={`/auth/signin?callbackUrl=/blog`} className="text-xs px-3 py-1 rounded-full bg-linear-to-r from-firm-orange to-firm-pink text-main hover:shadow-md transition">Подписаться</Link>)}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </>
  );
}