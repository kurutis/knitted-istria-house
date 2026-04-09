'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface ReviewsProps {
    productId: string
    reviews: any[]
    session: any
    onUpdate: () => void
}

export default function Reviews({ productId, reviews, session, onUpdate }: ReviewsProps) {
    const [showForm, setShowForm] = useState(false)
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [hoverRating, setHoverRating] = useState(0)
    const [submitting, setSubmitting] = useState(false)

    const averageRating = reviews?.length ? (reviews.reduce((sum, r) => sum + r.rating, 0)/reviews.length).toFixed(1) : 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session) {
            window.location.href = `/auth/signin?callbackUrl=/catalog/${productId}`
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch('/api/reviews', { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({  productId, rating,  comment}) })

            if (response.ok) {
                setShowForm(false)
                setRating(5)
                setComment('')
                onUpdate()
            }
        } catch (error) {
            console.error('Error submitting review:', error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div id="reviews" className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Отзывы</h2>
                    {reviews?.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-yellow-400">★</span>
                            <span className="font-semibold">{averageRating}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-500">{reviews.length} отзывов</span>
                        </div>
                    )}
                </div>
                {session && !showForm && (<button onClick={() => setShowForm(true)} className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all">Написать отзыв</button>)}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-8 p-4 bg-[#EAEAEA] rounded-lg">
                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Ваш отзыв</h3>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Оценка</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="text-2xl focus:outline-none"><span className={ star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'}>★</span></button>))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Комментарий</label>
                        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} required className="w-full p-2 rounded-lg bg-white outline-firm-orange" placeholder="Поделитесь впечатлениями о товаре..." />
                    </div>

                    {/* Кнопки */}
                    <div className="flex gap-3">
                        <button type="submit" disabled={submitting} className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50">{submitting ? 'Отправка...' : 'Опубликовать'}</button>
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100">Отмена</button>
                    </div>
                </form>
            )}

            {reviews?.length === 0 ? (
                <div className="text-center py-12 bg-[#EAEAEA] rounded-lg">
                    <p className="text-gray-500 mb-4">Пока нет отзывов</p>
                    {session ? (<button onClick={() => setShowForm(true)} className="px-6 py-3 bg-firm-orange text-white rounded-lg">Будьте первым, кто оставит отзыв</button>) : (<Link href={`/auth/signin?callbackUrl=/catalog/${productId}`} className="inline-block px-6 py-3 bg-firm-orange text-white rounded-lg">Войдите, чтобы оставить отзыв</Link>)}
                </div>
            ) : (
                <div className="space-y-6">
                    {reviews.map((review: any) => (
                        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-firm-orange flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {review.author_avatar ? (<Image src={review.author_avatar} alt={review.author_name} width={40} height={40} className="object-cover" />) : (<span className="text-white font-semibold">{review.author_name?.charAt(0).toUpperCase()}</span>)}
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">{review.author_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (<span key={star} className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>))}
                                                </div>
                                                <span className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString('ru-RU')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-gray-700">{review.comment}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}