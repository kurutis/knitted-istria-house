"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheckIcon } from "@/components/icons/ShieldCheckIcon";
import { LockIcon } from "@/components/icons/LockIcon";
import { CreditCardIcon } from "@/components/icons/CreditCardIcon";
import { UserCheckIcon } from "@/components/icons/UserCheckIcon";
import { MailIcon } from "@/components/icons/MailIcon";
import { PhoneIcon } from "@/components/icons/PhoneIcon";
import { PackageIcon } from "@/components/icons/PackageIcon";
import { TruckIcon } from "@/components/icons/TruckIcon";
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon";
import { CartIcon } from "@/components/icons/CartIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";

export default function SecurityPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const safeDealSteps = [
    {
      step: "1",
      title: "Вы оформляете заказ",
      desc: "Добавляете понравившееся изделие в корзину и оформляете заказ, указав данные для доставки. Вы видите полную информацию о мастере: рейтинг, отзывы, количество выполненных заказов.",
      icon: <CartIcon className="w-6 h-6" color="#F4A67F" />,
    },
    {
      step: "2",
      title: "Вы оплачиваете заказ",
      desc: "Оплата проходит через защищенный платежный шлюз. Деньги поступают не мастеру напрямую, а на специальный эскроу-счет платформы, где они будут надежно храниться до завершения сделки.",
      icon: <CreditCardIcon className="w-6 h-6" color="#D97C8E" />,
    },
    {
      step: "3",
      title: "Деньги заморожены на счете",
      desc: "Средства заблокированы на эскроу-счете. Ни вы, ни мастер, ни платформа не можете их забрать до выполнения условий сделки. Это главная гарантия для обеих сторон.",
      icon: <LockIcon className="w-6 h-6" color="#94D06C" />,
    },
    {
      step: "4",
      title: "Мастер подтверждает заказ",
      desc: "Мастер получает уведомление о заказе и подтверждает возможность его изготовления или отправки. Только после этого начинается работа над заказом.",
      icon: <UserCheckIcon className="w-6 h-6" color="#F4A67F" />,
    },
    {
      step: "5",
      title: "Мастер отправляет товар",
      desc: "Мастер отправляет заказ выбранным вами способом доставки и загружает трек-номер для отслеживания. Вы можете наблюдать за движением посылки в реальном времени.",
      icon: <TruckIcon className="w-6 h-6" color="#D97C8E" />,
    },
    {
      step: "6",
      title: "Вы получаете и проверяете",
      desc: "Вы получаете заказ и внимательно проверяете его на соответствие описанию, размеру, цвету и качеству. На проверку у вас есть 3 дня.",
      icon: <PackageIcon className="w-6 h-6" color="#94D06C" />,
    },
    {
      step: "7",
      title: "Вы подтверждаете получение",
      desc: "Если товар полностью соответствует вашим ожиданиям — вы подтверждаете получение в личном кабинете. Это сигнал к разблокировке денег.",
      icon: <CheckCircleIcon className="w-6 h-6" color="#F4A67F" />,
    },
    {
      step: "8",
      title: "Деньги переводятся мастеру",
      desc: "После вашего подтверждения, деньги с эскроу-счета переводятся мастеру. Сделка успешно завершена. Если возникли проблемы — вы можете открыть спор.",
      icon: <ShieldCheckIcon className="w-6 h-6" color="#D97C8E" />,
    },
  ];

  const escrowBenefits = [
    {
      title: "Гарантия для покупателя",
      icon: <ShieldCheckIcon className="w-6 h-6" color="#F4A67F" />,
      items: [
        "Вы не рискуете своими деньгами — до получения товара они хранятся на эскроу-счете",
        "Если товар не пришел или не соответствует описанию — деньги вернутся к вам",
        "Мастер заинтересован отправить качественный товар — иначе он не получит оплату",
      ],
    },
    {
      title: "Гарантия для мастера",
      icon: <ShieldCheckIcon className="w-6 h-6" color="#D97C8E" />,
      items: [
        "Вы уверены, что покупатель действительно готов оплатить заказ",
        "Деньги уже зарезервированы — покупатель не может отказаться без оснований",
        "После отправки и подтверждения получения вы гарантированно получите оплату",
      ],
    },
  ];

  const faqs = [
    {
      q: "Что такое эскроу-счет?",
      a: "Эскроу-счет — это специальный банковский счет, на котором деньги покупателя блокируются до выполнения условий сделки. Платформа не имеет доступа к этим средствам. Деньги переводятся мастеру только после вашего подтверждения получения товара. Если сделка не состоялась, деньги возвращаются вам.",
    },
    {
      q: "Сколько времени дается на проверку товара?",
      a: "После получения заказа у вас есть 3 дня, чтобы проверить товар и подтвердить его получение. Если за это время вы не открыли спор и не подтвердили получение — сделка автоматически завершается, и деньги переводятся мастеру.",
    },
    {
      q: "Что делать, если товар не соответствует описанию?",
      a: "Вы можете открыть спор в течение 3 дней после получения заказа. Мы запросим у вас фото или видео, подтверждающие проблему, и свяжемся с мастером для урегулирования ситуации. Если мастер не решает проблему, мы вернем вам деньги.",
    },
    {
      q: "Как долго рассматривается спор?",
      a: "Обычно мы рассматриваем споры в течение 3-7 рабочих дней. В сложных случаях срок может быть увеличен до 14 дней. В течение всего процесса вы будете получать уведомления о статусе рассмотрения.",
    },
    {
      q: "Могу ли я отменить заказ до отправки?",
      a: "Да, вы можете отменить заказ до момента его отправки мастером. В этом случае деньги будут возвращены на вашу карту в течение 3-10 рабочих дней (срок зависит от вашего банка).",
    },
    {
      q: "Что если мастер не отвечает или не отправляет товар?",
      a: "Если мастер не подтверждает заказ в течение 3 дней или не отправляет товар после подтверждения, заказ автоматически отменяется, а деньги возвращаются вам. Вы также можете обратиться в поддержку, чтобы ускорить процесс.",
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
              <ShieldCheckIcon className="w-8 h-8 sm:w-10 sm:h-10" color="#f9f9f9" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-['Montserrat_Alternates'] font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-4 sm:mb-6"
          >
            Система безопасных сделок
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="text-firm-gray text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Покупайте и продавайте с уверенностью — мы гарантируем безопасность каждой сделки
            через механизм эскроу-счетов
          </motion.p>
        </div>
      </section>

      {/* Что такое безопасная сделка */}
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
              Как это работает
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
            <p className="text-firm-gray text-sm sm:text-base mt-4 max-w-2xl mx-auto">
              Деньги за заказ блокируются на защищенном эскроу-счете платформы и переводятся мастеру 
              только после вашего подтверждения получения товара в надлежащем состоянии
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {safeDealSteps.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.05, duration: 0.5, ease: "easeOut" }}
                className="bg-forms rounded-2xl p-5 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl flex items-center justify-center shrink-0">
                    {step.icon}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-main flex items-center justify-center text-firm-orange font-bold text-sm">
                    {step.step}
                  </div>
                </div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-text text-base mb-2">
                  {step.title}
                </h3>
                <p className="text-firm-gray text-xs leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Преимущества эскроу */}
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
              Преимущества эскроу-счета
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
            <p className="text-firm-gray text-sm sm:text-base mt-4 max-w-2xl mx-auto">
              Эскроу-механизм защищает интересы и покупателя, и продавца одновременно
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {escrowBenefits.map((benefit, idx) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: idx === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
                className="bg-main rounded-2xl p-6 shadow-md"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">
                    {benefit.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {benefit.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-firm-gray text-sm">
                      <span className="text-firm-green mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            className="mt-6 bg-firm-green/10 rounded-xl p-4 text-center"
          >
            <p className="text-firm-green text-sm font-medium">
              🔒 Платформа не имеет доступа к вашим деньгам — они хранятся на отдельном защищенном банковском счете
            </p>
          </motion.div>
        </div>
      </section>

      {/* Как открыть спор */}
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
              Что делать при возникновении проблем?
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
            <p className="text-firm-gray text-sm sm:text-base mt-4 max-w-2xl mx-auto">
              Если товар не пришел, поврежден или не соответствует описанию — вы можете открыть спор
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Открытие спора",
                desc: "В течение 3 дней после получения заказа вы можете открыть спор через личный кабинет. Нужно приложить фото или видео, подтверждающие проблему.",
                icon: <ClockIcon className="w-8 h-8" color="#F4A67F" />,
              },
              {
                step: "2",
                title: "Рассмотрение",
                desc: "Мы связываемся с мастером и запрашиваем его сторону истории. Срок рассмотрения — от 3 до 14 дней в зависимости от сложности ситуации.",
                icon: <ShieldCheckIcon className="w-8 h-8" color="#D97C8E" />,
              },
              {
                step: "3",
                title: "Принятие решения",
                desc: "Мы анализируем все доказательства и принимаем решение. Если проблема подтверждается — деньги возвращаются покупателю.",
                icon: <CheckCircleIcon className="w-8 h-8" color="#94D06C" />,
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
                className="bg-forms rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-center mb-4">{item.icon}</div>
                <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold">
                  {item.step}
                </div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-2">
                  {item.title}
                </h3>
                <p className="text-firm-gray text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Часто задаваемые вопросы */}
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
              Часто задаваемые вопросы
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
            <p className="text-firm-gray text-sm sm:text-base mt-4 max-w-2xl mx-auto">
              Ответы на самые популярные вопросы о системе безопасных сделок
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }}
                className="bg-main rounded-xl p-5 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-linear-to-r from-firm-orange to-firm-pink rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-main text-xs font-bold">?</span>
                  </div>
                  <div>
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-text text-base mb-2">
                      {faq.q}
                    </h3>
                    <p className="text-firm-gray text-sm leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Контакты поддержки */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">
              Остались вопросы о сделках?
            </h2>
            <p className="text-firm-gray text-sm sm:text-base max-w-2xl mx-auto mb-6">
              Наша служба поддержки всегда готова помочь вам с любыми вопросами о безопасных сделках, 
              открытии споров или возврате средств
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacts">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                >
                  <MailIcon className="w-4 h-4" color="#f9f9f9" />
                  Написать в поддержку
                </motion.button>
              </Link>
              <Link href="/chats">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 px-8 py-3 border-2 border-firm-pink text-firm-pink rounded-xl font-medium hover:bg-firm-pink hover:text-main transition-all duration-300"
                >
                  <PhoneIcon className="w-4 h-4" color="currentColor" />
                  Онлайн-чат
                </motion.button>
              </Link>
            </div>
            <p className="text-firm-gray text-xs mt-6">
              Или позвоните нам: +7 (495) 123-45-67 (пн-пт с 10:00 до 19:00)
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}