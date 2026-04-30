import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Error fetching notifications:', error);
            return NextResponse.json([]);
        }

        return NextResponse.json(notifications || [])
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json([]);
    }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    try {
        const { error: updateError } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', session.user.id)

        if (updateError) {
            console.error('Error marking notification as read:', updateError);
            return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
        }

        return NextResponse.json({ success: true })
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
}