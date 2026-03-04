import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'damin'){
        return NextResponse.json({error: 'Неавторизирован'}, {status: 401})
    }

    return NextResponse.json({message: 'Admin API endpoint'}, {status: 200})
}