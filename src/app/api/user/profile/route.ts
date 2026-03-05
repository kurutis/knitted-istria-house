import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

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

        return NextResponse.json({fullname: user?.name || '', email: user?.email || '', phone: user?.phone, city: user?.city || '', address: user?.address || '', avatarUrl: user?.avatar_url || null, newsletterAgreement: user?.newsletter_agreement || false})

    }catch (error){
        return NextResponse.json({ error: "Ошибка загрузки профиля" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user) {
            return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
        }

        const contentType = request.headers.get('content-type') || ''
        
        let updateData: any = {}
        
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            
            updateData = {fullname: formData.get('fullname') as string, phone: formData.get('phone') as string, city: formData.get('city') as string, address: formData.get('address') as string, newsletterAgreement: formData.get('newsletterAgreement') === 'true'}
            
            const avatarFile = formData.get('avatar') as File | null
            
            if (avatarFile && avatarFile.size > 0) {
                try {
                    const bytes = await avatarFile.arrayBuffer()
                    const buffer = Buffer.from(bytes)
                    
                    const timestamp = Date.now()
                    const originalName = avatarFile.name.replace(/\s/g, '_')
                    const ext = path.extname(originalName)
                    const filename = `${timestamp}${ext}`
                    
                    const uploadDir = path.join(process.cwd(), 'public/uploads/avatars')
                    
                    if (!existsSync(uploadDir)) {
                        await mkdir(uploadDir, { recursive: true })
                    }
                    
                    const filePath = path.join(uploadDir, filename)
                    await writeFile(filePath, buffer)
                    
                    updateData.avatarUrl = `/uploads/avatars/${filename}`
                } catch (uploadError) {
                    console.error("Error uploading avatar:", uploadError)
                    return NextResponse.json({ error: "Ошибка загрузки аватара" }, { status: 500 })
                }
            }
        } else {
            updateData = await request.json()
        }

        if (!updateData.fullname) {
            return NextResponse.json({ error: "Имя обязательно" }, { status: 400 })
        }

        await db.updateUserProfile(session.user.id, { fullname: updateData.fullname, phone: updateData.phone || '', city: updateData.city || '', address: updateData.address || '', newsletterAgreement: updateData.newsletterAgreement || false, avatarUrl: updateData.avatarUrl})

        return NextResponse.json({ success: true, message: "Профиль успешно обновлен",  avatarUrl: updateData.avatarUrl  })
    } catch (error) {
        console.error("Error updating profile:", error)
        return NextResponse.json({error: error instanceof Error ? error.message : "Ошибка обновления профиля"}, { status: 500 })
    }
}