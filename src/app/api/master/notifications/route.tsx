import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {return NextResponse.json({error: 'Unauthorized'}, {status: 401})}

    const client = await pool.connect()
    try{
        const result = await client.query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [session.user.id])

        return NextResponse.json(result.rows)
    }finally{
        client.release()
    }
    
} 