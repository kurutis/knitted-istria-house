'use client'

import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Image from 'next/image'
import Link from 'next/link'

export default function ProductPage() {
    const {id} = useParams()
    const {data: session} = useSession()

    const [product, setProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {fetchProduct()}, [id])

    const fetchProduct = async () => {
        try{
            setLoading(true)
            const response = await fetch(`/api/catalog/products/${id}`)

            if (!response.ok){
                throw new Error('Товар не найден')
            }

            const data = await response.json()
            setProduct(data)
        }catch(error: any){
            setError(error.message)
        }finally{
            setLoading(false)
        }
    }

    if (loading) return <LoadingSpinner />

    if (error){
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Link href="/catalog" className="px-6 py-3 bg-firm-orange text-white rounded-lg">Вернуться в каталог</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-5 flex items-start justify-center">
            <div className="flex flex-col gap-8 w-[90%] max-w-7xl">
                <div className="text-sm text-gray-500">
                    <Link href="/" className="hover:text-firm-orange">Главная</Link>
                    <span className="mx-2">/</span>
                    <Link href="/catalog" className="hover:text-firm-orange">Каталог</Link>
                    <span className="mx-2">/</span>
                    <span className="text-gray-700">{product.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <ProductGallery images={product.images} title={product.title} />
                    <ProductInfo product={product} session={session} onUpdate={fetchProduct}/>
                </div>
                <MasterInfo master={product} />
                <div className="bg-white rounded-lg shadow-md p6-">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-4">Описание</h2>
                    <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
                </div>
                {(product.category || product.technique || product.size || product.care_instructions) && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-4">Характеристики</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {product.category && (
                                <div>
                                    <p className="text-gray-500 text-sm">Категория</p>
                                    <p className="font-medium">{product.category}</p>
                                </div>
                            )}
                            {product.technique && (
                                <div>
                                    <p className="text-gray-500 text-sm">Техника вязания</p>
                                    <p className="font-medium">{product.technique}</p>
                                </div>
                            )}
                            {product.size && (
                                <div>
                                    <p className="text-gray-500 text-sm">Размер</p>
                                    <p className="font-medium">{product.size}</p>
                                </div>
                            )}
                            {product.care_instructions && (
                                <div className="col-span-2">
                                    <p className="text-gray-500 text-sm">Уход</p>
                                    <p className="font-medium">{product.care_instructions}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {product.yarns && product.yarns.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-4">Использованная пряжа</h2>
                        <div className="grid grid-cols-4 gap-4">
                            {product.yarns.map((yarn: any) => (
                                <div key={yarn.id} className="border rounded-lg p-4">
                                    <h3 className="font-semibold">{yarn.name}</h3>
                                    <p className="text-sm text-gray-500">{yarn.brand}</p>
                                    <p className="text-sm">{yarn.color}</p>
                                    <p className="text-xs text-gray-400">Арт. {yarn.article}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <Reviews productId={product.id} reviews={product.reviews} session={session} onUpdate={fetchProduct} />
                <SimilarProducts category={product.category} currentId={product.id} />
            </div>
        </div>
    )
}