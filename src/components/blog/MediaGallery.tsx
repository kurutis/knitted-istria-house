'use client'

import { useState, useEffect } from 'react'

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
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                setCurrentIndex(prev => (prev - 1 + media.length) % media.length)
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                setCurrentIndex(prev => (prev + 1) % media.length)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [media.length, onClose])

    const currentMedia = media[currentIndex]

    return (
        <div 
            className="fixed inset-0 bg-[#000000b2] z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition w-8 h-8 flex items-center justify-center"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {currentMedia?.type === 'video' ? (
                    <video 
                        src={currentMedia.url}
                        className="max-w-full max-h-[90vh] object-contain"
                        controls
                        autoPlay
                    />
                ) : (
                    <img 
                        src={currentMedia.url} 
                        alt={`${title} - фото ${currentIndex + 1}`}
                        className="max-w-full max-h-[90vh] object-contain"
                    />
                )}
                
                {media.length > 1 && (
                    <>
                        <button
                            onClick={() => setCurrentIndex(prev => (prev - 1 + media.length) % media.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition text-xl"
                        >
                            ←
                        </button>
                        <button
                            onClick={() => setCurrentIndex(prev => (prev + 1) % media.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition text-xl"
                        >
                            →
                        </button>
                    </>
                )}
                
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
                    {media.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1 rounded-full transition-all ${
                                idx === currentIndex 
                                    ? 'bg-white w-4' 
                                    : 'bg-white/50 w-1'
                            }`}
                        />
                    ))}
                </div>

                <div className="absolute -top-8 left-0 bg-black/50 px-2 py-0.5 rounded text-white text-xs">
                    {currentIndex + 1} / {media.length}
                </div>
            </div>
        </div>
    )
}

interface MediaGalleryProps {
    images: Array<{ id: string; url: string; sort_order: number }> | string[]
    video?: string | null
    title: string
}

export default function MediaGallery({ images, video, title }: MediaGalleryProps) {
    const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null)
    const [allMedia, setAllMedia] = useState<MediaItem[]>([])

    useEffect(() => {
        const imageUrls = Array.isArray(images) 
            ? images.map(img => typeof img === 'string' ? img : img.url)
            : []
        
        const media: MediaItem[] = [
            ...(video ? [{ type: 'video' as const, url: video }] : []),
            ...imageUrls.map(url => ({ type: 'image' as const, url }))
        ]
        setAllMedia(media)
    }, [images, video])

    const openModal = (index: number) => {
        setSelectedMediaIndex(index)
        document.body.style.overflow = 'hidden'
    }

    const closeModal = () => {
        setSelectedMediaIndex(null)
        document.body.style.overflow = 'unset'
    }

    if (allMedia.length === 0) return null

    const count = allMedia.length

    // 1 фото
    if (count === 1) {
        return (
            <>
                <div onClick={() => openModal(0)} className="cursor-pointer">
                    {allMedia[0].type === 'video' ? (
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden h-[200px] flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    ) : (
                        <img 
                            src={allMedia[0].url} 
                            alt={title}
                            className="w-full rounded-lg object-cover h-[200px]"
                        />
                    )}
                </div>
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

    // 2 фото
    if (count === 2) {
        return (
            <>
                <div className="grid grid-cols-2 gap-[2px]">
                    {allMedia.map((media, idx) => (
                        <div 
                            key={idx}
                            className="cursor-pointer overflow-hidden bg-gray-100 h-[150px]"
                            onClick={() => openModal(idx)}
                        >
                            {media.type === 'video' ? (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            ) : (
                                <img 
                                    src={media.url} 
                                    alt={`${title} ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    ))}
                </div>
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

    // 3 фото
    if (count === 3) {
        return (
            <>
                <div className="grid grid-cols-2 gap-[2px]">
                    <div 
                        className="cursor-pointer overflow-hidden bg-gray-100 h-[150px]"
                        onClick={() => openModal(0)}
                    >
                        {allMedia[0].type === 'video' ? (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        ) : (
                            <img 
                                src={allMedia[0].url} 
                                alt={title}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                    <div 
                        className="cursor-pointer overflow-hidden bg-gray-100 h-[150px]"
                        onClick={() => openModal(1)}
                    >
                        {allMedia[1].type === 'video' ? (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        ) : (
                            <img 
                                src={allMedia[1].url} 
                                alt={`${title} 2`}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                    <div 
                        className="cursor-pointer overflow-hidden bg-gray-100 h-[150px] col-span-2"
                        onClick={() => openModal(2)}
                    >
                        {allMedia[2].type === 'video' ? (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        ) : (
                            <img 
                                src={allMedia[2].url} 
                                alt={`${title} 3`}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                </div>
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

    // 4+ фото
    const remaining = count - 4
    
    return (
        <>
            <div className="grid grid-cols-2 gap-[2px]">
                {allMedia.slice(0, 4).map((media, idx) => {
                    const showOverlay = idx === 3 && remaining > 0
                    
                    return (
                        <div 
                            key={idx}
                            className="relative cursor-pointer overflow-hidden bg-gray-100 h-[150px]"
                            onClick={() => openModal(idx)}
                        >
                            {media.type === 'video' ? (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            ) : (
                                <img 
                                    src={media.url} 
                                    alt={`${title} ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {showOverlay && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white text-xl font-bold">+{remaining}</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            
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