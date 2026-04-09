'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ProductGalleryProps {
    images: Array<{ id: string; url: string; sort_order: number }>
    title: string
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
    const [selectedImage, setSelectedImage] = useState(0)
    const displayImages = images?.length > 0 ? images : [{ id: 'placeholder', url: null, sort_order: 0 }]

    return (
        <div className="space-y-4">
            <div className="aspect-square bg-[#EAEAEA] rounded-lg overflow-hidden relative">
                {displayImages[selectedImage]?.url ? (
                    <Image src={displayImages[selectedImage].url} alt={title} fill className="object-cover" priority />
                ) : (
                    <div className="w-full h-full flex items-center justify-center"><span className="text-gray-400">Нет фото</span></div>
                )}
            </div>

            {displayImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {displayImages.map((img, index) => (
                        <button key={img.id} onClick={() => setSelectedImage(index)} className={`aspect-square bg-[#EAEAEA] rounded-lg overflow-hidden relative border-2 transition-colors ${selectedImage === index?'border-firm-orange':'border-transparent hover:border-firm-pink'}`}>
                            {img.url ? (
                                <Image src={img.url} alt={`${title} - фото ${index + 1}`} fill className="object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">Нет фото</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}