"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheckIcon } from "@/components/icons/ShieldCheckIcon";
import { FileTextIcon } from "@/components/icons/FileTextIcon";
import { UserIcon } from "@/components/icons/UserIcon";
import { LockIcon } from "@/components/icons/LockIcon";
import { CookieIcon } from "@/components/icons/CookieIcon";
import { MailIcon } from "@/components/icons/MailIcon";
import React from "react";

export default function LegalPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [activeSection, setActiveSection] = useState("company");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sections = [{ id: "company", title: "Реквизиты компании", icon: <FileTextIcon className="w-5 h-5" color="#F4A67F" /> }, { id: "license", title: "Лицензии и сертификаты", icon: <ShieldCheckIcon className="w-5 h-5" color="#D97C8E" /> }, { id: "privacy", title: "Политика конфиденциальности", icon: <LockIcon className="w-5 h-5" color="#94D06C" /> }, { id: "cookie", title: "Политика использования cookies", icon: <CookieIcon className="w-5 h-5" color="#F4A67F" /> }, { id: "public", title: "Публичная оферта", icon: <FileTextIcon className="w-5 h-5" color="#D97C8E" /> }];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
    setActiveSection(id);
  };

  return (
    <div className="min-h-screen bg-main">
      <section className="relative bg-gradient-to-br from-firm-orange/5 via-main to-firm-pink/5 py-16 sm:py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mb-6 sm:mb-8 inline-flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldCheckIcon className="w-8 h-8 sm:w-10 sm:h-10" color="#f9f9f9" />
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="font-['Montserrat_Alternates'] font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-4 sm:mb-6">Юридическая информация</motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }} className="text-firm-gray text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">Документы, реквизиты и правовая информация о платформе «Дом вязаных историй»</motion.p>
        </div>
      </section>

      <section className="sticky top-0 z-20 bg-main/95 backdrop-blur-md border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              const iconColor = isActive ? "#f9f9f9" : (section.icon.props.color || "#F4A67F");
              return (<motion.button key={section.id} onClick={() => scrollToSection(section.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${isActive ? "bg-linear-to-r from-firm-orange to-firm-pink text-main shadow-md" : "bg-forms text-firm-gray hover:text-text"}`}>{React.cloneElement(section.icon, { color: iconColor })}<span className={`${isMobile ? "hidden sm:inline" : ""} ${isActive ? "text-main" : "text-firm-gray hover:text-text"}`}>{section.title}</span>{isMobile && <span className="sm:hidden">{section.title.split(" ")[0]}</span>}</motion.button>)})}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <section id="company" className="mb-12 sm:mb-16 scroll-mt-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl flex items-center justify-center">
                <FileTextIcon className="w-5 h-5" color="#f9f9f9" />
              </div>
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">Реквизиты компании</h2>
            </div>
            <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-8" />

            <div className="bg-forms rounded-2xl p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-4">Общая информация</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">Полное наименование</p>
                      <p className="text-text text-sm sm:text-base">ООО «Дом вязаных историй»</p>
                    </div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">Краткое наименование</p>
                      <p className="text-text text-sm sm:text-base">ООО «ДВИ»</p>
                    </div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">ИНН / КПП</p>
                      <p className="text-text text-sm sm:text-base">5046075590 / 775101001</p>
                    </div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">ОГРН</p>
                      <p className="text-text text-sm sm:text-base">1125003003531</p>
                    </div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">Юридический адрес</p>
                      <p className="text-text text-sm sm:text-base">108841, г. Москва, г. Троицк, пл. Фабричная, д. 1, стр. 1, помещ. 1</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-4"> Банковские реквизиты</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">Банк</p>
                      <p className="text-text text-sm sm:text-base">ПАО «Сбербанк»</p>
                    </div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">БИК</p>
                      <p className="text-text text-sm sm:text-base">044525225</p>
                    </div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">Корреспондентский счет</p>
                      <p className="text-text text-sm sm:text-base">30101810400000000225</p>
                    </div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">Расчетный счет</p>
                      <p className="text-text text-sm sm:text-base">40702810100000012345</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-4">Контактные данные</h3>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-firm-gray text-xs sm:text-sm">Телефон</p>
                    <Link href="tel:+74951234567" className="text-text text-sm sm:text-base hover:text-firm-orange transition-colors">+7 (495) 123-45-67</Link>
                  </div>
                  <div>
                    <p className="text-firm-gray text-xs sm:text-sm">Email для юр. вопросов</p>
                    <Link href="mailto:legal@knitted-history.ru" className="text-text text-sm sm:text-base hover:text-firm-orange transition-colors">legal@knitted-history.ru</Link>
                  </div>
                  <div>
                    <p className="text-firm-gray text-xs sm:text-sm">Руководитель</p>
                    <p className="text-text text-sm sm:text-base">Рейснер Татьяна Николаевна (Генеральный директор)</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="license" className="mb-12 sm:mb-16 scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-r from-firm-pink to-firm-orange rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5" color="#f9f9f9" />
              </div>
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">
                Лицензии и сертификаты
              </h2>
            </div>
            <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-8" />

            <p className="text-firm-gray text-sm sm:text-base mb-6">
              Платформа «Дом вязаных историй» осуществляет свою деятельность в соответствии с законодательством
              Российской Федерации. Мы заботимся о безопасности и прозрачности всех операций.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "Свидетельство о регистрации СМИ ЭЛ № ФС 77 - 123456",
                "Лицензия на осуществление деятельности в области ИТ",
                "Сертификат соответствия требованиям 152-ФЗ",
                "Регистрация в Роскомнадзоре",
                "Сертификат безопасности платежей PCI DSS",
                "Член Ассоциации электронных торговых площадок",
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }}
                  className="flex items-center gap-3 p-3 bg-forms rounded-xl"
                >
                  <ShieldCheckIcon className="w-5 h-5 shrink-0" color="#94D06C" />
                  <span className="text-text text-xs sm:text-sm">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Политика конфиденциальности */}
        <section id="privacy" className="mb-12 sm:mb-16 scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl flex items-center justify-center">
                <LockIcon className="w-5 h-5" color="#f9f9f9" />
              </div>
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">
                Политика конфиденциальности
              </h2>
            </div>
            <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-8" />

            <div className="bg-forms rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">1. Общие положения</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных
                  пользователей платформы «Дом вязаных историй». Мы уважаем право на приватность и обязуемся защищать
                  предоставленную вами информацию.
                </p>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">2. Какие данные мы собираем</h3>
                <ul className="space-y-2">
                  {[
                    "Имя, фамилия и контактные данные (email, телефон)",
                    "Адрес доставки для оформления заказов",
                    "Данные о заказах и истории покупок",
                    "Информация об устройстве и IP-адрес",
                    "Данные авторизации через социальные сети",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-firm-gray text-sm">
                      <span className="text-firm-orange mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">3. Использование данных</h3>
                <p className="text-firm-gray text-sm leading-relaxed mb-3">
                  Собранные данные используются для:
                </p>
                <ul className="space-y-2">
                  {[
                    "Оформления и обработки заказов",
                    "Доставки товаров и связи с покупателями",
                    "Улучшения работы платформы и персонализации",
                    "Информирования о акциях и новинках (с вашего согласия)",
                    "Проведения аналитики и предотвращения мошенничества",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-firm-gray text-sm">
                      <span className="text-firm-green mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">4. Защита данных</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Мы принимаем все необходимые меры для защиты ваших персональных данных от несанкционированного доступа,
                  изменения или уничтожения. Передача данных третьим лицам осуществляется только в случаях,
                  предусмотренных законодательством РФ, или с вашего прямого согласия.
                </p>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">5. Ваши права</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Вы имеете право на получение информации о своих персональных данных, их изменение или удаление.
                  Для этого достаточно обратиться в нашу службу поддержки.
                </p>
              </div>

              <div className="bg-main rounded-xl p-4">
                <p className="text-firm-gray text-xs sm:text-sm">
                  <span className="font-semibold text-text">Актуально на:</span> 1 июня 2024 года.
                  Политика конфиденциальности может быть обновлена. Все изменения публикуются на этой странице.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Политика использования cookies */}
        <section id="cookie" className="mb-12 sm:mb-16 scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-r from-firm-pink to-firm-orange rounded-xl flex items-center justify-center">
                <CookieIcon className="w-5 h-5" color="#f9f9f9" />
              </div>
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">
                Политика использования cookies
              </h2>
            </div>
            <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-8" />

            <div className="bg-forms rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">Что такое cookies</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Cookies — это небольшие текстовые файлы, которые сохраняются на вашем устройстве при посещении сайта.
                  Они помогают нам обеспечить корректную работу платформы и улучшить ваш опыт использования.
                </p>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">Какие cookies мы используем</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { type: "Необходимые", desc: "Обеспечивают базовую работу сайта (корзина, авторизация)" },
                    { type: "Функциональные", desc: "Запоминают ваши предпочтения и настройки" },
                    { type: "Аналитические", desc: "Помогают анализировать использование сайта" },
                    { type: "Маркетинговые", desc: "Используются для персонализации рекламы" },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 bg-main rounded-xl">
                      <p className="font-semibold text-text text-sm">{item.type}</p>
                      <p className="text-firm-gray text-xs mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">Управление cookies</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Вы можете управлять cookies через настройки вашего браузера. Отключение некоторых типов cookies
                  может повлиять на функциональность сайта. Продолжая использование платформы, вы соглашаетесь
                  с использованием cookies в соответствии с данной политикой.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Публичная оферта */}
        <section id="public" className="scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl flex items-center justify-center">
                <FileTextIcon className="w-5 h-5" color="#f9f9f9" />
              </div>
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">
                Публичная оферта
              </h2>
            </div>
            <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-8" />

            <div className="bg-forms rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">1. Предмет договора</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Настоящий документ является официальным предложением (офертой) ООО «Дом вязаных историй»
                  для физических лиц, желающих приобрести товары, представленные на платформе.
                </p>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">2. Порядок оформления заказа</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Заказ формируется покупателем через корзину на сайте. После оформления заказа и его оплаты,
                  продавец (мастер) подтверждает заказ и начинает его изготовление или подготовку к отправке.
                </p>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">3. Оплата и доставка</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Оплата товаров производится через платежные системы, представленные на сайте.
                  Условия доставки определяются индивидуально для каждого заказа и зависят от региона
                  и выбранного способа доставки.
                </p>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">4. Ответственность сторон</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Продавец (мастер) несет ответственность за качество и соответствие товара описанию.
                  Платформа «Дом вязаных историй» выступает в качестве информационного посредника
                  и обеспечивает безопасность транзакций.
                </p>
              </div>

              <div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-3">5. Порядок разрешения споров</h3>
                <p className="text-firm-gray text-sm leading-relaxed">
                  Все споры решаются путем переговоров. При недостижении согласия, споры передаются
                  на рассмотрение в суд по месту нахождения платформы в соответствии с законодательством РФ.
                </p>
              </div>

              <div className="bg-main rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MailIcon className="w-4 h-4" color="#D97C8E" />
                  <p className="text-text text-sm font-medium">По вопросам оферты:</p>
                </div>
                <Link href="mailto:legal@knitted-history.ru" className="text-firm-orange text-sm hover:underline break-all">
                  legal@knitted-history.ru
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Дата последнего обновления */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          className="mt-12 pt-8 border-t border-gray-200 text-center"
        >
          <p className="text-firm-gray text-xs">
            Все документы актуальны на 1 июня 2024 года.
            Платформа оставляет за собой право вносить изменения в документы без предварительного уведомления.
          </p>
          <p className="text-firm-gray text-xs mt-2">
            Версия 2.4
          </p>
        </motion.div>
      </div>

      {/* Контакты для юр. вопросов */}
      <section className="py-12 sm:py-16 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">
              По юридическим вопросам
            </h2>
            <p className="text-firm-gray text-sm sm:text-base max-w-2xl mx-auto mb-6">
              Если у вас есть вопросы, связанные с юридическими аспектами работы платформы,
              пожалуйста, свяжитесь с нашим юридическим отделом
            </p>
            <Link href="mailto:legal@knitted-history.ru">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300"
              >
                <MailIcon className="w-4 h-4" color="#f9f9f9" />
                legal@knitted-history.ru
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}