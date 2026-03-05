import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Заглушка избранного
        const favorites = [
            {
                id: '1',
                title: 'Вязаный свитер',
                price: 3500,
                image: null
            },
            {
                id: '2',
                title: 'Шапка с помпоном',
                price: 1200,
                image: null
            }
        ]

        return NextResponse.json(favorites)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}