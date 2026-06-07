"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FileTextIcon } from "@/components/icons/FileTextIcon";
import { UserIcon } from "@/components/icons/UserIcon";
import { ShieldCheckIcon } from "@/components/icons/ShieldCheckIcon";
import { LockIcon } from "@/components/icons/LockIcon";
import { MailIcon } from "@/components/icons/MailIcon";
import { CartIcon } from "@/components/icons/CartIcon";

export default function TermsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [lastUpdated] = useState("1 июня 2024 года");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sections = [
    { id: "general", title: "Общие положения", icon: <FileTextIcon className="w-4 h-4" color="#F4A67F" /> },
    { id: "users", title: "Права и обязанности", icon: <UserIcon className="w-4 h-4" color="#D97C8E" /> },
    { id: "masters", title: "Условия для мастеров", icon: <ShieldCheckIcon className="w-4 h-4" color="#94D06C" /> },
    { id: "buyers", title: "Условия для покупателей", icon: <CartIcon className="w-4 h-4" color="#F4A67F" /> },
    { id: "payments", title: "Оплата и доставка", icon: <LockIcon className="w-4 h-4" color="#D97C8E" /> },
    { id: "responsibility", title: "Ответственность", icon: <ShieldCheckIcon className="w-4 h-4" color="#94D06C" /> },
    { id: "contacts", title: "Контакты", icon: <MailIcon className="w-4 h-4" color="#F4A67F" /> },
  ];

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
              <FileTextIcon className="w-8 h-8 sm:w-10 sm:h-10" color="#f9f9f9" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-['Montserrat_Alternates'] font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-4 sm:mb-6"
          >
            Пользовательское соглашение
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="text-firm-gray text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Регистрируясь и используя платформу «Дом вязаных историй», вы принимаете условия
            настоящего пользовательского соглашения
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            className="text-firm-gray text-xs mt-4"
          >
            Последнее обновление: {lastUpdated}
          </motion.p>
        </div>
      </section>

      {/* Навигация */}
      <section className="sticky top-0 z-20 bg-main/95 backdrop-blur-md border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-forms text-firm-gray hover:text-text transition-all duration-300"
              >
                {section.icon}
                <span className={isMobile ? "hidden sm:inline" : ""}>{section.title}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Основной контент */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        {/* 1. Общие положения */}
        <motion.div
          id="general"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-10 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <FileTextIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">
              1. Общие положения
            </h2>
          </div>
          <div className="bg-forms rounded-2xl p-6 space-y-4">
            <p className="text-firm-gray text-sm leading-relaxed">
              1.1. Настоящее Пользовательское соглашение (далее — «Соглашение») является юридически 
              обязательным договором между Платформой «Дом вязаных историй» (далее — «Платформа», 
              «Мы», «Наш», «Администрация») и Пользователем (далее — «Пользователь», «Вы»).
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              1.2. Используя Платформу, включая просмотр контента, регистрацию, оформление заказов, 
              Вы подтверждаете, что ознакомились с условиями настоящего Соглашения и принимаете их 
              в полном объеме без каких-либо изъятий и ограничений.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              1.3. Администрация оставляет за собой право в любое время изменять условия Соглашения 
              без предварительного уведомления Пользователя. Изменения вступают в силу с момента 
              публикации новой версии Соглашения на Платформе.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              1.4. Регистрируясь на Платформе, Вы подтверждаете, что достигли 18-летнего возраста 
              или имеете законное право заключать договоры в соответствии с законодательством 
              Российской Федерации.
            </p>
          </div>
        </motion.div>

        {/* 2. Права и обязанности пользователей */}
        <motion.div
          id="users"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
          className="mb-10 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-pink to-firm-orange rounded-lg flex items-center justify-center">
              <UserIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">
              2. Права и обязанности пользователей
            </h2>
          </div>
          <div className="bg-forms rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-text mb-2">2.1. Пользователь имеет право:</h3>
              <ul className="space-y-2 ml-4">
                {[
                  "Просматривать каталог товаров и информацию о мастерах",
                  "Регистрироваться на Платформе и создавать профиль",
                  "Оформлять заказы на товары, представленные на Платформе",
                  "Оставлять отзывы о товарах и мастерах",
                  "Обращаться в службу поддержки по вопросам работы Платформы",
                  "Получать информацию о статусе своих заказов",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-firm-gray text-sm">
                    <span className="text-firm-pink mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-text mb-2">2.2. Пользователь обязуется:</h3>
              <ul className="space-y-2 ml-4">
                {[
                  "Предоставлять достоверную информацию при регистрации и оформлении заказов",
                  "Соблюдать условия настоящего Соглашения",
                  "Не нарушать права других пользователей и мастеров",
                  "Не размещать запрещенный контент и не использовать Платформу для незаконных целей",
                  "Сохранять конфиденциальность своих учетных данных",
                  "Своевременно уведомлять Администрацию о любых нарушениях безопасности аккаунта",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-firm-gray text-sm">
                    <span className="text-firm-pink mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* 3. Условия для мастеров */}
        <motion.div
          id="masters"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="mb-10 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">
              3. Условия для мастеров
            </h2>
          </div>
          <div className="bg-forms rounded-2xl p-6 space-y-4">
            <p className="text-firm-gray text-sm leading-relaxed">
              3.1. Мастером может стать пользователь, прошедший процедуру регистрации и верификации 
              в установленном порядке. Администрация оставляет за собой право отказать в регистрации 
              без объяснения причин.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              3.2. Мастер обязуется предоставлять достоверную информацию о товарах, включая 
              фотографии, описание, размеры, материалы и цену. Изображения товаров должны 
              соответствовать реальному внешнему виду.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              3.3. Все товары, представленные мастером, должны быть созданы лично мастером или 
              с его непосредственным участием. Перепродажа товаров других мастеров запрещена.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              3.4. Мастер обязан выполнять заказы в сроки, указанные при оформлении, и поддерживать 
              связь с покупателями через внутренние каналы Платформы.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              3.5. Комиссия Платформы за проведение безопасной сделки составляет 5% от суммы заказа. 
              Подробный расчет комиссии отображается в личном кабинете мастера.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              3.6. Мастер несет ответственность за качество товара, соблюдение авторских прав и 
              соответствие товара законодательству РФ.
            </p>
          </div>
        </motion.div>

        {/* 4. Условия для покупателей */}
        <motion.div
          id="buyers"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
          className="mb-10 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-pink to-firm-orange rounded-lg flex items-center justify-center">
              <CartIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">
              4. Условия для покупателей
            </h2>
          </div>
          <div className="bg-forms rounded-2xl p-6 space-y-4">
            <p className="text-firm-gray text-sm leading-relaxed">
              4.1. Оформляя заказ, покупатель обязуется предоставить достоверные данные для доставки 
              и оплаты товара.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              4.2. Покупатель имеет право отказаться от заказа до момента его отправки мастером. 
              В этом случае денежные средства возвращаются на счет покупателя в полном объеме.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              4.3. После получения товара покупатель обязуется в течение 3 дней проверить его и 
              подтвердить получение либо открыть спор о несоответствии.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              4.4. Покупатель имеет право оставлять отзывы о товарах и мастерах, руководствуясь 
              принципами объективности и достоверности. Заведомо ложные отзывы запрещены.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              4.5. Возврат товара надлежащего качества осуществляется в соответствии с Законом 
              РФ «О защите прав потребителей». Товары, изготовленные на заказ, возврату не подлежат, 
              если они не имеют брака.
            </p>
          </div>
        </motion.div>

        {/* 5. Оплата и доставка */}
        <motion.div
          id="payments"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="mb-10 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <LockIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">
              5. Оплата и доставка
            </h2>
          </div>
          <div className="bg-forms rounded-2xl p-6 space-y-4">
            <p className="text-firm-gray text-sm leading-relaxed">
              5.1. Оплата товаров осуществляется через защищенные платежные системы, интегрированные 
              с Платформой. Денежные средства поступают на эскроу-счет и блокируются до подтверждения 
              получения товара покупателем.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              5.2. Стоимость доставки рассчитывается индивидуально для каждого заказа в зависимости 
              от региона, веса и выбранного способа доставки. Информация о стоимости отображается 
              при оформлении заказа.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              5.3. Сроки доставки зависят от выбранного способа и региона. Мастер обязуется отправить 
              товар в течение 3-7 рабочих дней после подтверждения заказа, если иное не оговорено 
              дополнительно.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              5.4. Платформа не несет ответственности за задержки доставки, связанные с работой 
              почтовых служб и транспортных компаний.
            </p>
          </div>
        </motion.div>

        {/* 6. Ответственность */}
        <motion.div
          id="responsibility"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
          className="mb-10 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-pink to-firm-orange rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">
              6. Ответственность
            </h2>
          </div>
          <div className="bg-forms rounded-2xl p-6 space-y-4">
            <p className="text-firm-gray text-sm leading-relaxed">
              6.1. Платформа выступает в качестве информационного посредника и не является стороной 
              договора купли-продажи между мастером и покупателем. Ответственность за качество 
              товара несет мастер.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              6.2. Платформа не гарантирует, что товары, представленные мастерами, соответствуют 
              ожиданиям покупателей, и не несет ответственности за убытки, связанные с использованием 
              Платформы.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              6.3. Платформа не несет ответственности за временные перерывы в работе, вызванные 
              техническими неисправностями, проведением профилактических работ или действиями 
              третьих лиц.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              6.4. В случае возникновения спора между мастером и покупателем, Платформа оказывает 
              содействие в его урегулировании, но не принимает на себя обязательства по возмещению 
              убытков.
            </p>
            <p className="text-firm-gray text-sm leading-relaxed">
              6.5. Администрация оставляет за собой право блокировать учетные записи пользователей, 
              нарушающих условия Соглашения, без предварительного уведомления.
            </p>
          </div>
        </motion.div>

        {/* 7. Контакты */}
        <motion.div
          id="contacts"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
          className="mb-10 scroll-mt-20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center">
              <MailIcon className="w-4 h-4" color="#f9f9f9" />
            </div>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl sm:text-2xl text-text">
              7. Контактная информация
            </h2>
          </div>
          <div className="bg-forms rounded-2xl p-6 space-y-4">
            <p className="text-firm-gray text-sm leading-relaxed">
              7.1. По всем вопросам, связанным с настоящим Соглашением, вы можете обратиться к нам:
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-firm-gray text-xs">Электронная почта</p>
                <Link href="mailto:legal@knitted-history.ru" className="text-text text-sm hover:text-firm-orange transition-colors break-all">
                  legal@knitted-history.ru
                </Link>
              </div>
              <div>
                <p className="text-firm-gray text-xs">Телефон</p>
                <Link href="tel:+74951234567" className="text-text text-sm hover:text-firm-orange transition-colors">
                  +7 (495) 123-45-67
                </Link>
              </div>
              <div>
                <p className="text-firm-gray text-xs">Почтовый адрес</p>
                <p className="text-text text-sm">г. Москва, ул. Тверская, д. 15, стр. 1, офис 304, индекс 125009</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Заключительные положения */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
          className="bg-firm-orange/5 rounded-2xl p-6 border border-firm-orange/20"
        >
          <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-2">
            Изменения пользовательского соглашения
          </h3>
          <p className="text-firm-gray text-sm leading-relaxed">
            Администрация оставляет за собой право в любое время вносить изменения в настоящее 
            Соглашение без предварительного уведомления Пользователя. Продолжая использовать 
            Платформу после внесения изменений, вы автоматически принимаете их условия.
            Рекомендуем периодически проверять эту страницу на предмет актуальности информации.
          </p>
          <p className="text-firm-gray text-xs mt-4">
            Актуальная версия Соглашения: 2.4 от {lastUpdated}
          </p>
        </motion.div>
      </div>

      {/* Возврат на главную */}
      <section className="py-8 sm:py-12 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300"
            >
              ← Вернуться на главную
            </motion.button>
          </Link>
        </div>
      </section>
    </div>
  );
}