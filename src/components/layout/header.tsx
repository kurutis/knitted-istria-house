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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/catalog", label: "Каталог" },
    { href: "/blog", label: "Блог" },
    { href: "/master-classes", label: "Мастер-классы" },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          isScrolled
            ? "bg-main/95 backdrop-blur-md shadow-lg"
            : "bg-main"
        } h-[10vh] min-h-[60px] flex items-center`}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center gap-4">
            {/* Логотип и название */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="flex gap-2 sm:gap-3 items-center flex-shrink-0"
            >
              <Link href="/" className="flex items-center gap-2 sm:gap-3">
                <Image className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" src={logo} alt="logo" />
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
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-firm-orange transition-all duration-300 group-hover:w-full" />
                  </Link>
                </motion.li>
              ))}
            </ul>

            {/* Иконки действий */}
            <div className="flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {/* Чаты */}
              {(isAuthenticated && (isBuyer || isMaster)) && (
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/chats">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white hover:text-firm-orange transition-colors duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </Link>
                </motion.div>
              )}

              {/* Корзина */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/shopping-cart">
                  <Image src={cart} alt="shopping cart" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </Link>
              </motion.div>

              {/* Избранное */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/favorites">
                  <Image src={favorite} alt="favorites" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </Link>
              </motion.div>

              {/* Профиль */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-300 animate-pulse" />
                ) : isAuthenticated ? (
                  <Link href="/profile">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt="profile"
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-white/50 hover:ring-firm-orange transition-all duration-300"
                      />
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs sm:text-sm font-bold"
                      >
                        {session.user.name?.charAt(0).toUpperCase() || "U"}
                      </motion.div>
                    )}
                  </Link>
                ) : (
                  <Link href="/auth/signin">
                    <Image src={profile} alt="profile" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                  </Link>
                )}
              </motion.div>

              {/* Кнопка мобильного меню */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden flex flex-col gap-1.5 p-1"
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
          </div>
        </nav>
      </motion.header>

      {/* Мобильное меню */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-[10vh] right-0 bottom-0 w-64 bg-main/95 backdrop-blur-lg z-40 shadow-xl lg:hidden"
          >
            <nav className="flex flex-col p-6 pt-8 gap-4">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-3 px-4 font-['Montserrat_Alternates'] font-semibold text-white text-lg hover:bg-white/10 rounded-lg transition-all duration-300"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="border-t border-white/20 my-2 pt-4">
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-3 px-4 font-['Montserrat_Alternates'] font-semibold text-white text-lg hover:bg-white/10 rounded-lg transition-all duration-300"
                >
                  Профиль
                </Link>
                <Link
                  href="/shopping-cart"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-3 px-4 font-['Montserrat_Alternates'] font-semibold text-white text-lg hover:bg-white/10 rounded-lg transition-all duration-300"
                >
                  Корзина
                </Link>
                <Link
                  href="/favorites"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-3 px-4 font-['Montserrat_Alternates'] font-semibold text-white text-lg hover:bg-white/10 rounded-lg transition-all duration-300"
                >
                  Избранное
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Отступ для фиксированного хедера */}
      <div className="h-[10vh] min-h-[60px]" />
    </>
  );
}
