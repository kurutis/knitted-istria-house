"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import { LikeIcon } from "@/components/icons/LikeIcon";
import { AwardIcon } from "@/components/icons/AwardIcon";
import { ShieldCheckIcon } from "@/components/icons/ShieldCheckIcon";
import { UsersIcon } from "@/components/icons/UsersIcon";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const fadeInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const fadeInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export default function AboutPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const stats = [
    { label: "Мастеров", value: "150+", icon: <AwardIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#F4A67F" />, delay: 0.1 },
    { label: "Изделий", value: "3 000+", icon: <LikeIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#D97C8E" />, delay: 0.2 },
    { label: "Покупателей", value: "10 000+", icon: <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#F4A67F" />, delay: 0.3 },
    { label: "Заказов", value: "15 000+", icon: <ShieldCheckIcon className="w-6 h-6 sm:w-8 sm:h-8" color="#94D06C" />, delay: 0.4 },
  ];

  const values = [
    {
      title: "Качество",
      description: "Мы тщательно отбираем мастеров и следим за качеством каждого изделия, представленного на платформе.",
      icon: <AwardIcon className="w-8 h-8" color="#F4A67F" />,
    },
    {
      title: "Поддержка",
      description: "Помогаем мастерам развивать свое дело, а покупателям — находить уникальные вещи ручной работы.",
      icon: <LikeIcon className="w-8 h-8" color="#D97C8E" />,
    },
    {
      title: "Прозрачность",
      description: "Честные условия сотрудничества и безопасная система сделок для всех участников.",
      icon: <ShieldCheckIcon className="w-8 h-8" color="#94D06C" />,
    },
    {
      title: "Сообщество",
      description: "Создаем пространство, где мастера и ценители handmade могут общаться и вдохновляться.",
      icon: <UsersIcon className="w-8 h-8" color="#F4A67F" />,
    },
  ];

  return (
    <div className="min-h-screen bg-main">
      {/* Hero секция */}
      <section className="relative bg-gradient-to-br from-firm-orange/5 via-main to-firm-pink/5 py-16 sm:py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8 inline-flex items-center justify-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center shadow-lg">
              <LikeIcon className="w-8 h-8 sm:w-10 sm:h-10" color="#f9f9f9" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-['Montserrat_Alternates'] font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-4 sm:mb-6"
          >
            О платформе
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="text-firm-gray text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed"
          >
            «Дом вязаных историй» — это не просто маркетплейс, а настоящее сообщество,
            объединяющее талантливых мастеров и ценителей уникальных вязаных изделий.
          </motion.p>
        </div>
      </section>

      {/* Блок с миссией */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="order-2 lg:order-1"
            >
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">
                Наша миссия
              </h2>
              <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-6" />
              <p className="text-firm-gray text-sm sm:text-base leading-relaxed mb-4">
                Мы создаем пространство, где традиции ручного вязания встречаются с современными
                технологиями. Наша цель — сделать авторские вязаные изделия доступными для каждого,
                кто ценит уникальность и качество.
              </p>
              <p className="text-firm-gray text-sm sm:text-base leading-relaxed">
                Мы помогаем мастерам развивать свое дело, предоставляя инструменты для продвижения
                и продажи работ, а покупателям — находить настоящие сокровища, созданные с душой и любовью.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="order-1 lg:order-2"
            >
              <div className="bg-gradient-to-br from-firm-orange/10 to-firm-pink/10 rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="aspect-video bg-forms rounded-xl flex items-center justify-center">
                  <LikeIcon className="w-16 h-16 sm:w-20 sm:h-20" color="#D97C8E" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className="py-12 sm:py-16 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-10 sm:mb-12"
          >
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">
              Платформа в цифрах
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: idx * 0.1, duration: 0.6, ease: "easeOut" }}
                className="bg-main rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-center mb-3">{stat.icon}</div>
                <p className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl text-firm-orange">
                  {stat.value}
                </p>
                <p className="text-firm-gray text-xs sm:text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ценности */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-10 sm:mb-12"
          >
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">
              Наши ценности
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
            <p className="text-firm-gray text-sm sm:text-base mt-4 max-w-2xl mx-auto">
              Четыре принципа, на которых строится работа нашей платформы
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.1, duration: 0.6, ease: "easeOut" }}
                className="bg-main rounded-2xl p-6 text-center shadow-md hover:shadow-xl transition-all duration-300 group border border-gray-100"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 group-hover:scale-110 transition-transform duration-300">
                    {value.icon}
                  </div>
                </div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-2">
                  {value.title}
                </h3>
                <p className="text-firm-gray text-xs sm:text-sm leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Преимущества для мастеров и покупателей */}
      <section className="py-12 sm:py-16 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-10 sm:mb-12"
          >
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">
              Для кого мы работаем
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
            {/* Для мастеров */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-main rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <AwardIcon className="w-8 h-8" color="#F4A67F" />
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">
                    Мастерам
                  </h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Бесплатное создание магазина и добавление товаров",
                    "Инструменты для продвижения и аналитики продаж",
                    "Возможность проводить мастер-классы",
                    "Ведение блога для привлечения аудитории",
                    "Безопасные сделки и защита авторских прав",
                    "Поддержка на всех этапах развития",
                  ].map((item, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }}
                      className="flex items-start gap-3 text-firm-gray text-sm"
                    >
                      <span className="text-firm-green mt-0.5">✓</span>
                      {item}
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link href="/profile?tab=profile">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                    >
                      Стать мастером
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Для покупателей */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-main rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <LikeIcon className="w-8 h-8" color="#D97C8E" />
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">
                    Покупателям
                  </h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Уникальные авторские изделия ручной работы",
                    "Безопасная система сделок",
                    "Возможность заказать индивидуальное изделие",
                    "Отзывы и рейтинги мастеров",
                    "Удобный поиск по каталогу",
                    "Доставка по всей России",
                  ].map((item, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }}
                      className="flex items-start gap-3 text-firm-gray text-sm"
                    >
                      <span className="text-firm-green mt-0.5">✓</span>
                      {item}
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link href="/catalog">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 bg-linear-to-r from-firm-pink to-firm-orange text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                    >
                      Перейти в каталог
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Команда / История */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="order-2 lg:order-1"
            >
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">
                Наша история
              </h2>
              <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-6" />
              <p className="text-firm-gray text-sm sm:text-base leading-relaxed mb-4">
                «Дом вязаных историй» родился из любви к ручному вязанию и желания помочь мастерам
                находить своих ценителей. Всё началось с небольшого сообщества в социальных сетях,
                которое быстро выросло в полноценную платформу.
              </p>
              <p className="text-firm-gray text-sm sm:text-base leading-relaxed">
                Сегодня это современный маркетплейс, который объединяет сотни талантливых мастеров
                и тысячи покупателей со всей страны. Мы продолжаем развиваться, внедрять новые
                возможности и делать handmade ближе к каждому.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="order-1 lg:order-2"
            >
              <div className="bg-gradient-to-br from-firm-pink/10 to-firm-orange/10 rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="aspect-square bg-forms rounded-xl flex items-center justify-center">
                  <ShieldCheckIcon className="w-16 h-16 sm:w-20 sm:h-20" color="#94D06C" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA секция */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-firm-orange/10 to-firm-pink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">
              Присоединяйтесь к нам
            </h2>
            <p className="text-firm-gray text-sm sm:text-base max-w-2xl mx-auto mb-8">
              Станьте частью сообщества «Дом вязаных историй» — как мастер или как ценитель
              уникальных изделий ручной работы.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/profile?tab=profile">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                >
                  Стать мастером
                </motion.button>
              </Link>
              <Link href="/catalog">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 border-2 border-firm-pink text-firm-pink rounded-xl font-medium hover:bg-firm-pink hover:text-main transition-all duration-300"
                >
                  Найти изделие
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}