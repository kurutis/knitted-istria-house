"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TruckIcon } from "@/components/icons/TruckIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";
import { LocateIcon } from "@/components/icons/LocateIcon";
import { PackageIcon } from "@/components/icons/PackageIcon";
import { ShieldCheckIcon } from "@/components/icons/ShieldCheckIcon";
import { LockIcon } from "@/components/icons/LockIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { YooKassaIcon } from "@/components/icons/payments/YooKassaIcon";
import { TBankIcon } from "@/components/icons/payments/TBankIcon";
import { SBPIcon } from "@/components/icons/payments/SBPIcon";
import { SberIcon } from "@/components/icons/payments/SberIcon";

export default function DeliveryPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const deliveryMethods = [{icon: <TruckIcon className="w-8 h-8" color="#F4A67F" />, title: "Курьерская доставка", price: "350 ₽", priceFree: "Бесплатно при заказе от 5 000 ₽", time: "1-3 рабочих дня", description: "Доставка курьером до двери. Вы сможете отслеживать статус заказа в личном кабинете."}, {icon: <PackageIcon className="w-8 h-8" color="#D97C8E" />, title: "Пункты выдачи заказов", price: "250 ₽", priceFree: "Бесплатно при заказе от 3 000 ₽", time: "2-4 рабочих дня", description: "Более 5000 пунктов выдачи по всей России. Удобный способ получения заказа."}, {icon: <LocateIcon className="w-8 h-8" color="#94D06C" />, title: "Почта России", price: "от 200 ₽", priceFree: "Бесплатно при заказе от 4 000 ₽", time: "5-14 рабочих дней", description: "Доставка в отделение почты. Отслеживание по трек-номеру."}];
  const regions = [{ name: "Москва и Московская область", time: "1-2 дня", price: "350 ₽" }, { name: "Санкт-Петербург и ЛО", time: "1-3 дня", price: "400 ₽" }, { name: "Другие города России", time: "3-7 дней", price: "от 350 ₽" }, { name: "Удаленные регионы (Крайний Север, ДВ)", time: "7-14 дней", price: "от 500 ₽" }];
  const rules = ["Заказ обрабатывается в течение 1-2 рабочих дней после подтверждения оплаты", "После отправки заказа вы получаете трек-номер для отслеживания", "Срок хранения заказа в пункте выдачи — 7 дней", "При необходимости примерки курьер ждет до 15 минут", "Изменение адреса доставки возможно до момента отправки заказа", "При неполучении заказа в срок, он возвращается продавцу, стоимость доставки не компенсируется"];
  const returnConditions = ["Товар не подошел по размеру, цвету или фасону", "Товар имеет производственный брак", "Товар не соответствует описанию на сайте", "Срок возврата — 14 дней с момента получения заказа", "Товар должен быть в оригинальной упаковке с сохранением всех ярлыков"];
  const paymentMethods = [{icon: <YooKassaIcon size={32} />, title: "ЮKassa", description: "Банковские карты, СБП, Apple Pay"}, {icon: <TBankIcon size={32} />, title: "Т-Банк", description: "Карты, Рассрочка, Кредит", popular: true}, {icon: <SBPIcon size={32} />, title: "СБП", description: "Система быстрых платежей"}, {con: <SberIcon size={32} />, title: "Сбербанк", description: "По реквизитам или СБП"}];

  return (
    <div className="min-h-screen bg-main">
      <section className="relative bg-linear-to-br from-firm-orange/5 via-main to-firm-pink/5 py-16 sm:py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mb-6 sm:mb-8 inline-flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center shadow-lg">
              <TruckIcon className="w-8 h-8 sm:w-10 sm:h-10" color="#f9f9f9" />
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="font-['Montserrat_Alternates'] font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-4 sm:mb-6">Доставка и оплата</motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }} className="text-firm-gray text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">Удобные способы доставки по всей России. Мы заботимся о том, чтобы ваши покупки пришли быстро и в сохранности.</motion.p>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center mb-10 sm:mb-12">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">Способы доставки</h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
            <p className="text-firm-gray text-sm sm:text-base mt-4 max-w-2xl mx-auto">Выберите наиболее удобный для вас вариант получения заказа</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {deliveryMethods.map((method, idx) => (
              <motion.div key={method.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: idx * 0.1, duration: 0.6, ease: "easeOut" }} whileHover={{ y: -5 }} className="bg-main rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-center mb-4">{method.icon}</div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text text-center mb-2">{method.title}</h3>
                <div className="text-center mb-3">
                  <span className="text-2xl font-bold text-firm-orange">{method.price}</span>
                  <p className="text-firm-green text-xs sm:text-sm mt-1">{method.priceFree}</p>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3 text-firm-gray text-sm">
                  <ClockIcon className="w-4 h-4" color="#737682" />
                  <span>{method.time}</span>
                </div>
                <p className="text-firm-gray text-xs sm:text-sm text-center leading-relaxed">{method.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-12 sm:py-16 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}  transition={{ duration: 0.6, ease: "easeOut" }} className="text-center mb-8 sm:mb-10">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">Стоимость доставки по регионам</h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
          </motion.div>

          <motion.div  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-main rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-linear-to-r from-firm-orange/10 to-firm-pink/10">
                  <tr>
                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-text">Регион</th>
                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-text">Срок доставки</th>
                    <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-text">Стоимость</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region, idx) => (
                    <motion.tr key={region.name} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}  viewport={{ once: true }}  transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }} className="border-b border-gray-100 hover:bg-forms transition-all duration-300">
                      <td className="p-4 text-text text-sm">{region.name}</td>
                      <td className="p-4 text-firm-gray text-sm">{region.time}</td>
                      <td className="p-4 font-semibold text-firm-orange text-sm">{region.price}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }} className="text-firm-gray text-xs text-center mt-4">* Точную стоимость доставки вы можете рассчитать при оформлении заказа</motion.p>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-r from-firm-orange to-firm-pink rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-5 h-5" color="#f9f9f9" />
                </div>
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl text-text">Правила доставки</h2>
              </div>
              <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-6" />

              <ul className="space-y-3">
                {rules.map((rule, idx) => (<motion.li key={idx} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }} className="flex items-start gap-3 text-firm-gray text-sm"><CheckIcon size={14} color="#94D06C" className="mt-0.5 shrink-0" />{rule}</motion.li>))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-r from-firm-pink to-firm-orange rounded-xl flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5" color="#f9f9f9" />
                </div>
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl text-text">Условия возврата</h2>
              </div>
              <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-6" />

              <p className="text-firm-gray text-sm mb-4">Вы можете вернуть товар надлежащего качества в течение 14 дней после получения, если:</p>

              <ul className="space-y-3 mb-6">
                {returnConditions.map((condition, idx) => (
                  <motion.li key={idx} initial={{ opacity: 0, x: 20 }}  whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05, duration: 0.4, ease: "easeOut" }} className="flex items-start gap-3 text-firm-gray text-sm"><span className="text-firm-pink mt-0.5 shrink-0">•</span>{condition}</motion.li>))}
              </ul>

              <div className="bg-forms rounded-xl p-4">
                <p className="text-firm-gray text-xs sm:text-sm"><span className="font-semibold text-text">Важно:</span> Возврат товаров ручной работы осуществляется в соответствии с законодательством РФ. Изделия, созданные на заказ, возврату и обмену не подлежат, если они не имеют брака.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center mb-8 sm:mb-10">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">Способы оплаты</h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paymentMethods.map((method, idx) => (
              <motion.div key={method.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: idx * 0.1, duration: 0.6, ease: "easeOut" }} whileHover={{ y: -5 }} className="bg-main rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all duration-300 relative">
                {method.popular && (<span className="absolute top-2 right-2 text-xs px-2 py-0.5 bg-firm-orange/10 text-firm-orange rounded-full">Популярный</span>)}
                <div className="flex justify-center mb-3">{method.icon}</div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-2">{method.title}</h3>
                <p className="text-firm-gray text-xs">{method.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }}  whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }} className="mt-8 bg-firm-green/10 rounded-xl p-4 text-center">
            <p className="text-firm-green text-sm font-medium flex items-center justify-center gap-2"><LockIcon size={14} color="#22C55E" />Безопасность платежей гарантирована. Все транзакции проходят через защищенный шлюз.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }} className="text-center mb-8 sm:mb-10">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text">Часто задаваемые вопросы</h2>
            <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {question: "Как отследить мой заказ?", answer: "После отправки заказа вы получите трек-номер на email и в SMS. Отслеживать статус можно в личном кабинете или на сайте службы доставки."}, {question: "Могу ли я изменить адрес доставки?", answer: "Да, вы можете изменить адрес доставки до момента отправки заказа. Для этого свяжитесь с нашей службой поддержки."}, {question: "Что делать, если заказ не пришел?", answer: "Если заказ не пришел в указанные сроки, свяжитесь с нашей поддержкой. Мы проверим статус и поможем решить проблему."}, {question: "Можно ли вернуть товар, если он не подошел?", answer: "Да, вы можете вернуть товар надлежащего качества в течение 14 дней. Исключение — товары, изготовленные на заказ."}].map((faq, idx) => (
              <motion.div  key={faq.question} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }} className="bg-forms rounded-xl p-5 hover:shadow-md transition-all duration-300">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-text text-base sm:text-lg mb-2">{faq.question}</h3>
                <p className="text-firm-gray text-sm leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-linear-to-r from-firm-orange/10 to-firm-pink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">Остались вопросы? </h2>
            <p className="text-firm-gray text-sm sm:text-base max-w-2xl mx-auto mb-6">Наша служба поддержки всегда готова помочь вам с любыми вопросами о доставке и оплате</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacts"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300">Связаться с нами</motion.button></Link>
              <Link href="/catalog"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-3 border-2 border-firm-pink text-firm-pink rounded-xl font-medium hover:bg-firm-pink hover:text-main transition-all duration-300">Перейти в каталог</motion.button></Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}