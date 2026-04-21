'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

  useEffect(() => {
    fetchTopMasters()
  }, [])

  const fetchTopMasters = async () => {
    try {
      const response = await fetch('/api/masters/top')
      const data = await response.json()
      setMasters(data || [])
    } catch (error) {
      console.error('Error fetching top masters:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="my-16 text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-firm-orange rounded-full animate-spin inline-block"></div>
      </div>
    )
  }

  if (masters.length === 0) return null

  const first = masters[0]
  const second = masters[1]
  const third = masters[2]

  return (
    <div className="py-16 bg-gradient-to-b from-white to-[#F9F9F9]">
      <div className="text-center mb-12">
        <h2 className="font-['Montserrat_Alternates'] font-semibold text-3xl text-gray-800">
          Лучшие мастера месяца
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full"></div>
      </div>

      <div className="flex justify-center items-end gap-8">
        {/* 2 место — слева */}
        {second && (
          <div className= "border-gray-300 border-1 bg-white rounded-2xl shadow-lg p-6 w-64 transform hover:-translate-y-1 transition-all duration-300">
            <div className="relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div className="flex justify-center">
                {second.avatar_url ? (
                  <img
                    src={second.avatar_url}
                    alt={second.name}
                    className="w-28 h-28 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-3xl font-bold">
                    {second.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800">
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
          </div>
        )}

        {/* 1 место — центр (выделен) */}
        {first && (
          <div className="bg-white rounded-2xl shadow-xl p-8 w-72 transform scale-105 border-2 border-firm-orange relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-firm-orange to-firm-pink text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
              🏆 1 место
            </div>
            <div className="flex justify-center mt-4">
              {first.avatar_url ? (
                <img
                  src={first.avatar_url}
                  alt={first.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-firm-orange"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-4xl font-bold">
                  {first.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-center mt-4">
              <h3 className="font-['Montserrat_Alternates'] font-bold text-2xl text-gray-800">
                {first.name}
              </h3>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-semibold text-gray-700">{first.rating}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                📦 {first.sales} продаж
              </p>
            </div>
          </div>
        )}

        {/* 3 место — справа */}
        {third && (
          <div className="bg-white rounded-2xl shadow-lg p-6 w-64 transform hover:-translate-y-1 transition-all duration-300">
            <div className="relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <div className="flex justify-center">
                {third.avatar_url ? (
                  <img
                    src={third.avatar_url}
                    alt={third.name}
                    className="w-28 h-28 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-3xl font-bold">
                    {third.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800">
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
          </div>
        )}
      </div>
    </div>
  )
}