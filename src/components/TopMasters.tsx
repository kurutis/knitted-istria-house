'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Master {
  id: string
  name: string
  avatar_url: string
  sales: number
  rating: number
}

export default function TopMasters() {
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchTopMasters()
  }, [])

  const fetchTopMasters = async () => {
    try {
      const response = await fetch('/api/masters/top')
      const data = await response.json()
      setMasters(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching top masters:', error)
      setMasters([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="my-16 text-center">
        <motion.div 
          className="w-8 h-8 border-2 border-gray-200 border-t-firm-orange rounded-full inline-block"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }

  if (!Array.isArray(masters) || masters.length === 0) return null

  const first = masters[0]
  const second = masters[1]
  const third = masters[2]
  const rest = masters.slice(3)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  }

  // Мобильная версия
  if (isMobile) {
    return (
      <motion.div 
        className="py-8 bg-gradient-to-b from-white to-[#F9F9F9]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={containerVariants}
      >
        <div className="text-center mb-6">
          <motion.h2 
            className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Лучшие мастера месяца
          </motion.h2>
          <motion.div 
            className="w-16 h-0.5 bg-gradient-to-r from-firm-orange to-firm-pink mx-auto mt-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: 64 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>

        <div className="flex justify-around items-center gap-2 px-2 mb-6">
          {second && (
            <motion.div 
              className="flex-1 bg-white rounded-xl shadow-md p-3 text-center"
              variants={itemVariants}
            >
              <div className="relative inline-block mx-auto">
                <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                  2
                </div>
                {second.avatar_url ? (
                  <img
                    src={second.avatar_url}
                    alt={second.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 mx-auto"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xl font-bold mx-auto">
                    {second.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-sm mt-2 line-clamp-1">
                {second.name}
              </h3>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                <span className="text-yellow-400 text-xs">★</span>
                <span className="text-xs text-gray-600">{second.rating}</span>
              </div>
            </motion.div>
          )}

          {first && (
            <motion.div 
              className="flex-1 bg-white rounded-xl shadow-lg p-4 text-center relative -mt-4"
              variants={itemVariants}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-firm-orange to-firm-pink text-white px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shadow-md">
                🏆 1 место
              </div>
              {first.avatar_url ? (
                <img
                  src={first.avatar_url}
                  alt={first.name}
                  className="w-16 h-16 rounded-full object-cover border-3 border-firm-orange mx-auto mt-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-2xl font-bold mx-auto mt-2">
                  {first.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="font-['Montserrat_Alternates'] font-bold text-base mt-2 line-clamp-1">
                {first.name}
              </h3>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                <span className="text-yellow-400 text-sm">★</span>
                <span className="text-sm font-semibold text-gray-700">{first.rating}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                📦 {first.sales} продаж
              </p>
            </motion.div>
          )}

          {third && (
            <motion.div 
              className="flex-1 bg-white rounded-xl shadow-md p-3 text-center"
              variants={itemVariants}
            >
              <div className="relative inline-block mx-auto">
                <div className="absolute -top-2 -left-2 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                  3
                </div>
                {third.avatar_url ? (
                  <img
                    src={third.avatar_url}
                    alt={third.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 mx-auto"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xl font-bold mx-auto">
                    {third.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-sm mt-2 line-clamp-1">
                {third.name}
              </h3>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                <span className="text-yellow-400 text-xs">★</span>
                <span className="text-xs text-gray-600">{third.rating}</span>
              </div>
            </motion.div>
          )}
        </div>

        {Array.isArray(rest) && rest.length > 0 && (
          <motion.div 
            className="px-4 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xs text-gray-400 mb-2">Другие мастера:</p>
            {rest.map((master, idx) => (
              <motion.div
                key={master.id}
                className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + idx * 0.05 }}
              >
                <div className="text-xs font-bold text-gray-400 w-6">
                  {idx + 4}
                </div>
                {master.avatar_url ? (
                  <img
                    src={master.avatar_url}
                    alt={master.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold">
                    {master.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{master.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>★ {master.rating}</span>
                    <span>📦 {master.sales} продаж</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="text-center mt-6">
          <Link href="/masters">
            <button className="text-sm text-firm-orange font-medium">
              Все мастера →
            </button>
          </Link>
        </div>
      </motion.div>
    )
  }

  // Десктопная версия
  return (
    <motion.div 
      className="py-16 bg-gradient-to-b from-white to-[#F9F9F9] overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="text-center mb-12">
        <motion.h2 
          className="font-['Montserrat_Alternates'] font-semibold text-3xl text-gray-800"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Лучшие мастера месяца
        </motion.h2>
        <motion.div 
          className="w-20 h-1 bg-gradient-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: 80 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </div>

      <div className="flex justify-center items-end gap-4 lg:gap-8 flex-wrap">
        {second && (
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-6 w-56 lg:w-64 transform hover:-translate-y-2 transition-all duration-300"
            variants={itemVariants}
            whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
          >
            <div className="relative">
              <motion.div 
                className="absolute -top-3 -left-3 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-sm"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                2
              </motion.div>
              <div className="flex justify-center">
                {second.avatar_url ? (
                  <motion.img
                    src={second.avatar_url}
                    alt={second.name}
                    className="w-24 h-24 lg:w-28 lg:h-28 rounded-full object-cover border-4 border-gray-200"
                    whileHover={{ scale: 1.05 }}
                  />
                ) : (
                  <motion.div 
                    className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-3xl font-bold"
                    whileHover={{ scale: 1.05 }}
                  >
                    {second.name?.charAt(0).toUpperCase()}
                  </motion.div>
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg lg:text-xl text-gray-800">
                {second.name}
              </h3>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-yellow-400">★</span>
                <span className="text-sm text-gray-600">{second.rating}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                📦 {second.sales} продаж
              </p>
            </div>
          </motion.div>
        )}

        {first && (
          <motion.div 
            className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 w-64 lg:w-72 transform relative"
            variants={itemVariants}
            whileHover={{ y: -15, boxShadow: "0 30px 50px rgba(0,0,0,0.15)" }}
          >
            <motion.div 
              className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-firm-orange to-firm-pink text-white px-3 py-0.5 lg:px-4 lg:py-1 rounded-full text-xs lg:text-sm font-semibold shadow-lg whitespace-nowrap"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
            >
              🏆 1 место
            </motion.div>
            <div className="flex justify-center mt-4">
              {first.avatar_url ? (
                <motion.img
                  src={first.avatar_url}
                  alt={first.name}
                  className="w-28 h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-firm-orange"
                  whileHover={{ scale: 1.05 }}
                />
              ) : (
                <motion.div 
                  className="w-28 h-28 lg:w-32 lg:h-32 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-4xl font-bold"
                  whileHover={{ scale: 1.05 }}
                >
                  {first.name?.charAt(0).toUpperCase()}
                </motion.div>
              )}
            </div>
            <div className="text-center mt-4">
              <h3 className="font-['Montserrat_Alternates'] font-bold text-xl lg:text-2xl text-gray-800">
                {first.name}
              </h3>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-yellow-400 text-base lg:text-lg">★</span>
                <span className="text-sm font-semibold text-gray-700">{first.rating}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                📦 {first.sales} продаж
              </p>
            </div>
          </motion.div>
        )}

        {third && (
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-6 w-56 lg:w-64 transform hover:-translate-y-2 transition-all duration-300"
            variants={itemVariants}
            whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
          >
            <div className="relative">
              <motion.div 
                className="absolute -top-3 -left-3 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
              >
                3
              </motion.div>
              <div className="flex justify-center">
                {third.avatar_url ? (
                  <motion.img
                    src={third.avatar_url}
                    alt={third.name}
                    className="w-24 h-24 lg:w-28 lg:h-28 rounded-full object-cover border-4 border-gray-200"
                    whileHover={{ scale: 1.05 }}
                  />
                ) : (
                  <motion.div 
                    className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-3xl font-bold"
                    whileHover={{ scale: 1.05 }}
                  >
                    {third.name?.charAt(0).toUpperCase()}
                  </motion.div>
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg lg:text-xl text-gray-800">
                {third.name}
              </h3>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-yellow-400">★</span>
                <span className="text-sm text-gray-600">{third.rating}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                📦 {third.sales} продаж
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {Array.isArray(rest) && rest.length > 0 && (
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Link href="/masters">
            <button className="text-firm-orange font-medium hover:underline">
              и еще {rest.length} мастеров →
            </button>
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}