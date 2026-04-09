'use client'

import Link from 'next/link'
import Image from 'next/image'

interface MasterInfoProps {
    master: any
}

export default function MasterInfo({ master }: MasterInfoProps) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-4">О мастере</h2>
            
            <div className="flex gap-6"> 
                <Link href={`/masters/${master.master_id}`} className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden">
                        {master.master_avatar ? (<Image src={master.master_avatar} alt={master.master_name} width={96} height={96} className="object-cover" /> ) : (<span className="text-3xl font-['Montserrat_Alternates'] font-semibold text-white">{master.master_name?.charAt(0).toUpperCase()}</span>)}
                    </div>
                </Link>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Link href={`/masters/${master.master_id}`}className="font-['Montserrat_Alternates'] font-semibold text-xl hover:text-firm-orange transition-colors" >{master.master_name}</Link>
                        {master.is_verified && (<span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✓ Верифицирован</span>)}
                        {master.is_partner && (<span className="px-2 py-1 bg-firm-orange bg-opacity-10 text-firm-orange rounded-full text-xs">⭐ Партнер фабрики </span>)}
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            <span className="font-semibold">{master.master_rating || '0.0'}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-600">{master.total_sales || 0} продаж</span>
                    </div>

                    <div className="flex gap-3">
                        <Link href={`/masters/${master.master_id}`} className="px-4 py-2 border-2 border-firm-orange text-firm-orange rounded-lg hover:bg-firm-orange hover:text-white transition-all duration-300">Все работы мастера</Link>
                        <Link href={`/masters/${master.master_id}#reviews`} className="px-4 py-2 border-2 border-firm-pink text-firm-pink rounded-lg hover:bg-firm-pink hover:text-white transition-all duration-300">Отзывы о мастере</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}