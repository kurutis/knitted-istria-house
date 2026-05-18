'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
              <Link href={`/masters/${second.id}`}>
                <div className="relative inline-block mx-auto cursor-pointer">
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                    2
                  </div>
                  {second.avatar_url ? (
                    <div className="relative w-14 h-14 mx-auto">
                      <Image
                        src={second.avatar_url}
                        alt={second.name}
                        fill
                        sizes="56px"
                        className="rounded-full object-cover border-2 border-gray-200"
                      />
                    </div>
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
              </Link>
            </motion.div>
          )}

          {first && (
            <motion.div 
              className="flex-1 bg-white rounded-xl shadow-lg p-4 text-center relative -mt-4"
              variants={itemVariants}
            >
              <Link href={`/masters/${first.id}`}>
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-firm-orange to-firm-pink px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shadow-md flex items-center gap-1" style={{ color: '#f9f9f9' }}>
                  <svg width="12" height="12" viewBox="0 0 299 308" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#f9f9f9' }}>
                    <path d="M66.9727 20.9823C66.9727 20.9823 60.1233 176.741 149.475 182.237C150.343 182.237 229.839 202.882 232.163 20.9823M66.9109 33.6182H60.5576C56.9625 33.6182 54.0493 30.6998 54.0493 27.0984V20.5166C54.0493 16.9153 51.1357 13.9969 47.5405 13.9969H10.5356C6.97144 13.9969 4.12019 16.8221 4.02722 20.3925C3.62431 42.3732 6.94032 115.177 66.1981 145.261C69.4833 146.937 70.2582 151.066 68.2127 154.14C66.5081 156.655 66.2911 160.194 70.816 164.664C71.5908 165.41 72.5517 165.937 73.6054 166.186C78.2233 167.303 91.4262 169.135 93.8126 147.558M67.5306 49.2965H52.623C52.2201 49.2965 51.8171 49.2654 51.4142 49.1722C48.9658 48.6755 40.598 46.316 38.4906 36.0087C37.9017 33.0903 35.0502 30.6687 32.1059 30.6997C30.7112 30.6997 29.2546 30.6998 27.8599 30.7618C24.2338 30.8239 21.4137 33.8354 21.5067 37.4368C22.0026 56.4371 28.8517 112.041 89.8141 140.666M231.946 33.6182H238.3C241.895 33.6182 244.808 30.6998 244.808 27.0984V20.5166C244.808 16.9153 247.721 13.9969 251.317 13.9969H288.322C291.886 13.9969 294.737 16.8221 294.83 20.3925C295.233 42.3732 291.917 115.177 232.659 145.261C229.374 146.937 228.599 151.066 230.645 154.14C232.349 156.655 232.566 160.194 228.041 164.664C227.267 165.41 226.306 165.937 225.252 166.186C220.634 167.303 207.431 169.135 205.045 147.558M231.327 49.2965H246.234C246.637 49.2965 247.04 49.2654 247.443 49.1722C249.891 48.6755 258.259 46.316 260.367 36.0087C260.956 33.0903 263.807 30.6687 266.751 30.6997C268.146 30.6997 269.603 30.6998 270.997 30.7618C274.624 30.8239 277.444 33.8354 277.351 37.4368C276.855 56.4371 270.006 112.041 209.043 140.666M132.367 202.82C132.367 202.82 137.853 230.482 114.361 233.618C114.764 233.618 103.389 233.618 104.97 245.198M166.025 202.82C166.025 202.82 162.492 231.259 187.162 233.214C187.565 233.214 197.731 234.798 194.197 245.167M69.6072 4H229.963C234.653 4 238.455 7.80162 238.455 12.4912C238.455 17.1807 234.653 20.9823 229.963 20.9823H69.6072C64.9172 20.9823 61.1152 17.1807 61.1152 12.4912C61.1152 7.80162 64.9172 4 69.6072 4ZM83.4924 281.647H216.698C220.293 281.647 223.207 284.566 223.207 288.166V297.48C223.207 301.081 220.293 304 216.698 304H83.4924C79.8978 304 76.9836 301.081 76.9836 297.48V288.166C76.9836 284.566 79.8978 281.647 83.4924 281.647ZM95.2381 245.167H205.541C209.135 245.167 212.049 248.086 212.049 251.687V275.127C212.049 278.728 209.135 281.647 205.541 281.647H95.2381C91.6436 281.647 88.7298 278.728 88.7298 275.127V251.687C88.7298 248.086 91.6436 245.167 95.2381 245.167ZM131.314 182.237H167.699C173.382 182.237 177.989 186.844 177.989 192.528C177.989 198.212 173.382 202.82 167.699 202.82H131.314C125.631 202.82 121.024 198.212 121.024 192.528C121.024 186.844 125.631 182.237 131.314 182.237Z" stroke="currentColor" strokeWidth="8" strokeMiterlimit="10"/>
                  </svg>
                  <span style={{ color: '#f9f9f9' }}>1 место</span>
                </div>
                {first.avatar_url ? (
                  <div className="relative w-16 h-16 mx-auto mt-2 cursor-pointer">
                    <Image
                      src={first.avatar_url}
                      alt={first.name}
                      fill
                      sizes="64px"
                      className="rounded-full object-cover border-3 border-firm-orange"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-2xl font-bold mx-auto mt-2 cursor-pointer">
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
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <Image src="/products.svg" alt="products" width={12} height={12} />
                  {first.sales} продаж
                </p>
              </Link>
            </motion.div>
          )}

          {third && (
            <motion.div 
              className="flex-1 bg-white rounded-xl shadow-md p-3 text-center"
              variants={itemVariants}
            >
              <Link href={`/masters/${third.id}`}>
                <div className="relative inline-block mx-auto cursor-pointer">
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                    3
                  </div>
                  {third.avatar_url ? (
                    <div className="relative w-14 h-14 mx-auto">
                      <Image
                        src={third.avatar_url}
                        alt={third.name}
                        fill
                        sizes="56px"
                        className="rounded-full object-cover border-2 border-gray-200"
                      />
                    </div>
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
              </Link>
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
              <Link href={`/masters/${master.id}`} key={master.id}>
                <motion.div
                  className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                >
                  <div className="text-xs font-bold text-gray-400 w-6">
                    {idx + 4}
                  </div>
                  {master.avatar_url ? (
                    <div className="relative w-10 h-10">
                      <Image
                        src={master.avatar_url}
                        alt={master.name}
                        fill
                        sizes="40px"
                        className="rounded-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold">
                      {master.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{master.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>★ {master.rating}</span>
                      <span className="flex items-center gap-1">
                        <Image src="/products.svg" alt="products" width={10} height={10} />
                        {master.sales} продаж
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
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
            <Link href={`/masters/${second.id}`}>
              <div className="relative cursor-pointer">
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
                    <div className="relative w-24 h-24 lg:w-28 lg:h-28">
                      <Image
                        src={second.avatar_url}
                        alt={second.name}
                        fill
                        sizes="(max-width: 768px) 96px, 112px"
                        className="rounded-full object-cover border-4 border-gray-200"
                      />
                    </div>
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
                <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
                  <Image src="/products.svg" alt="products" width={14} height={14} />
                  {second.sales} продаж
                </p>
              </div>
            </Link>
          </motion.div>
        )}

        {first && (
          <motion.div 
            className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 w-64 lg:w-72 transform relative"
            variants={itemVariants}
            whileHover={{ y: -15, boxShadow: "0 30px 50px rgba(0,0,0,0.15)" }}
          >
            <Link href={`/masters/${first.id}`}>
              <motion.div 
                className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-firm-orange to-firm-pink px-3 py-0.5 lg:px-4 lg:py-1 rounded-full text-xs lg:text-sm font-semibold shadow-lg whitespace-nowrap flex items-center gap-1"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                style={{ color: '#f9f9f9' }}
              >
                <svg width="14" height="14" viewBox="0 0 299 308" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#f9f9f9' }}>
                  <path d="M66.9727 20.9823C66.9727 20.9823 60.1233 176.741 149.475 182.237C150.343 182.237 229.839 202.882 232.163 20.9823M66.9109 33.6182H60.5576C56.9625 33.6182 54.0493 30.6998 54.0493 27.0984V20.5166C54.0493 16.9153 51.1357 13.9969 47.5405 13.9969H10.5356C6.97144 13.9969 4.12019 16.8221 4.02722 20.3925C3.62431 42.3732 6.94032 115.177 66.1981 145.261C69.4833 146.937 70.2582 151.066 68.2127 154.14C66.5081 156.655 66.2911 160.194 70.816 164.664C71.5908 165.41 72.5517 165.937 73.6054 166.186C78.2233 167.303 91.4262 169.135 93.8126 147.558M67.5306 49.2965H52.623C52.2201 49.2965 51.8171 49.2654 51.4142 49.1722C48.9658 48.6755 40.598 46.316 38.4906 36.0087C37.9017 33.0903 35.0502 30.6687 32.1059 30.6997C30.7112 30.6997 29.2546 30.6998 27.8599 30.7618C24.2338 30.8239 21.4137 33.8354 21.5067 37.4368C22.0026 56.4371 28.8517 112.041 89.8141 140.666M231.946 33.6182H238.3C241.895 33.6182 244.808 30.6998 244.808 27.0984V20.5166C244.808 16.9153 247.721 13.9969 251.317 13.9969H288.322C291.886 13.9969 294.737 16.8221 294.83 20.3925C295.233 42.3732 291.917 115.177 232.659 145.261C229.374 146.937 228.599 151.066 230.645 154.14C232.349 156.655 232.566 160.194 228.041 164.664C227.267 165.41 226.306 165.937 225.252 166.186C220.634 167.303 207.431 169.135 205.045 147.558M231.327 49.2965H246.234C246.637 49.2965 247.04 49.2654 247.443 49.1722C249.891 48.6755 258.259 46.316 260.367 36.0087C260.956 33.0903 263.807 30.6687 266.751 30.6997C268.146 30.6997 269.603 30.6998 270.997 30.7618C274.624 30.8239 277.444 33.8354 277.351 37.4368C276.855 56.4371 270.006 112.041 209.043 140.666M132.367 202.82C132.367 202.82 137.853 230.482 114.361 233.618C114.764 233.618 103.389 233.618 104.97 245.198M166.025 202.82C166.025 202.82 162.492 231.259 187.162 233.214C187.565 233.214 197.731 234.798 194.197 245.167M69.6072 4H229.963C234.653 4 238.455 7.80162 238.455 12.4912C238.455 17.1807 234.653 20.9823 229.963 20.9823H69.6072C64.9172 20.9823 61.1152 17.1807 61.1152 12.4912C61.1152 7.80162 64.9172 4 69.6072 4ZM83.4924 281.647H216.698C220.293 281.647 223.207 284.566 223.207 288.166V297.48C223.207 301.081 220.293 304 216.698 304H83.4924C79.8978 304 76.9836 301.081 76.9836 297.48V288.166C76.9836 284.566 79.8978 281.647 83.4924 281.647ZM95.2381 245.167H205.541C209.135 245.167 212.049 248.086 212.049 251.687V275.127C212.049 278.728 209.135 281.647 205.541 281.647H95.2381C91.6436 281.647 88.7298 278.728 88.7298 275.127V251.687C88.7298 248.086 91.6436 245.167 95.2381 245.167ZM131.314 182.237H167.699C173.382 182.237 177.989 186.844 177.989 192.528C177.989 198.212 173.382 202.82 167.699 202.82H131.314C125.631 202.82 121.024 198.212 121.024 192.528C121.024 186.844 125.631 182.237 131.314 182.237Z" stroke="currentColor" strokeWidth="8" strokeMiterlimit="10"/>
                </svg>
                <span style={{ color: '#f9f9f9' }}>1 место</span>
              </motion.div>
              <div className="flex justify-center mt-4 cursor-pointer">
                {first.avatar_url ? (
                  <div className="relative w-28 h-28 lg:w-32 lg:h-32">
                    <Image
                      src={first.avatar_url}
                      alt={first.name}
                      fill
                      sizes="(max-width: 768px) 112px, 128px"
                      className="rounded-full object-cover border-4 border-firm-orange"
                    />
                  </div>
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
                <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
                  <Image src="/products.svg" alt="products" width={16} height={16} />
                  {first.sales} продаж
                </p>
              </div>
            </Link>
          </motion.div>
        )}

        {third && (
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-6 w-56 lg:w-64 transform hover:-translate-y-2 transition-all duration-300"
            variants={itemVariants}
            whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
          >
            <Link href={`/masters/${third.id}`}>
              <div className="relative cursor-pointer">
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
                    <div className="relative w-24 h-24 lg:w-28 lg:h-28">
                      <Image
                        src={third.avatar_url}
                        alt={third.name}
                        fill
                        sizes="(max-width: 768px) 96px, 112px"
                        className="rounded-full object-cover border-4 border-gray-200"
                      />
                    </div>
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
                <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
                  <Image src="/products.svg" alt="products" width={14} height={14} />
                  {third.sales} продаж
                </p>
              </div>
            </Link>
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
        </motion.div>
      )}
    </motion.div>
  )
}