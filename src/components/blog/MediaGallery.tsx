'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MediaItem {
    type: 'image' | 'video'
    url: string
}

interface MediaGalleryModalProps {
    media: MediaItem[]
    initialIndex: number
    title: string
    onClose: () => void
}

function MediaGalleryModal({ media, initialIndex, title, onClose }: MediaGalleryModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft') {
                setCurrentIndex(prev => (prev - 1 + media.length) % media.length)
            }
            if (e.key === 'ArrowRight') {
                setCurrentIndex(prev => (prev + 1) % media.length)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [media.length, onClose])

    const currentMedia = media[currentIndex]

    return (
        <AnimatePresence>
            <motion.div 
                className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="relative max-w-[90vw] max-h-[85vh]">
                        {currentMedia?.type === 'video' ? (
                            <video 
                                src={currentMedia.url}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                                controls
                                autoPlay
                            />
                        ) : (
                            <img 
                                src={currentMedia.url} 
                                alt={`${title} - фото ${currentIndex + 1}`}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                        )}
                    </div>
                    
                    {media.length > 1 && (
                        <>
                            <button
                                onClick={() => setCurrentIndex(prev => (prev - 1 + media.length) % media.length)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition"
                            >
                                ←
                            </button>
                            <button
                                onClick={() => setCurrentIndex(prev => (prev + 1) % media.length)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition"
                            >
                                →
                            </button>
                        </>
                    )}
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {media.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full transition-all ${
                                    idx === currentIndex 
                                        ? 'bg-white w-6' 
                                        : 'bg-white/50 w-1.5'
                                }`}
                            />
                        ))}
                    </div>

                    <div className="absolute top-4 left-4 bg-black/50 px-2 py-1 rounded text-white text-sm">
                        {currentIndex + 1} / {media.length}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

interface MediaGalleryProps {
    images: Array<{ id: string; url: string; sort_order: number }> | string[] | any[]
    mainImageUrl?: string | null
    video?: string | null
    title: string
}

export default function MediaGallery({ images, mainImageUrl, video, title }: MediaGalleryProps) {
    const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null)
    const [allMedia, setAllMedia] = useState<MediaItem[]>([])

    useEffect(() => {
        const imageUrls: string[] = []
        
        // Добавляем main_image_url, если есть
        if (mainImageUrl) {
            imageUrls.push(mainImageUrl)
        }
        
        // Добавляем изображения из массива images
        if (images && Array.isArray(images)) {
            images.forEach(img => {
                if (typeof img === 'string') {
                    imageUrls.push(img)
                } else if (img && typeof img === 'object') {
                    if (img.image_url) {
                        imageUrls.push(img.image_url)
                    } else if (img.url) {
                        imageUrls.push(img.url)
                    }
                }
            })
        }
        
        const media: MediaItem[] = [
            ...(video ? [{ type: 'video' as const, url: video }] : []),
            ...imageUrls.map(url => ({ type: 'image' as const, url }))
        ]
        
        setAllMedia(media)
    }, [images, mainImageUrl, video])

    const openModal = (index: number) => {
        setSelectedMediaIndex(index)
    }

    const closeModal = () => {
        setSelectedMediaIndex(null)
    }

    if (allMedia.length === 0) return null

    const count = allMedia.length

    // 1 фото
    if (count === 1) {
        return (
            <>
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="cursor-pointer overflow-hidden rounded-xl shadow-md"
                    onClick={() => openModal(0)}
                >
                    <img 
                        src={allMedia[0].url} 
                        alt={title}
                        className="w-full h-[200px] sm:h-[350px] object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                    />
                </motion.div>
                {selectedMediaIndex !== null && (
                    <MediaGalleryModal
                        media={allMedia}
                        initialIndex={selectedMediaIndex}
                        title={title}
                        onClose={closeModal}
                    />
                )}
            </>
        )
    }

    // 2+ фото
    const remaining = count - 4
    
    return (
        <>
            <div className="grid grid-cols-2 gap-1">
                {allMedia.slice(0, 4).map((media, idx) => {
                    const showOverlay = idx === 3 && remaining > 0
                    
                    return (
                        <motion.div 
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.3 }}
                            className="relative cursor-pointer overflow-hidden rounded-xl shadow-md aspect-square"
                            onClick={() => openModal(idx)}
                        >
                            <img 
                                src={media.url} 
                                alt={`${title} ${idx + 1}`}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                loading="lazy"
                            />
                            {showOverlay && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-white text-xl font-bold">+{remaining}</span>
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>
            
            <AnimatePresence>
                {selectedMediaIndex !== null && (
                    <MediaGalleryModal
                        media={allMedia}
                        initialIndex={selectedMediaIndex}
                        title={title}
                        onClose={closeModal}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
