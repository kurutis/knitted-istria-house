"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HeroSlider() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const slides = [
    {
      title: "Пряжа из Троицка",
      subtitle: "Доступ к информации",
      description: "В электронном виде (например в видеоконференциях)",
      buttonText: "Узнать больше",
      buttonLink: "/catalog/yarn",
      bgColor: "from-firm-orange to-firm-pink",
      image: "/sliders/1.jpg",
    },
    {
      title: "Мастер-классы",
      subtitle: "Онлайн и офлайн-занятия",
      description: "Для любого уровня подготовки",
      buttonText: "Узнать больше",
      buttonLink: "/master-classes",
      bgColor: "from-firm-pink to-firm-orange",
      image: "/sliders/2.jpg",
    },
    {
      title: "Авторские изделия",
      subtitle: "Уникальные вещи ручной работы",
      description: "Свитера, шапки, пледы и многое другое",
      buttonText: "Узнать больше",
      buttonLink: "/catalog",
      bgColor: "from-firm-orange to-[#FF8A5C]",
      image: "/sliders/3.jpg",
    },
    {
      title: "Сообщество",
      subtitle: "Дом вязанных историй",
      description: "Делитесь работами, общайтесь, вдохновляйтесь",
      buttonText: "Узнать больше",
      buttonLink: "/community",
      bgColor: "from-firm-pink to-[#FF6B6B]",
      image: "/sliders/4.jpg",
    },
  ];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setActiveSlideIndex((prev) =>
          prev === slides.length - 1 ? 0 : prev + 1,
        );
      }, 10000);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, slides.length]);

  const handleManualChange = (direction: "up" | "down") => {
    setIsAutoPlaying(false);
    if (direction === "up") {
      setActiveSlideIndex((prev) =>
        prev === slides.length - 1 ? 0 : prev + 1,
      );
    } else {
      setActiveSlideIndex((prev) =>
        prev === 0 ? slides.length - 1 : prev - 1,
      );
    }

    setTimeout(() => {
      setIsAutoPlaying(true);
    }, 3000);
  };

  const handleIndicatorClick = (index: number) => {
    setIsAutoPlaying(false);
    setActiveSlideIndex(index);
    setTimeout(() => {
      setIsAutoPlaying(true);
    }, 3000);
  };

  // Мобильная версия - вертикальный слайдер
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
      >
        <div
          className="relative transition-transform duration-700 ease-out"
          style={{ transform: `translateY(-${activeSlideIndex * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className={`w-full bg-gradient-to-r ${slide.bgColor}`}>
              <div className="relative h-[500px]">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: `url(${slide.image})` }}
                />
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
                  <motion.h2
                    className="font-['Montserrat_Alternates'] text-white font-bold text-2xl sm:text-3xl mb-2"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {slide.title}
                  </motion.h2>
                  <motion.h3
                    className="font-['Montserrat_Alternates'] text-white text-lg mb-2"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    {slide.subtitle}
                  </motion.h3>
                  <motion.p
                    className="text-white text-sm mb-6"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {slide.description}
                  </motion.p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link href={slide.buttonLink}>
                      <button className="px-5 py-2 bg-white text-firm-orange rounded-lg font-['Montserrat_Alternates'] font-semibold text-sm">
                        {slide.buttonText}
                      </button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => handleIndicatorClick(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeSlideIndex
                  ? "w-5 bg-firm-orange"
                  : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Десктопная версия
  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] overflow-hidden rounded-2xl shadow-2xl group"
    >
      <div
        className="absolute top-0 left-0 w-[35%] h-full transition-transform duration-700 ease-out"
        style={{
          transform: `translateY(-${activeSlideIndex * containerHeight}px)`,
        }}
      >
        {slides.map((slide, i) => (
          <motion.div
            key={i}
            className={`h-full w-full flex items-center justify-center text-white bg-gradient-to-r ${slide.bgColor}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: activeSlideIndex === i ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-center px-8"
              initial={{ y: 30, opacity: 0 }}
              animate={{
                y: activeSlideIndex === i ? 0 : 30,
                opacity: activeSlideIndex === i ? 1 : 0,
              }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="font-['Montserrat_Alternates'] text-white font-bold text-4xl mb-3">
                {slide.title}
              </h2>
              <h3 className="font-['Montserrat_Alternates'] text-white text-xl mb-2">
                {slide.subtitle}
              </h3>
              <p className="text-white text-base mb-6">{slide.description}</p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href={slide.buttonLink}>
                  <button className="px-6 py-2 bg-white text-firm-orange rounded-lg font-['Montserrat_Alternates'] font-semibold hover:shadow-xl transition-all duration-300">
                    {slide.buttonText}
                  </button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="absolute top-0 left-[35%] w-[65%] h-full">
        <div
          className="relative w-full h-full transition-transform duration-700 ease-out"
          style={{
            transform: `translateY(-${activeSlideIndex * containerHeight}px)`,
          }}
        >
          {slides.map((slide, i) => (
            <motion.div
              key={i}
              className="h-full w-full bg-cover bg-center relative"
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundColor: "#f0f0f0",
                height: `${containerHeight}px`,
              }}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{
                scale: activeSlideIndex === i ? 1 : 1.1,
                opacity: activeSlideIndex === i ? 1 : 0,
              }}
              transition={{ duration: 0.8 }}
            >
              <div className="absolute inset-0 bg-black/20" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="controls opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <motion.button
          onClick={() => handleManualChange("down")}
          className="down-button absolute left-[35%] top-1/2 -translate-x-full -translate-y-1/2 z-20 w-10 h-10 lg:w-12 lg:h-12 bg-white/90 backdrop-blur-sm text-firm-orange rounded-l-lg hover:text-white hover:bg-firm-orange transition-all flex items-center justify-center shadow-lg"
          whileHover={{ x: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg
            className="w-4 h-4 lg:w-5 lg:h-5 rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </motion.button>
        <motion.button
          onClick={() => handleManualChange("up")}
          className="up-button absolute left-[35%] top-1/2 -translate-y-1/2 z-20 w-10 h-10 lg:w-12 lg:h-12 bg-white/90 backdrop-blur-sm text-firm-pink rounded-r-lg shadow-lg hover:text-white hover:bg-firm-pink transition-all flex items-center justify-center"
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg
            className="w-4 h-4 lg:w-5 lg:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </motion.button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => handleIndicatorClick(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === activeSlideIndex ? "w-6 bg-firm-orange" : "w-2 bg-white/50 hover:bg-white/75"}`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
    </div>
  );
}
