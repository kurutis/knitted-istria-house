import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Получаем уникальные техники и их количество
        const { data: techniquesData, error: techError } = await supabase
            .from('products')
            .select('technique')
            .eq('status', 'active')
            .not('technique', 'is', null)

        if (techError) {
            console.error('Error fetching techniques:', techError);
        }

        const techniqueMap = new Map<string, number>()
        techniquesData?.forEach(p => {
            if (p.technique) {
                techniqueMap.set(p.technique, (techniqueMap.get(p.technique) || 0) + 1)
            }
        })

        const techniques = Array.from(techniqueMap.entries()).map(([technique, count]) => ({
            technique,
            count
        }))

        // Получаем диапазон цен
        const { data: priceData, error: priceError } = await supabase
            .from('products')
            .select('price')
            .eq('status', 'active')

        if (priceError) {
            console.error('Error fetching price range:', priceError);
        }

        let min = 0
        let max = 10000
        
        if (priceData && priceData.length > 0) {
            const prices = priceData.map(p => p.price)
            min = Math.min(...prices)
            max = Math.max(...prices)
        }
        
        const MAX_PRICE_LIMIT = 50000
        if (max > MAX_PRICE_LIMIT) {
            max = MAX_PRICE_LIMIT
        }

        return NextResponse.json({
            techniques: techniques,
            priceRange: {
                min: Math.floor(min / 100) * 100,
                max: Math.ceil(max / 1000) * 1000
            },
            sortOptions: [
                { value: 'newest', label: 'Сначала новые' },
                { value: 'popular', label: 'Популярные' },
                { value: 'price_asc', label: 'Сначала дешевле' },
                { value: 'price_desc', label: 'Сначала дороже' },
                { value: 'rating', label: 'По рейтингу' }
            ]
        })
        
    } catch (error) {
        console.error('Error fetching filters:', error);
        return NextResponse.json({ error: 'Ошибка загрузки фильтров' }, { status: 500 });
    }
}