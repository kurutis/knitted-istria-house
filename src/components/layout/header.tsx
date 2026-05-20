"use client";

import Link from "next/link";
import logo from "../../../public/logo.svg";
import Image from "next/image";
import cart from "../../../public/cart.svg";
import favorite from "../../../public/favorites.svg";
import profile from "../../../public/profile.svg";
import blog from "../../../public/blog.svg"
import catalog from "../../../public/catalog.svg"
import classes from "../../../public/classes.svg"
import home from "../../../public/home.svg"
import chats from "../../../public/chat.svg"
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const getProxiedAvatarUrl = (url: string | null) => {
  if (!url) return null;
  if (url.includes('/api/proxy/avatar') || url.includes('selstorage.ru')) {
    return url;
  }
  return `/api/proxy/avatar?url=${encodeURIComponent(url)}`;
};

export default function Header() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = !!session?.user;
  const isBuyer = session?.user?.role === "buyer";
  const isMaster = session?.user?.role === "master";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [avatarError, setAvatarError] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!isAuthenticated || !(isBuyer || isMaster)) return;

      try {
        const response = await fetch("/api/chats/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error loading unread count:", error);
      }
    };

    loadUnreadCount();
    
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isBuyer, isMaster]);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isAuthenticated) {
        setProfileLoaded(true);
        return;
      }

      try {
        if (isMaster) {
          const response = await fetch("/api/master/profile");
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.profile) {
              const profileData = data.profile;
              if (profileData.avatar_url) {
                setAvatarUrl(profileData.avatar_url);
              }
              if (profileData.fullname && profileData.fullname.trim()) {
                setUserName(profileData.fullname);
              } else {
                const email = session?.user?.email;
                if (email) setUserName(email.split('@')[0]);
                else setUserName("Мастер");
              }
            }
          }
        } 
        else {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const data = await response.json();
            let avatar = null;
            let name = "";
            
            if (data.profile) {
              avatar = data.profile.avatar_url;
              name = data.profile.fullname || data.profile.full_name || "";
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
              const email = session?.user?.email;
              if (email) setUserName(email.split('@')[0]);
              else setUserName("Пользователь");
            }
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        const email = session?.user?.email;
        if (email) setUserName(email.split('@')[0]);
      } finally {
        setProfileLoaded(true);
      }
    };

    loadUserProfile();
  }, [isAuthenticated, isMaster, session?.user?.email]);

  const getInitials = () => {
    if (!profileLoaded) return "U";
    if (userName && userName.length > 0) {return userName.charAt(0).toUpperCase();}
    return "U";
  };

  const proxiedAvatarUrl = getProxiedAvatarUrl(avatarUrl);

  const navLinks = [{ href: "/catalog", label: "🧶", name: "Каталог" }, { href: "/blog", label: "📝", name: "Блог" }, { href: "/master-classes", label: "🎓", name: "Мастер-классы" }]

  return (
    <>
      <motion.header initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.5, type: "spring", stiffness: 100 }} className={`fixed top-0 z-40 w-full transition-all duration-500 ${isScrolled ? "bg-main/95 backdrop-blur-md shadow-lg" : "bg-main"}`}>
        <div className="py-2.5 md:py-3">
          <nav className="container mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex justify-center lg:justify-between items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 400, damping: 10 }} className="flex gap-2 sm:gap-3 items-center shrink-0" >
                <Link href="/" className="flex items-center gap-2 sm:gap-3"><Image className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" src={logo} alt="logo" /> <div className="font-Montserrat_Alternates font-bold leading-tight"><span className="text-firm-pink font-semibold font-Montserrat_Alternates text-xs sm:text-sm md:text-base">Дом{" "}</span><span className="text-firm-orange font-semibold font-Montserrat_Alternates text-xs sm:text-sm md:text-base">вязанных</span><br /><span className="text-firm-pink font-semibold font-Montserrat_Alternates text-xs sm:text-sm md:text-base">историй</span></div></Link>
              </motion.div>

              <ul className="hidden lg:flex justify-between w-150 xl:gap-10">
                {navLinks.map((link, index) => (
                  <motion.li key={link.href} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}><Link className="font-Montserrat_Alternates font-semibold hover:font-bold transition-all duration-300 relative group" href={link.href} >{link.name} <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-firm-orange transition-all duration-300 group-hover:w-full" /></Link></motion.li>))}
              </ul>

              <div className="hidden lg:flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {isAuthenticated && (isBuyer || isMaster) && (
                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }} className="relative">
                    <Link href="/chats"><Image src={chats} alt="chats" className="sm:w-6 sm:h-6 md:w-7 md:h-7" style={{ width: '24px', height: '24px' }} /></Link>
                    {unreadCount > 0 && (<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-firm-red text-main text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">{unreadCount > 9 ? '9+' : unreadCount}</motion.span>)}
                  </motion.div>
                )}

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/shopping-cart"><Image src={cart} alt="shopping cart" className="sm:w-6 sm:h-6 md:w-7 md:h-7" style={{ width: '24px', height: '24px' }} /></Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/favorites"><Image src={favorite} alt="favorites" className="sm:w-6 sm:h-6 md:w-7 md:h-7" style={{ width: '24px', height: '24px' }} /></Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  {isLoading ? (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-forms animate-pulse" />
                  ) : isAuthenticated ? (
                    <Link href="/profile" className="block">
                      {proxiedAvatarUrl && !avatarError ? (
                        <img src={proxiedAvatarUrl} alt="profile" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-white/50 hover:ring-firm-orange transition-all duration-300" onError={() => setAvatarError(true)} />
                      ) : (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-xs sm:text-sm font-bold">{getInitials()}</div>
                      )}
                    </Link>
                  ) : (
                    <Link href="/auth/signin" className="block"><Image src={profile} alt="profile" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" /></Link>
                  )}
                </motion.div>
              </div>
            </div>
          </nav>
        </div>
      </motion.header>

      <div className="fixed bottom-4 left-0 right-0 z-40 lg:hidden">
        <div className="flex justify-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl px-4 py-2 mx-auto inline-flex">
            <div className="flex items-center gap-5">
              {isAuthenticated ? (
                <>
                  <Link href="/" className="flex flex-col items-center gap-1 transition-all duration-300 text-firm-gray hover:text-firm-orange"><Image src={home} alt="Главная" className="w-5 h-5" /><span className="text-[10px] font-medium">Главная</span></Link>
                  <Link href="/catalog" className="flex flex-col items-center gap-1 transition-all duration-300 text-firm-gray hover:text-firm-orange"><Image src={catalog} alt="Каталог" className="w-5 h-5" /><span className="text-[10px] font-medium">Каталог</span></Link>
                  <Link href="/chats" className="relative flex flex-col items-center gap-1 transition-all duration-300 text-firm-gray hover:text-firm-orange"><div className="relative"><Image src={chats} alt="Чаты" className="w-5 h-5" /> {unreadCount > 0 && (<span className="absolute -top-2 -right-2 bg-firm-red text-main text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>)}</div><span className="text-[10px] font-medium">Чаты</span></Link>
                  <Link href="/profile" className="flex flex-col items-center gap-1 transition-all duration-300 text-gray-500 hover:text-firm-orange">
                    {proxiedAvatarUrl && !avatarError ? (
                      <img src={proxiedAvatarUrl} alt="profile" className="w-5 h-5 rounded-full object-cover" onError={() => setAvatarError(true)} />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-[10px] font-bold">
                        {getInitials()}
                      </div>
                    )}
                    <span className="text-[10px] font-medium">Профиль</span>
                  </Link>
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex flex-col items-center gap-1 transition-all duration-300 text-firm-gray hover:text-firm-orange">
                    <div className="relative w-5 h-5 flex flex-col items-center justify-center gap-1">
                      <motion.span animate={isMenuOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }} className="w-4 h-0.5 bg-current rounded-full transition-all duration-300" />
                      <motion.span animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-4 h-0.5 bg-current rounded-full transition-all duration-300" />
                      <motion.span animate={isMenuOpen ? { rotate: -45, y: -4.5 } : { rotate: 0, y: 0 }} className="w-4 h-0.5 bg-current rounded-full transition-all duration-300" />
                    </div>
                    <span className="text-[10px] font-medium">Меню</span>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/" className="flex flex-col items-center gap-1 transition-all duration-300 text-firm-gray hover:text-firm-orange"><Image src={home} alt="Главная" className="w-5 h-5" /><span className="text-[10px] font-medium">Главная</span></Link>                  
                  <Link href="/catalog" className="flex flex-col items-center gap-1 transition-all duration-300 text-firm-gray hover:text-firm-orange"><Image src={catalog} alt="Каталог" className="w-5 h-5" /><span className="text-[10px] font-medium">Каталог</span></Link>
                  <Link href="/blog" className="flex flex-col items-center gap-1 transition-all duration-300 text-firm-gray hover:text-firm-orange"><Image src={blog} alt="Блог" className="w-5 h-5" /><span className="text-[10px] font-medium">Блог</span></Link>
                  <Link href="/auth/signin" className="flex flex-col items-center gap-1 transition-all duration-300 text-firm-orange font-semibold"><Image src={profile} alt="Войти" className="w-5 h-5" /><span className="text-[10px] font-medium">Войти</span></Link>
                  
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex flex-col items-center gap-1 transition-all duration-300 text-gray-500 hover:text-firm-orange">
                    <div className="relative w-5 h-5 flex flex-col items-center justify-center gap-1">
                      <motion.span animate={isMenuOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }} className="w-4 h-0.5 bg-current rounded-full transition-all duration-300" />
                      <motion.span animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-4 h-0.5 bg-current rounded-full transition-all duration-300" />
                      <motion.span animate={isMenuOpen ? { rotate: -45, y: -4.5 } : { rotate: 0, y: 0 }} className="w-4 h-0.5 bg-current rounded-full transition-all duration-300" />
                    </div>
                    <span className="text-[10px] font-medium">Меню</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-main-black/50 z-50 lg:hidden" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[85%] max-w-sm lg:hidden">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">Полное меню</h3>
                  <button onClick={() => setIsMenuOpen(false)} className="w-8 h-8 rounded-full bg-main flex items-center justify-center">✕</button>
                </div>
                <div className="space-y-2">
                  <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={home} alt="Главная" className="w-6 h-6" /><span className="text-gray-700 font-['Montserrat_Alternates']">Главная</span></Link>
                  <Link href="/catalog" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={catalog} alt="Каталог" className="w-5 h-5" /><span className="text-gray-700 font-['Montserrat_Alternates']">Каталог</span></Link>
                  <Link href="/shopping-cart" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={cart} alt="Корзина" className="w-5 h-5" /><span className="text-gray-700 font-['Montserrat_Alternates']">Корзина</span></Link>
                  <Link href="/favorites" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={favorite} alt="Избранное" className="w-5 h-5" /><span className="text-gray-700 font-['Montserrat_Alternates']">Избранное</span></Link>
                  <Link href="/blog" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={blog} alt="Блог" className="w-5 h-5" /><span className="text-gray-700 font-['Montserrat_Alternates']">Блог</span></Link>
                  <Link href="/master-classes" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={classes} alt="Мастер-классы" className="w-5 h-5" /><span className="text-gray-700 font-['Montserrat_Alternates']">Мастер-классы</span></Link>
                  {isAuthenticated && (isBuyer || isMaster) && (<Link href="/chats" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300 relative"><Image src={chats} alt="Сообщения" className="w-5 h-5" /><span className="text-text font-['Montserrat_Alternates']">Сообщения</span>{unreadCount > 0 && (<span className="ml-auto bg-firm-red text-white text-xs rounded-full px-2 py-0.5 min-w-5 text-center">{unreadCount > 9 ? '9+' : unreadCount}</span>)}</Link>)}
                  {!isAuthenticated && (
                    <>
                      <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={profile} alt="Войти" className="w-5 h-5" /><span className="text-gray-700 font-['Montserrat_Alternates']">Войти</span></Link>
                      <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-main transition-all duration-300"><Image src={profile} alt="Регистрация" className="w-5 h-5" /><span className="text-gray-700 font-['Montserrat_Alternates']">Зарегистрироваться</span></Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="h-15" />
      <div className="h-16 lg:hidden" />
    </>
  );
}