"use client";

import Link from "next/link";
import logo from "../../../public/logo.svg";
import Image from "next/image";
import cart from "../../../public/cart.svg";
import favorite from "../../../public/favorites.svg";
import profile from "../../../public/profile.svg";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = !!session?.user;
  const isBuyer = session?.user?.role === "buyer";
  const isMaster = session?.user?.role === "master";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Загружаем аватар из API профиля
  useEffect(() => {
    const loadAvatar = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.avatarUrl) {
            setAvatarUrl(data.avatarUrl);
          }
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
      }
    };
    
    loadAvatar();
  }, [isAuthenticated]);

  const getInitials = () => {
    if (!session?.user) return "U";
    const name = session.user.name;
    const email = session.user.email;
    
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    if (email && email.length > 0) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const navLinks = [
    { href: "/", label: "🏠", name: "Главная" },
    { href: "/catalog", label: "🧶", name: "Каталог" },
    { href: "/blog", label: "📝", name: "Блог" },
    { href: "/master-classes", label: "🎓", name: "Мастер-классы" },
  ];

  const bottomNavLinks = [
    { href: "/", icon: "🏠", label: "Главная" },
    { href: "/catalog", icon: "🧶", label: "Каталог" },
    { href: "/favorites", icon: "❤️", label: "Избранное" },
    { href: "/profile", icon: "👤", label: "Профиль" },
  ];

  return (
    <>
      {/* Верхняя шапка */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className={`fixed top-0 z-40 w-full transition-all duration-500 ${
          isScrolled
            ? "bg-main/95 backdrop-blur-md shadow-lg"
            : "bg-main"
        } h-[10vh] min-h-[60px] flex items-center`}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center gap-4">
            {/* Пустой div для баланса (только мобильная версия) */}
            <div className="w-8 lg:hidden"></div>

            {/* Логотип и название - по центру на мобилке, слева на десктопе */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="flex gap-2 sm:gap-3 items-center flex-shrink-0 lg:mr-0 mx-auto lg:mx-0"
            >
              <Link href="/" className="flex items-center gap-2 sm:gap-3">
                <Image className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16" src={logo} alt="logo" />
                <div className="hidden sm:block">
                  <div className="font-['Montserrat_Alternates'] font-bold leading-tight">
                    <span className="text-firm-pink font-semibold font-['Montserrat_Alternates'] text-xs sm:text-sm md:text-base">
                      Дом{" "}
                    </span>
                    <span className="text-firm-orange font-semibold font-['Montserrat_Alternates'] text-xs sm:text-sm md:text-base">
                      вязанных
                    </span>
                    <br />
                    <span className="text-firm-pink font-semibold font-['Montserrat_Alternates'] text-xs sm:text-sm md:text-base">
                      историй
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Десктопное меню */}
            <ul className="hidden lg:flex justify-between w-[600px] xl:gap-10">
              {navLinks.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    className="font-['Montserrat_Alternates'] font-semibold hover:font-bold transition-all duration-300 relative group"
                    href={link.href}
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-firm-orange transition-all duration-300 group-hover:w-full" />
                  </Link>
                </motion.li>
              ))}
            </ul>

            {/* Правая часть (иконки) - только для десктопа */}
            <div className="hidden lg:flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {/* Чаты */}
              {(isAuthenticated && (isBuyer || isMaster)) && (
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/chats">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white hover:text-firm-orange transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </Link>
                </motion.div>
              )}

              {/* Корзина */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Link href="/shopping-cart">
                  <Image src={cart} alt="shopping cart" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </Link>
              </motion.div>

              {/* Избранное */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Link href="/favorites">
                  <Image src={favorite} alt="favorites" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </Link>
              </motion.div>

              {/* Профиль */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                {isLoading ? (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-300 animate-pulse" />
                ) : isAuthenticated ? (
                  <Link href="/profile" className="block">
                    {avatarUrl ? (
                      <img
                        src={`/api/proxy/avatar?url=${encodeURIComponent(avatarUrl)}`}
                        alt="profile"
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-white/50 hover:ring-firm-orange transition-all duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const span = document.createElement('div');
                            span.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs sm:text-sm font-bold';
                            span.textContent = getInitials();
                            parent.appendChild(span);
                            e.currentTarget.remove();
                          }
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                        {getInitials()}
                      </div>
                    )}
                  </Link>
                ) : (
                  <Link href="/auth/signin" className="block">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white hover:text-firm-orange transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                )}
              </motion.div>
            </div>

            {/* Кнопка мобильного меню - только для мобильной версии */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden flex flex-col gap-1.5 p-1 z-50"
            >
              <motion.span
                animate={isMenuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                className="w-6 h-0.5 bg-white rounded-full transition-all duration-300"
              />
              <motion.span
                animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="w-6 h-0.5 bg-white rounded-full transition-all duration-300"
              />
              <motion.span
                animate={isMenuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                className="w-6 h-0.5 bg-white rounded-full transition-all duration-300"
              />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Фиксированный остров снизу (только для мобильной версии) */}
      <div className="fixed bottom-4 left-0 right-0 z-40 lg:hidden">
        <div className="flex justify-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl px-4 py-2 mx-4">
            <div className="flex items-center gap-6">
              {bottomNavLinks.map((link, index) => {
                const isActive = typeof window !== 'undefined' && window.location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-300 ${
                      isActive ? 'text-firm-orange' : 'text-gray-500 hover:text-firm-orange'
                    }`}
                  >
                    <span className="text-xl">{link.icon}</span>
                    <span className="text-[10px] font-['Montserrat_Alternates'] font-medium">
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Мобильное меню - выдвигается при нажатии на кнопку */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Затемнение фона */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            
            {/* Меню-остров по центру */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[85%] max-w-sm lg:hidden"
            >
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">Меню</h3>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-2">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-100 transition-all duration-300"
                      >
                        <span className="text-xl">{link.label}</span>
                        <span className="text-gray-700 font-['Montserrat_Alternates']">
                          {link.name}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Дополнительные пункты для авторизованных пользователей */}
                {(isAuthenticated && (isBuyer || isMaster)) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      href="/chats"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-100 transition-all duration-300"
                    >
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-gray-700">Сообщения</span>
                    </Link>
                  </div>
                )}

                {/* Кнопка выхода для авторизованных */}
                {isAuthenticated && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        // signOut logic here
                      }}
                      className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-red-50 transition-all duration-300 text-red-600"
                    >
                      <span className="text-xl">🚪</span>
                      <span>Выйти</span>
                    </button>
                  </div>
                )}

                {/* Кнопки входа/регистрации для неавторизованных */}
                {!isAuthenticated && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <Link
                      href="/auth/signin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-100 transition-all duration-300"
                    >
                      <span className="text-xl">🔑</span>
                      <span>Войти</span>
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-100 transition-all duration-300"
                    >
                      <span className="text-xl">✨</span>
                      <span>Зарегистрироваться</span>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Отступ для фиксированного хедера */}
      <div className="h-[10vh] min-h-[60px]" />
      
      {/* Отступ для мобильного нижнего меню */}
      <div className="h-20 lg:hidden" />
    </>
  );
}