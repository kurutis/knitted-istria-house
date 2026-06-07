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

  useEffect(() => {fetchTopMasters()}, [])

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
        <motion.div className="w-8 h-8 border-2 border-gray-200 border-t-firm-orange rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    )
  }

  if (!Array.isArray(masters) || masters.length === 0) return null

  const first = masters[0]
  const second = masters[1]
  const third = masters[2]
  const rest = masters.slice(3)

  const containerVariants = {hidden: { opacity: 0 }, visible: {opacity: 1, transition: {staggerChildren: 0.1, delayChildren: 0.2}}}

  const itemVariants = {hidden: { y: 30, opacity: 0 }, visible: {y: 0, opacity: 1, transition: { duration: 0.5 }}}

  const TrophyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.17823 3.06144C8.17823 3.06144 7.42466 19.6757 17.2551 20.2619C17.3506 20.2619 26.0967 22.4641 26.3524 3.06144M8.17143 4.40927H7.47245C7.07691 4.40927 6.7564 4.09798 6.7564 3.71383V3.01177C6.7564 2.62763 6.43585 2.31634 6.04031 2.31634H1.96904C1.57692 2.31634 1.26322 2.6177 1.25299 2.99853C1.20867 5.34314 1.57349 13.1088 8.09301 16.3178C8.45445 16.4966 8.5397 16.9371 8.31465 17.2649C8.12712 17.5331 8.10323 17.9107 8.60106 18.3875C8.68631 18.467 8.79202 18.5233 8.90795 18.5498C9.41601 18.669 10.8686 18.8644 11.1311 16.5628M8.23961 6.08162H6.59948C6.55515 6.08162 6.51082 6.07831 6.46649 6.06837C6.19712 6.01539 5.2765 5.76371 5.04463 4.66426C4.97985 4.35297 4.66613 4.09466 4.3422 4.09797C4.18876 4.09797 4.0285 4.09797 3.87506 4.1046C3.47611 4.11122 3.16585 4.43244 3.17608 4.81659C3.23063 6.84329 3.98417 12.7744 10.6912 15.8277M26.3285 4.40927H27.0276C27.4231 4.40927 27.7436 4.09798 27.7436 3.71383V3.01177C27.7436 2.62763 28.0641 2.31634 28.4596 2.31634H32.531C32.9231 2.31634 33.2368 2.6177 33.247 2.99853C33.2913 5.34314 32.9265 13.1088 26.407 16.3178C26.0456 16.4966 25.9603 16.9371 26.1853 17.2649C26.3729 17.5331 26.3968 17.9107 25.8989 18.3875C25.8137 18.467 25.708 18.5233 25.592 18.5498C25.084 18.669 23.6314 18.8644 23.3689 16.5628M26.2604 6.08162H27.9005C27.9448 6.08162 27.9891 6.07831 28.0335 6.06837C28.3028 6.01539 29.2235 5.76371 29.4554 4.66426C29.5201 4.35297 29.8339 4.09466 30.1578 4.09797C30.3112 4.09797 30.4715 4.09797 30.6249 4.1046C31.0239 4.11122 31.3341 4.43244 31.3239 4.81659C31.2694 6.84329 30.5158 12.7744 23.8088 15.8277M15.3729 22.4575C15.3729 22.4575 15.9765 25.4081 13.3918 25.7426C13.4362 25.7426 12.1848 25.7426 12.3587 26.9778M19.076 22.4575C19.076 22.4575 18.6872 25.4909 21.4014 25.6995C21.4457 25.6995 22.5642 25.8684 22.1754 26.9745M8.46807 1.25H26.1104C26.6263 1.25 27.0446 1.65551 27.0446 2.15572C27.0446 2.65594 26.6263 3.06144 26.1104 3.06144H8.46807C7.95208 3.06144 7.53379 2.65594 7.53379 2.15572C7.53379 1.65551 7.95208 1.25 8.46807 1.25ZM9.99571 30.8657H24.651C25.0464 30.8657 25.367 31.177 25.367 31.5611V32.5546C25.367 32.9386 25.0464 33.25 24.651 33.25H9.99571C9.60025 33.25 9.27962 32.9386 9.27962 32.5546V31.5611C9.27962 31.177 9.60025 30.8657 9.99571 30.8657ZM11.288 26.9745H23.4234C23.8189 26.9745 24.1395 27.2859 24.1395 27.67V30.1702C24.1395 30.5543 23.8189 30.8657 23.4234 30.8657H11.288C10.8925 30.8657 10.5719 30.5543 10.5719 30.1702V27.67C10.5719 27.2859 10.8925 26.9745 11.288 26.9745ZM15.257 20.2619H19.2601C19.8853 20.2619 20.3921 20.7534 20.3921 21.3597C20.3921 21.966 19.8853 22.4575 19.2601 22.4575H15.257C14.6318 22.4575 14.125 21.966 14.125 21.3597C14.125 20.7534 14.6318 20.2619 15.257 20.2619Z" stroke="#F9F9F9" strokeWidth="2.5" strokeMiterlimit="10"/>
    </svg>
  )

  const TrophyIconDesktop = () => (
    <svg width="18" height="18" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.17823 3.06144C8.17823 3.06144 7.42466 19.6757 17.2551 20.2619C17.3506 20.2619 26.0967 22.4641 26.3524 3.06144M8.17143 4.40927H7.47245C7.07691 4.40927 6.7564 4.09798 6.7564 3.71383V3.01177C6.7564 2.62763 6.43585 2.31634 6.04031 2.31634H1.96904C1.57692 2.31634 1.26322 2.6177 1.25299 2.99853C1.20867 5.34314 1.57349 13.1088 8.09301 16.3178C8.45445 16.4966 8.5397 16.9371 8.31465 17.2649C8.12712 17.5331 8.10323 17.9107 8.60106 18.3875C8.68631 18.467 8.79202 18.5233 8.90795 18.5498C9.41601 18.669 10.8686 18.8644 11.1311 16.5628M8.23961 6.08162H6.59948C6.55515 6.08162 6.51082 6.07831 6.46649 6.06837C6.19712 6.01539 5.2765 5.76371 5.04463 4.66426C4.97985 4.35297 4.66613 4.09466 4.3422 4.09797C4.18876 4.09797 4.0285 4.09797 3.87506 4.1046C3.47611 4.11122 3.16585 4.43244 3.17608 4.81659C3.23063 6.84329 3.98417 12.7744 10.6912 15.8277M26.3285 4.40927H27.0276C27.4231 4.40927 27.7436 4.09798 27.7436 3.71383V3.01177C27.7436 2.62763 28.0641 2.31634 28.4596 2.31634H32.531C32.9231 2.31634 33.2368 2.6177 33.247 2.99853C33.2913 5.34314 32.9265 13.1088 26.407 16.3178C26.0456 16.4966 25.9603 16.9371 26.1853 17.2649C26.3729 17.5331 26.3968 17.9107 25.8989 18.3875C25.8137 18.467 25.708 18.5233 25.592 18.5498C25.084 18.669 23.6314 18.8644 23.3689 16.5628M26.2604 6.08162H27.9005C27.9448 6.08162 27.9891 6.07831 28.0335 6.06837C28.3028 6.01539 29.2235 5.76371 29.4554 4.66426C29.5201 4.35297 29.8339 4.09466 30.1578 4.09797C30.3112 4.09797 30.4715 4.09797 30.6249 4.1046C31.0239 4.11122 31.3341 4.43244 31.3239 4.81659C31.2694 6.84329 30.5158 12.7744 23.8088 15.8277M15.3729 22.4575C15.3729 22.4575 15.9765 25.4081 13.3918 25.7426C13.4362 25.7426 12.1848 25.7426 12.3587 26.9778M19.076 22.4575C19.076 22.4575 18.6872 25.4909 21.4014 25.6995C21.4457 25.6995 22.5642 25.8684 22.1754 26.9745M8.46807 1.25H26.1104C26.6263 1.25 27.0446 1.65551 27.0446 2.15572C27.0446 2.65594 26.6263 3.06144 26.1104 3.06144H8.46807C7.95208 3.06144 7.53379 2.65594 7.53379 2.15572C7.53379 1.65551 7.95208 1.25 8.46807 1.25ZM9.99571 30.8657H24.651C25.0464 30.8657 25.367 31.177 25.367 31.5611V32.5546C25.367 32.9386 25.0464 33.25 24.651 33.25H9.99571C9.60025 33.25 9.27962 32.9386 9.27962 32.5546V31.5611C9.27962 31.177 9.60025 30.8657 9.99571 30.8657ZM11.288 26.9745H23.4234C23.8189 26.9745 24.1395 27.2859 24.1395 27.67V30.1702C24.1395 30.5543 23.8189 30.8657 23.4234 30.8657H11.288C10.8925 30.8657 10.5719 30.5543 10.5719 30.1702V27.67C10.5719 27.2859 10.8925 26.9745 11.288 26.9745ZM15.257 20.2619H19.2601C19.8853 20.2619 20.3921 20.7534 20.3921 21.3597C20.3921 21.966 19.8853 22.4575 19.2601 22.4575H15.257C14.6318 22.4575 14.125 21.966 14.125 21.3597C14.125 20.7534 14.6318 20.2619 15.257 20.2619Z" stroke="#F9F9F9" strokeWidth="2.5" strokeMiterlimit="10"/>
    </svg>
  )

  if (isMobile) {
    return (
      <motion.div className="py-8 bg-main" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={containerVariants}>
        <div className="text-center mb-6">
          <motion.h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>Лучшие мастера месяца</motion.h2>
          <motion.div className="w-16 h-0.5 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-2 rounded-full" initial={{ width: 0 }} animate={{ width: 64 }} transition={{ duration: 0.6, delay: 0.2 }} />
        </div>

        <div className="flex justify-around items-center gap-2 px-2 mb-6">
          {second && (
            <motion.div className="flex-1 bg-main rounded-xl shadow-md p-3 text-center" variants={itemVariants}>
              <Link href={`/masters/${second.id}`}>
                <div className="relative inline-block mx-auto cursor-pointer">
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-main font-bold text-[10px]">2</div>
                  {second.avatar_url ? (
                    <div className="relative w-14 h-14 mx-auto">
                      <Image src={second.avatar_url} alt={second.name} fill sizes="56px" className="rounded-full object-cover border-2 border-gray-200" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-xl font-bold mx-auto">
                      {second.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-sm mt-2 line-clamp-1">{second.name}</h3>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  <span className="text-yellow-400 text-xs">★</span><span className="text-xs text-gray-600">{second.rating}</span>
                </div>
              </Link>
            </motion.div>
          )}

          {first && (
            <motion.div className="flex-1 bg-main rounded-xl shadow-lg p-4 text-center relative -mt-4" variants={itemVariants}>
              <Link href={`/masters/${first.id}`}>
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-linear-to-r from-firm-orange to-firm-pink px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-md flex items-center gap-1">
                  <TrophyIcon />
                  <span className="text-main">1 место</span>
                </div>
                {first.avatar_url ? (
                  <div className="relative w-16 h-16 mx-auto mt-2 cursor-pointer">
                    <Image src={first.avatar_url} alt={first.name} fill sizes="64px" className="rounded-full object-cover border-3 border-firm-orange" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-2xl font-bold mx-auto mt-2 cursor-pointer">
                    {first.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="font-['Montserrat_Alternates'] font-bold text-base mt-2 line-clamp-1">{first.name}</h3>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  <span className="text-yellow-400 text-sm">★</span><span className="text-sm font-semibold text-text">{first.rating}</span>
                </div>
                <p className="text-xs text-firm-gray mt-1 flex items-center justify-center gap-1"><Image src="/products.svg" alt="products" width={12} height={12} /> {first.sales} продаж </p>
              </Link>
            </motion.div>
          )}

          {third && (
            <motion.div className="flex-1 bg-main rounded-xl shadow-md p-3 text-center" variants={itemVariants}>
              <Link href={`/masters/${third.id}`}>
                <div className="relative inline-block mx-auto cursor-pointer">
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center text-main font-bold text-[10px]">3</div>
                  {third.avatar_url ? (
                    <div className="relative w-14 h-14 mx-auto">
                      <Image src={third.avatar_url} alt={third.name} fill sizes="56px" className="rounded-full object-cover border-2 border-gray-200" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-xl font-bold mx-auto">
                      {third.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-sm mt-2 line-clamp-1">{third.name}</h3>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  <span className="text-yellow-400 text-xs">★</span><span className="text-xs text-firm-gray">{third.rating}</span>
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        {Array.isArray(rest) && rest.length > 0 && (
          <motion.div className="px-4 space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <p className="text-xs text-firm-gray mb-2">Другие мастера:</p>
            {rest.map((master, idx) => (
              <Link href={`/masters/${master.id}`} key={master.id}>
                <motion.div className="flex items-center gap-3 bg-main rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 + idx * 0.05 }}>
                  <div className="text-xs font-bold text-firm-gray w-6">{idx + 4}</div>
                  {master.avatar_url ? (
                    <div className="relative w-10 h-10">
                      <Image src={master.avatar_url} alt={master.name} fill sizes="40px" className="rounded-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold">{master.name?.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{master.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-firm-gray">
                      <span>★ {master.rating}</span><span className="flex items-center gap-1"><Image src="/products.svg" alt="products" width={10} height={10} />{master.sales} продаж</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div className="py-16 bg-main overflow-hidden" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={containerVariants}>
      <div className="text-center mb-12">
        <motion.h2 className="font-['Montserrat_Alternates'] font-semibold text-3xl text-text" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>Лучшие мастера месяца</motion.h2>
        <motion.div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" initial={{ width: 0 }} animate={{ width: 80 }}transition={{ duration: 0.6, delay: 0.2 }} />
      </div>

      <div className="flex justify-center items-end gap-4 lg:gap-8 flex-wrap">
        {second && (
          <motion.div  className="bg-main rounded-2xl shadow-lg p-6 w-56 lg:w-64 transform hover:-translate-y-2 transition-all duration-300" variants={itemVariants} whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }} >
            <Link href={`/masters/${second.id}`}>
              <div className="relative cursor-pointer">
                <motion.div className="absolute -top-3 -left-3 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-main font-bold text-sm" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}>2</motion.div>
                <div className="flex justify-center">
                  {second.avatar_url ? (
                    <div className="relative w-24 h-24 lg:w-28 lg:h-28">
                      <Image src={second.avatar_url} alt={second.name} fill sizes="(max-width: 768px) 96px, 112px" className="rounded-full object-cover border-4 border-gray-200" />
                      </div>
                  ) : (
                    <motion.div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-3xl font-bold" whileHover={{ scale: 1.05 }}>
                      {second.name?.charAt(0).toUpperCase()}
                    </motion.div>
                  )}
                </div>
              </div>
              <div className="text-center mt-4">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg lg:text-xl text-text">{second.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="text-yellow-400">★</span><span className="text-sm text-firm-gray">{second.rating}</span>
                </div>
                <p className="text-sm text-firm-gray mt-2 flex items-center justify-center gap-1"><Image src="/products.svg" alt="products" width={14} height={14} />{second.sales} продаж</p>
              </div>
            </Link>
          </motion.div>
        )}

        {first && (
          <motion.div 
            className="bg-main rounded-2xl shadow-xl p-6 lg:p-8 w-64 lg:w-72 transform relative"
            variants={itemVariants}
            whileHover={{ y: -15, boxShadow: "0 30px 50px rgba(0,0,0,0.15)" }}
          >
            <Link href={`/masters/${first.id}`}>
              <motion.div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-linear-to-r from-firm-orange to-firm-pink px-3 py-0.5 lg:px-4 lg:py-1 rounded-full text-xs lg:text-sm font-semibold shadow-lg whitespace-nowrap flex items-center gap-1" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, type: "spring" }}>
                <TrophyIconDesktop />
                <span className="text-main">1 место</span>
              </motion.div>
              <div className="flex justify-center mt-4 cursor-pointer">
                {first.avatar_url ? (
                  <div className="relative w-28 h-28 lg:w-32 lg:h-32">
                    <Image src={first.avatar_url} alt={first.name} fill sizes="(max-width: 768px) 112px, 128px" className="rounded-full object-cover border-4 border-firm-orange" />
                  </div>
                ) : (
                  <motion.div className="w-28 h-28 lg:w-32 lg:h-32 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-4xl font-bold" whileHover={{ scale: 1.05 }}>
                    {first.name?.charAt(0).toUpperCase()}
                  </motion.div>
                )}
              </div>
              <div className="text-center mt-4">
                <h3 className="font-['Montserrat_Alternates'] font-bold text-xl lg:text-2xl text-text">{first.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="text-yellow-400 text-base lg:text-lg">★</span><span className="text-sm font-semibold text-firm-gray">{first.rating}</span>
                </div>
                <p className="text-sm text-firm-gray mt-2 flex items-center justify-center gap-1">
                  <Image src="/products.svg" alt="products" width={16} height={16} />{first.sales} продаж
                </p>
              </div>
            </Link>
          </motion.div>
        )}

        {third && (
          <motion.div className="bg-main rounded-2xl shadow-lg p-6 w-56 lg:w-64 transform hover:-translate-y-2 transition-all duration-300" variants={itemVariants} whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
            <Link href={`/masters/${third.id}`}>
              <div className="relative cursor-pointer">
                <motion.div  className="absolute -top-3 -left-3 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-main font-bold text-sm" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: "spring" }}>3</motion.div>
                <div className="flex justify-center">
                  {third.avatar_url ? (
                    <div className="relative w-24 h-24 lg:w-28 lg:h-28">
                      <Image src={third.avatar_url} alt={third.name} fill sizes="(max-width: 768px) 96px, 112px" className="rounded-full object-cover border-4 border-gray-200" />
                    </div>
                  ) : (
                    <motion.div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main text-3xl font-bold" whileHover={{ scale: 1.05 }}>
                      {third.name?.charAt(0).toUpperCase()}
                    </motion.div>
                  )}
                </div>
              </div>
              <div className="text-center mt-4">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg lg:text-xl text-text">{third.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="text-yellow-400">★</span><span className="text-sm text-gray-600">{third.rating}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1"><Image src="/products.svg" alt="products" width={14} height={14} />{third.sales} продаж</p>
              </div>
            </Link>
          </motion.div>
        )}
      </div>

      {Array.isArray(rest) && rest.length > 0 && (
        <motion.div className="mt-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
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