import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

export async function GET() {
    try{
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401})
        }

        const user = await db.getUserById(session.user.id)

        if (!user) {
            return NextResponse.json({error: 'User not found'}, {status: 404})
        }

        return NextResponse.json({fullname: user.name || '', email: user.email, phone: user.phone || '', city: user.city || '', address: user.address || '', avatarUrl: user.avater_url || null, newsletterAgreement: user.newsletter_agreement || false})
    }catch (error){
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500})
    }
}

export async function PUT(request: Request) {
    try{
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401})
        }

        const data = await request.json()

        return NextResponse.json({ message: "Profile updated successfully" })
    } catch(error){
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}