'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function HeroSlider() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  const slides = [
    {
      title: 'Пряжа из Троицка',
      subtitle: 'Доступ к информации',
      description: 'В электронном виде (например в видеоконференциях)',
      buttonText: 'Узнать больше',
      buttonLink: '/catalog/yarn',
      bgColor: 'from-firm-orange to-firm-pink',
      image: '/sliders/1.jpg'
    },
    {
      title: 'Мастер-классы',
      subtitle: 'Онлайн и офлайн-занятия',
      description: 'Для любого уровня подготовки',
      buttonText: 'Узнать больше',
      buttonLink: '/master-classes',
      bgColor: 'from-firm-pink to-firm-orange',
      image: '/sliders/2.jpg'
    },
    {
      title: 'Авторские изделия',
      subtitle: 'Уникальные вещи ручной работы',
      description: 'Свитера, шапки, пледы и многое другое',
      buttonText: 'Узнать больше',
      buttonLink: '/catalog',
      bgColor: 'from-firm-orange to-[#FF8A5C]',
      image: '/sliders/3.jpg'
    },
    {
      title: 'Сообщество',
      subtitle: 'Дом вязанных историй',
      description: 'Делитесь работами, общайтесь, вдохновляйтесь',
      buttonText: 'Узнать больше',
      buttonLink: '/community',
      bgColor: 'from-firm-pink to-[#FF6B6B]',
      image: '/sliders/4.jpg'
    }
  ]

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight)
    }

    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setActiveSlideIndex(prev => prev === slides.length - 1 ? 0 : prev + 1)
      }, 10000)
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current)
      }
    }
  }, [isAutoPlaying, slides.length])

  const handleManualChange = (direction: 'up' | 'down') => {
    setIsAutoPlaying(false)
    if (direction === 'up') {
      setActiveSlideIndex(prev => prev === slides.length - 1 ? 0 : prev + 1)
    } else {
      setActiveSlideIndex(prev => prev === 0 ? slides.length - 1 : prev - 1)
    }
    
    setTimeout(() => {
      setIsAutoPlaying(true)
    }, 3000)
  }

  const handleIndicatorClick = (index: number) => {
    setIsAutoPlaying(false)
    setActiveSlideIndex(index)
    setTimeout(() => {
      setIsAutoPlaying(true)
    }, 3000)
  }

  return (
    <div ref={containerRef} className="relative w-full h-150 overflow-hidden rounded-2xl shadow-2xl group">
      <div className="absolute top-0 left-0 w-[35%] h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateY(-${activeSlideIndex * containerHeight}px)` }}>
        {slides.map((slide, i) => (
          <div key={i} className={`h-full w-full flex items-center justify-center text-white bg-gradient-to-r ${slide.bgColor}`}>
            <div className="text-center px-8">
              <h2 className="font-['Montserrat_Alternates'] text-white font-bold text-4xl mb-3">{slide.title}</h2>
              <h3 className="font-['Montserrat_Alternates'] text-white text-xl mb-2">{slide.subtitle}</h3>
              <p className="text-white text-base mb-6">{slide.description}</p>
              <Link href={slide.buttonLink}><button className="px-6 py-2 bg-white text-firm-orange rounded-lg font-['Montserrat_Alternates'] font-semibold hover:scale-105 transition">{slide.buttonText}</button></Link>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-0 left-[35%] w-[65%] h-full">
        <div className="relative w-full h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateY(-${activeSlideIndex * containerHeight}px)` }}>
          {slides.map((slide, i) => (
            <div key={i} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${slide.image})`, backgroundColor: '#f0f0f0', height: `${containerHeight}px`}} />
          ))}
        </div>
      </div>
      <div className="controls opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button onClick={() => handleManualChange('down')} className="down-button absolute left-[35%] top-1/2 -translate-x-full -translate-y-1/2 z-20 w-12 h-12 bg-white text-firm-orange rounded-l-lg hover:text-white hover:bg-firm-orange transition-all flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button onClick={() => handleManualChange('up')} className="up-button absolute left-[35%] top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white text-firm-pink rounded-r-lg shadow-lg hover:text-white hover:bg-firm-pink transition-all flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => handleIndicatorClick(i)} className={`h-2 rounded-full transition-all ${i === activeSlideIndex ? 'w-6 bg-firm-orange' : 'w-2 bg-white/50 hover:bg-white/75'}`} />
        ))}
      </div>
    </div>
  )
}