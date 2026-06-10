"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MailIcon } from "@/components/icons/MailIcon";
import { PhoneIcon } from "@/components/icons/PhoneIcon";
import { LocateIcon } from "@/components/icons/LocateIcon";
import { ClockIcon } from "@/components/icons/ClockIcon";
import { ChatIcon } from "@/components/icons/ChatIcon";

export default function ContactsPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const contactItems = [{icon: <MailIcon className="w-6 h-6 sm:w-7 sm:h-7" color="#D97C8E" />, title: "Email для общих вопросов", value: "hello@knitted-history.ru", link: "mailto:hello@knitted-history.ru"}, {icon: <MailIcon className="w-6 h-6 sm:w-7 sm:h-7" color="#F4A67F" />, title: "Поддержка мастеров", value: "masters@knitted-history.ru", link: "mailto:masters@knitted-history.ru"}, {icon: <MailIcon className="w-6 h-6 sm:w-7 sm:h-7" color="#94D06C" />, title: "Отдел продаж и партнерство", value: "partners@knitted-history.ru", link: "mailto:partners@knitted-history.ru"}, {icon: <PhoneIcon className="w-6 h-6 sm:w-7 sm:h-7" color="#D97C8E" />, title: "Телефон горячей линии", value: "+7 (495) 123-45-67", link: "tel:+74951234567", note: "Пн-Пт с 10:00 до 19:00"}];
  const socialLinks = [{ name: "Telegram", href: "https://t.me/knitted-istria", color: "#2AABEE" }, { name: "ВКонтакте", href: "https://vk.com/knitted-istria", color: "#607EB5" }, { name: "Одноклассники", href: "https://ok.ru/knitted-istria", color: "#FF7700" }];
  const officeHours = [{ day: "Понедельник - Пятница", hours: "10:00 - 19:00" }, { day: "Суббота", hours: "11:00 - 16:00" }, { day: "Воскресенье", hours: "Выходной" }];

  return (
    <div className="min-h-screen bg-main">
      <section className="relative bg-gradient-to-br from-firm-orange/5 via-main to-firm-pink/5 py-16 sm:py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="mb-6 sm:mb-8 inline-flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center shadow-lg">
              <ChatIcon className="w-8 h-8 sm:w-10 sm:h-10" color="#f9f9f9" />
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="font-['Montserrat_Alternates'] font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent mb-4 sm:mb-6">Контакты</motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }} className="text-firm-gray text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">Мы всегда рады помочь и ответить на ваши вопросы</motion.p>
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }}>
              <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">Свяжитесь с нами</h2>
              <div className="w-16 h-1 bg-linear-to-r from-firm-orange to-firm-pink rounded-full mb-6" />
              <p className="text-firm-gray text-sm sm:text-base mb-8">Выберите удобный способ связи — мы постараемся ответить как можно быстрее.</p>

              <div className="space-y-5">
                {contactItems.map((item, idx) => (
                  <motion.a key={idx} href={item.link} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }} className="flex items-start gap-4 p-4 bg-forms rounded-xl hover:shadow-md transition-all duration-300 group">
                    <div className="shrink-0 mt-1">{item.icon}</div>
                    <div>
                      <p className="text-firm-gray text-xs sm:text-sm">{item.title}</p>
                      <p className="font-['Montserrat_Alternates'] font-medium text-text text-sm sm:text-base group-hover:text-firm-orange transition-colors">{item.value}</p>
                      {item.note && (<p className="text-firm-gray text-xs mt-1">{item.note}</p>)}
                    </div>
                  </motion.a>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-text mb-4">Мы в соцсетях</h3>
                <div className="flex gap-4">
                  {socialLinks.map((social, idx) => (
                    <motion.a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: idx * 0.1, duration: 0.3, ease: "easeOut" }} whileHover={{ y: -3, scale: 1.05 }} className="w-10 h-10 rounded-full bg-forms flex items-center justify-center hover:shadow-lg transition-all duration-300">
                      {social.name === "Telegram" && (
                        <svg width="20" height="20" viewBox="0 0 67 67" fill="none">
                          <path d="M33.5 0C15.008 0 0 15.008 0 33.5C0 51.992 15.008 67 33.5 67C51.992 67 67 51.992 67 33.5C67 15.008 51.992 0 33.5 0ZM49.044 22.78C48.5415 28.073 46.364 40.937 45.2585 46.8665C44.7895 49.379 43.8515 50.2165 42.9805 50.317C41.0375 50.4845 39.5635 49.044 37.6875 47.8045C34.7395 45.8615 33.0645 44.6555 30.217 42.7795C26.9005 40.602 29.0445 39.396 30.954 37.453C31.4565 36.9505 40.0325 29.145 40.2 28.4415C40.2233 28.3349 40.2202 28.2243 40.191 28.1192C40.1618 28.0142 40.1074 27.9178 40.0325 27.8385C39.8315 27.671 39.5635 27.738 39.329 27.7715C39.0275 27.8385 34.3375 30.954 25.192 37.118C23.852 38.0225 22.646 38.4915 21.574 38.458C20.368 38.4245 18.09 37.788 16.3815 37.2185C14.271 36.5485 12.6295 36.18 12.7635 35.0075C12.8305 34.4045 13.668 33.8015 15.2425 33.165C25.0245 28.9105 31.5235 26.0965 34.773 24.7565C44.086 20.8705 45.9955 20.2005 47.2685 20.2005C47.5365 20.2005 48.173 20.2675 48.575 20.6025C48.91 20.8705 49.0105 21.239 49.044 21.507C49.0105 21.708 49.0775 22.311 49.044 22.78Z" fill={social.color}/>
                          <path d="M49.044 22.78C48.5415 28.073 46.364 40.937 45.2585 46.8665C44.7895 49.379 43.8515 50.2165 42.9805 50.317C41.0375 50.4845 39.5635 49.044 37.6875 47.8045C34.7395 45.8615 33.0645 44.6555 30.217 42.7795C26.9005 40.602 29.0445 39.396 30.954 37.453C31.4565 36.9505 40.0325 29.145 40.2 28.4415C40.2233 28.3349 40.2202 28.2243 40.191 28.1192C40.1618 28.0142 40.1074 27.9178 40.0325 27.8385C39.8315 27.671 39.5635 27.738 39.329 27.7715C39.0275 27.8385 34.3375 30.954 25.192 37.118C23.852 38.0225 22.646 38.4915 21.574 38.458C20.368 38.4245 18.09 37.788 16.3815 37.2185C14.271 36.5485 12.6295 36.18 12.7635 35.0075C12.8305 34.4045 13.668 33.8015 15.2425 33.165C25.0245 28.9105 31.5235 26.0965 34.773 24.7565C44.086 20.8705 45.9955 20.2005 47.2685 20.2005C47.5365 20.2005 48.173 20.2675 48.575 20.6025C48.91 20.8705 49.0105 21.239 49.044 21.507C49.0105 21.708 49.0775 22.311 49.044 22.78Z" fill="white"/>
                        </svg>
                      )}
                      {social.name === "ВКонтакте" && (
                        <svg width="20" height="20" viewBox="0 0 67 67" fill="none">
                          <circle cx="33.5" cy="33.5" r="33.5" fill={social.color}/>
                          <path d="M47.36 44.8058H44.0321C42.7735 44.8058 42.3944 43.7864 40.1383 41.5289C38.1667 39.6287 37.334 39.3925 36.8352 39.3925C36.1454 39.3925 35.9573 39.5821 35.9573 40.5314V43.5239C35.9573 44.3333 35.6948 44.8073 33.5802 44.8073C31.5288 44.6695 29.5394 44.0462 27.776 42.989C26.0126 41.9317 24.5256 40.4706 23.4375 38.726C20.8548 35.5099 19.0573 31.736 18.1875 27.7039C18.1875 27.2052 18.3771 26.7531 19.3279 26.7531H22.6529C23.5075 26.7531 23.8152 27.1337 24.1506 28.0131C25.765 32.7644 28.5198 36.8973 29.6383 36.8973C30.0671 36.8973 30.2538 36.7077 30.2538 35.6387V30.7446C30.1123 28.5119 28.9267 28.3237 28.9267 27.5158C28.9417 27.3027 29.0392 27.1038 29.1985 26.9613C29.3578 26.8189 29.5663 26.7442 29.7798 26.7531H35.0065C35.721 26.7531 35.9573 27.1089 35.9573 27.9635V34.5698C35.9573 35.2829 36.2635 35.5191 36.4794 35.5191C36.9081 35.5191 37.2377 35.2829 38.0238 34.4983C39.708 32.443 41.0844 30.1538 42.11 27.7025C42.2145 27.4078 42.4127 27.1556 42.6743 26.9844C42.9358 26.8132 43.2463 26.7324 43.5581 26.7546H46.8846C47.8821 26.7546 48.0935 27.2533 47.8821 27.965C46.6719 30.675 45.1749 33.2476 43.4167 35.6387C43.0579 36.1856 42.915 36.47 43.4167 37.1116C43.7462 37.6104 44.9129 38.5846 45.696 39.5106C46.8365 40.6481 47.7829 41.9635 48.499 43.4044C48.7848 44.3319 48.3094 44.8058 47.36 44.8058Z" fill="white"/>
                        </svg>
                      )}
                      {social.name === "Одноклассники" && (
                        <svg width="20" height="20" viewBox="0 0 67 67" fill="none">
                          <path d="M31.9271 40.1865C29.3476 39.9152 27.0261 39.2753 25.0362 37.7075L24.9833 37.6663L24.9071 37.6071C24.7011 37.4473 24.4948 37.2874 24.3092 37.1045C23.4382 36.267 23.3478 35.2989 24.0412 34.3073C24.6275 33.4564 25.6157 33.2286 26.6475 33.7143C26.8482 33.8091 27.039 33.9236 27.217 34.056C30.9255 36.6221 36.0208 36.6925 39.746 34.1699C40.1031 33.8761 40.5171 33.6594 40.9621 33.5334C41.374 33.4128 41.8146 33.4344 42.2127 33.5949C42.6108 33.7553 42.9432 34.0453 43.1563 34.4178C43.7024 35.3123 43.6923 36.1833 43.0223 36.8767C41.996 37.9235 40.7531 38.733 39.3809 39.2485C38.0811 39.7577 36.654 40.0123 35.2436 40.1832L35.3659 40.3173C35.5021 40.4668 35.5869 40.56 35.6925 40.6656C37.6087 42.5974 39.5238 44.5337 41.4378 46.4745C42.0877 47.1378 42.225 47.9585 41.8666 48.729C41.4746 49.5665 40.5969 50.1226 39.7393 50.0623C39.2191 50.009 38.7382 49.7613 38.3926 49.3689C37.9117 48.8812 37.4277 48.3965 36.9438 47.9119L36.9429 47.9109C35.9743 46.9409 35.0058 45.9709 34.0611 44.977C33.649 44.5415 33.448 44.6253 33.0862 45.0005C31.6301 46.5058 30.1572 47.9954 28.6676 49.4694C28.0009 50.1293 27.207 50.2499 26.4331 49.8714C26.0367 49.6845 25.7026 49.3873 25.4709 49.0154C25.2391 48.6434 25.1196 48.2125 25.1266 47.7743C25.171 47.2322 25.4231 46.7281 25.8301 46.3673L31.505 40.6421C31.5793 40.5659 31.6512 40.4872 31.7358 40.3945C31.7923 40.3326 31.8546 40.2644 31.9271 40.1865Z" fill="white"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M33.4593 33.5C31.2465 33.4806 29.1311 32.5872 27.5742 31.0146C26.0173 29.442 25.1452 27.3178 25.1479 25.1049C25.1585 22.8825 26.05 20.7549 27.6269 19.1887C29.2037 17.6226 31.3373 16.7456 33.5598 16.75C34.6652 16.7561 35.7585 16.9807 36.7767 17.411C37.795 17.8412 38.7182 18.4685 39.4931 19.2568C40.268 20.0451 40.8794 20.9789 41.2922 22.0044C41.7049 23.0299 41.9107 24.1269 41.8979 25.2322C41.8745 29.8083 38.089 33.5168 33.4593 33.5ZM37.3152 23.5502C37.5213 24.0473 37.6271 24.5802 37.6267 25.1183C37.6311 25.6564 37.5289 26.19 37.3259 26.6883C37.123 27.1866 36.8233 27.6398 36.4443 28.0217C36.0652 28.4035 35.6142 28.7065 35.1174 28.9131C34.6206 29.1197 34.0878 29.2259 33.5497 29.2254C33.0116 29.2312 32.4776 29.1306 31.9785 28.9294C31.4793 28.7283 31.0248 28.4306 30.6411 28.0533C30.2573 27.6761 29.9518 27.2267 29.7421 26.7311C29.5324 26.2355 29.4227 25.7034 29.4192 25.1652C29.4125 24.6226 29.5139 24.0841 29.7176 23.5811C29.9212 23.0781 30.223 22.6207 30.6054 22.2356C30.9877 21.8504 31.4428 21.5453 31.9443 21.338C32.4458 21.1306 32.9836 21.0253 33.5263 21.028C34.0644 21.0262 34.5975 21.1307 35.0952 21.3355C35.5928 21.5403 36.0451 21.8414 36.4261 22.2215C36.807 22.6015 37.1092 23.053 37.3152 23.5502Z" fill="white"/>
                        </svg>
                      )}
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }} className="space-y-8">
              <div className="bg-forms rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <LocateIcon className="w-6 h-6 sm:w-7 sm:h-7" color="#F4A67F" />
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">Адрес</h3>
                </div>
                <p className="text-firm-gray text-sm sm:text-base leading-relaxed">108841, г. Москва, г. Троицк, пл. Фабричная, д. 1, стр. 1, помещ. 1</p>
              </div>

              <div className="bg-forms rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ClockIcon className="w-6 h-6 sm:w-7 sm:h-7" color="#D97C8E" />
                  <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">Часы работы</h3>
                </div>
                <div className="space-y-2">
                  {officeHours.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-firm-gray text-sm">{item.day}</span>
                      <span className="font-medium text-text text-sm">{item.hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-forms rounded-2xl p-6">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text mb-4">Мы на карте</h3>
                <div className="aspect-video bg-main rounded-xl overflow-hidden shadow-md">
                  <iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A1a2b3c4d5e6f7g8h9i0j&source=constructor" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Карта офиса" className="grayscale hover:grayscale-0 transition-all duration-500" />
                </div>
                <p className="text-firm-gray text-xs text-center mt-3">г. Троицк, пл. Фабричная, д. 1, стр. 1, помещ. 1</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-forms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl text-text mb-4">Для представителей СМИ</h2>
            <p className="text-firm-gray text-sm sm:text-base max-w-2xl mx-auto mb-6">По вопросам сотрудничества и аккредитации СМИ, пожалуйста, свяжитесь с нашим пресс-центром</p>
            <Link href="mailto:press@knitted-history.ru"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all duration-300"><MailIcon className="w-4 h-4" color="#f9f9f9" />press@knitted-history.ru</motion.button></Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}