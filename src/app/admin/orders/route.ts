import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Заглушка заказов
        const orders = [
            {
                id: '1',
                order_number: 'ORD-20250219-000001',
                status: 'new',
                created_at: new Date().toISOString(),
                items_count: 2,
                total_amount: 3500
            },
            {
                id: '2',
                order_number: 'ORD-20250218-000002',
                status: 'delivered',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                items_count: 1,
                total_amount: 1200
            }
        ]

        return NextResponse.json(orders)
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}