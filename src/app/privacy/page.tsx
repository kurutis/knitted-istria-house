"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { LockIcon } from "@/components/icons/LockIcon";
import { UserIcon } from "@/components/icons/UserIcon";
import { MailIcon } from "@/components/icons/MailIcon";
import { ShieldCheckIcon } from "@/components/icons/ShieldCheckIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";
import { FileTextIcon } from "@/components/icons/FileTextIcon";

export default function PrivacyPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [lastUpdated] = useState("15 мая 2026 года");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sections = [{ id: "general", title: "Общие положения", icon: <FileTextIcon className="w-4 h-4" color="#F4A67F" /> }, { id: "data", title: "Собираемые данные", icon: <UserIcon className="w-4 h-4" color="#D97C8E" /> }, { id: "usage", title: "Использование данных", icon: <ShieldCheckIcon className="w-4 h-4" color="#94D06C" /> }, { id: "protection", title: "Защита данных", icon: <LockIcon className="w-4 h-4" color="#F4A67F" /> }, { id: "rights", title: "Ваши права", icon: <UserIcon className="w-4 h-4" color="#D97C8E" /> }, { id: "cookies", title: "Cookies", icon: <ClockIcon className="w-4 h-4" color="#94D06C" /> }, { id: "contacts", title: "Контакты", icon: <MailIcon className="w-4 h-4" color="#F4A67F" /> }];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-main">
      <section className="relative bg-gradient-to-br from-firm-orange/5 via-main to-firm-pink/5 py-16 sm:py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mb-6 sm:mb-8 inline-flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center shadow-lg">
              <LockIcon className="w-8 h-8 sm:w-10 sm:h-10" color="#f9f9f9" />
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="font-['Montserrat_Alternates'] font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-4 sm:mb-6">Политика конфиденциальности</motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }} className="text-firm-gray text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">Мы уважаем ваше право на приватность и обязуемся защищать предоставленную вами информацию</motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }} className="text-firm-gray text-xs mt-4">Последнее обновление: {lastUpdated}</motion.p>
        </div>
      </section>

      <section className="sticky top-0 z-20 bg-main/95 backdrop-blur-md border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {sections.map((section) => (<motion.button key={section.id} onClick={() => scrollToSection(section.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-forms text-firm-gray hover:text-text transition-all duration-300">{section.icon}<span className={isMobile ? "hidden sm:inline" : ""}>{section.title}</span></motion.button>))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <motion.div id="general" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <FileTextIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">1. Общие положения</h2>
          </div>
          <div className="bg-forms rounded-2xl p-6">
            <p className="text-firm-gray text-sm leading-relaxed mb-4">Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей платформы «Дом вязаных историй» (далее — «Платформа», «Мы», «Наш»).</p>
            <p className="text-firm-gray text-sm leading-relaxed">Используя Платформу, вы даете согласие на сбор, обработку и хранение ваших персональных данных в соответствии с условиями настоящей Политики. Если вы не согласны с условиями, пожалуйста, прекратите использование Платформы.</p>
          </div>
        </motion.div>

        <motion.div id="data" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }} className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-pink to-firm-orange rounded-lg flex items-center justify-center">
              <UserIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">2. Какие данные мы собираем</h2>
          </div>
          <div className="bg-forms rounded-2xl p-6">
            <p className="text-firm-gray text-sm leading-relaxed mb-4">В процессе использования Платформы мы можем собирать следующую информацию:</p>
            <ul className="space-y-3">
              {["Имя, фамилия и отчество", "Адрес электронной почты", "Номер телефона", "Адрес доставки (город, улица, дом, квартира)", "Данные о заказах и истории покупок", "Информация об устройстве и браузере", "IP-адрес", "Данные авторизации через социальные сети (при использовании)", "Фотографии и изображения (при добавлении отзывов)"].map((item, idx) => (<li key={idx} className="flex items-start gap-2 text-firm-gray text-sm"><span className="text-firm-pink mt-0.5">•</span>{item}</li>))}
            </ul>
          </div>
        </motion.div>

        <motion.div id="usage" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }} className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">3. Как мы используем ваши данные</h2>
          </div>
          <div className="bg-forms rounded-2xl p-6">
            <p className="text-firm-gray text-sm leading-relaxed mb-4">Собранные данные используются для следующих целей:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[{ title: "Обработка заказов", desc: "Оформление, подтверждение и доставка заказов" }, { title: "Связь с пользователями", desc: "Уведомления о статусе заказа и ответы на вопросы" }, { title: "Улучшение сервиса", desc: "Анализ использования Платформы для ее улучшения" }, { title: "Персонализация", desc: "Рекомендации товаров и персонализация контента" }, { title: "Безопасность", desc: "Предотвращение мошенничества и защита от атак" }, { title: "Маркетинг", desc: "Информирование об акциях и новинках (с вашего согласия)" }].map((item, idx) => (
                <div key={idx} className="p-3 bg-main rounded-xl">
                  <p className="font-semibold text-text text-sm">{item.title}</p>
                  <p className="text-firm-gray text-xs mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div id="protection" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }} className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-pink to-firm-orange rounded-lg flex items-center justify-center">
              <LockIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">4. Защита персональных данных</h2>
          </div>
          <div className="bg-forms rounded-2xl p-6">
            <p className="text-firm-gray text-sm leading-relaxed mb-4">Мы принимаем все необходимые организационные и технические меры для защиты ваших персональных данных от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования, распространения, а также от иных неправомерных действий третьих лиц.</p>
            <div className="bg-main rounded-xl p-4 mb-4">
              <p className="text-text text-sm font-medium mb-2">Меры защиты включают:</p>
              <ul className="space-y-2">
                {["Шифрование данных при передаче (SSL/TLS)", "Регулярное обновление систем безопасности", "Ограниченный доступ к персональным данным сотрудников", "Резервное копирование данных", "Мониторинг и аудит систем безопасности"].map((item, idx) => (<li key={idx} className="flex items-start gap-2 text-firm-gray text-sm"><span className="text-firm-green mt-0.5">✓</span>{item}</li>))}
              </ul>
            </div>
            <p className="text-firm-gray text-sm leading-relaxed"> Однако, ни один метод передачи данных через интернет или метод электронного хранения не является на 100% безопасным. Поэтому, хотя мы стремимся использовать коммерчески приемлемые средства защиты, мы не можем гарантировать абсолютную безопасность.</p>
          </div>
        </motion.div>

        <motion.div id="rights" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }} className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <UserIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">5. Ваши права</h2>
          </div>
          <div className="bg-forms rounded-2xl p-6">
            <p className="text-firm-gray text-sm leading-relaxed mb-4">В соответствии с законодательством Российской Федерации вы имеете право:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Получать информацию о своих персональных данных", "Требовать исправления неточных данных", "Требовать удаления персональных данных", "Отзывать согласие на обработку данных", "Ограничивать обработку данных", "Получать данные в машиночитаемом формате"].map((right, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-main rounded-lg">
                  <span className="text-firm-green">✓</span>
                  <span className="text-firm-gray text-sm">{right}</span>
                </div>
              ))}
            </div>
            <p className="text-firm-gray text-sm leading-relaxed mt-4">Для реализации ваших прав, пожалуйста, обратитесь к нам через контактные данные, указанные в разделе «Контакты».</p>
          </div>
        </motion.div>

        <motion.div id="cookies" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }} className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-pink to-firm-orange rounded-lg flex items-center justify-center">
              <ClockIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">6. Использование файлов cookie</h2>
          </div>
          <div className="bg-forms rounded-2xl p-6">
            <p className="text-firm-gray text-sm leading-relaxed mb-4">Наша Платформа использует файлы cookie и аналогичные технологии для улучшения пользовательского опыта, анализа трафика и персонализации контента.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[{ type: "Необходимые", desc: "Обеспечивают базовую работу сайта" }, { type: "Функциональные", desc: "Запоминают ваши предпочтения" }, { type: "Аналитические", desc: "Помогают анализировать использование сайта" }, { type: "Маркетинговые", desc: "Используются для персонализации рекламы" }].map((item, idx) => (
                <div key={idx} className="p-2 bg-main rounded-lg">
                  <p className="font-semibold text-text text-sm">{item.type}</p>
                  <p className="text-firm-gray text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-firm-gray text-sm leading-relaxed">Вы можете управлять файлами cookie через настройки вашего браузера. Отключение некоторых типов cookie может повлиять на функциональность Платформы.</p>
          </div>
        </motion.div>

        <motion.div id="contacts" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }} className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <MailIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">7. Контактная информация</h2>
          </div>
          <div className="bg-forms rounded-2xl p-6">
            <p className="text-firm-gray text-sm leading-relaxed mb-4">По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться к нам:</p>
            <div className="space-y-3">
              <div>
                <p className="text-firm-gray text-xs">Электронная почта</p>
                <Link href="mailto:privacy@knitted-history.ru" className="text-text text-sm hover:text-firm-orange transition-colors break-all">privacy@knitted-history.ru</Link>
              </div>
              <div>
                <p className="text-firm-gray text-xs">Телефон</p>
                <Link href="tel:+74951234567" className="text-text text-sm hover:text-firm-orange transition-colors">+7 (495) 123-45-67</Link>
              </div>
              <div>
                <p className="text-firm-gray text-xs">Почтовый адрес</p>
                <p className="text-text text-sm">108841, г. Москва, г. Троицк, пл. Фабричная, д. 1, стр. 1, помещ. 1</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }} className="bg-firm-orange/5 rounded-2xl p-6 border border-firm-orange/20">
          <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-2">Изменения политики конфиденциальности</h3>
          <p className="text-firm-gray text-sm leading-relaxed">Мы можем время от времени обновлять нашу Политику конфиденциальности. О любых изменениях мы уведомим вас путем публикации новой Политики на этой странице. Рекомендуем периодически просматривать эту страницу для получения актуальной информации. Изменения вступают в силу с момента их публикации.</p>
          <p className="text-firm-gray text-xs mt-4">Актуальная версия Политики: 2.4 от {lastUpdated}</p>
        </motion.div>
      </div>

      <section className="py-8 sm:py-12 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300">← Вернуться на главную</motion.button></Link>
        </div>
      </section>
    </div>
  );
}