import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('notification_order_status, notification_promotions, notification_messages, newsletter_agreement')
            .eq('user_id', session.user.id)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching notification settings:', error)
        }

        return NextResponse.json({
            orderStatus: profile?.notification_order_status ?? true,
            promotions: profile?.notification_promotions ?? true,
            messages: profile?.notification_messages ?? false,
            newsletterAgreement: profile?.newsletter_agreement ?? false
        })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { orderStatus, promotions, messages, newsletterAgreement } = await request.json()

        const { error } = await supabase
            .from('profiles')
            .update({
                notification_order_status: orderStatus,
                notification_promotions: promotions,
                notification_messages: messages,
                newsletter_agreement: newsletterAgreement,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.id)

        if (error) {
            console.error('Error updating notification settings:', error)
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}