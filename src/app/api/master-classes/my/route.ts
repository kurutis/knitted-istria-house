import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

interface MasterClassData {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    price: number;
    max_participants: number;
    current_participants: number;
    date_time: string;
    duration_minutes: number;
    location: string | null;
    online_link: string | null;
    materials: string | null;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    master_id: string;
    users: Array<{
        id: string;
        email: string;
    }>;
}

interface Registration {
    master_class_id: string;
    payment_status: string;
    payment_amount: number;
    created_at: string;
    updated_at: string;
}

interface ProfileData {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
    phone: string | null;
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) return NextResponse.json([], { status: 429 })

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        const cacheKey = `my_master_classes_${session.user.id}_${status || 'all'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            const { data: registrations, error: regError } = await supabase.from('master_class_registrations').select('master_class_id, payment_status, payment_amount, created_at, updated_at').eq('user_id', session.user.id);

            if (regError) {
                logError('Error fetching registrations', regError);
                throw new Error('DATABASE_ERROR');
            }

            if (!registrations || registrations.length === 0) return []

            const masterClassIds = registrations.map((r: Registration) => r.master_class_id);
            
            let classesQuery = supabase.from('master_classes').select(`id, title, description,  type, status, price, max_participants, current_participants, date_time, duration_minutes, location, online_link, materials, image_url, created_at, updated_at, master_id, users!inner (id, email)`).in('id', masterClassIds);

            const now = new Date().toISOString();
            if (status === 'upcoming') {
                classesQuery = classesQuery.gt('date_time', now);
            } else if (status === 'past') {
                classesQuery = classesQuery.lt('date_time', now);
            } else if (status === 'cancelled') {
                classesQuery = classesQuery.eq('status', 'cancelled');
            }

            const { data: masterClasses, error: mcError } = await classesQuery.order('date_time', { ascending: status === 'past' ? false : true }).range(offset, offset + limit - 1);

            if (mcError) {
                logError('Error fetching master classes', mcError);
                throw new Error('DATABASE_ERROR');
            }

            if (!masterClasses || masterClasses.length === 0) return []

            const masterIds = [...new Set(masterClasses.map((mc: MasterClassData) => mc.master_id))];
            const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, avatar_url, city, phone').in('user_id', masterIds);
            
            const profileMap = new Map<string, ProfileData>();
            profilesData?.forEach((profile: ProfileData) => {profileMap.set(profile.user_id, profile)});

            const registrationMap = new Map<string, Registration>();
            registrations.forEach((reg: Registration) => {registrationMap.set(reg.master_class_id, reg)});

            const nowDate = new Date();
            const formattedRegistrations = masterClasses.map((mc: MasterClassData) => {
                const classDate = new Date(mc.date_time);
                const isUpcoming = classDate > nowDate;
                const isPast = classDate < nowDate;
                const isFull = (mc.current_participants || 0) >= (mc.max_participants || 0);
                const spotsLeft = (mc.max_participants || 0) - (mc.current_participants || 0);
                
                const registration = registrationMap.get(mc.id);
                const masterProfile = profileMap.get(mc.master_id)
                const userEmail = mc.users?.[0]?.email;
                
                return {id: mc.id, payment_status: registration?.payment_status || 'pending', payment_amount: registration?.payment_amount || 0, registered_at: registration?.created_at, updated_at: registration?.updated_at, master_class: {id: mc.id, title: mc.title, description: mc.description, type: mc.type, status: mc.status, price: parseFloat(String(mc.price || 0)), max_participants: mc.max_participants, current_participants: mc.current_participants || 0, spots_left: spotsLeft, is_full: isFull, date_time: mc.date_time, duration_minutes: mc.duration_minutes, location: mc.location, online_link: mc.online_link, materials: mc.materials, image_url: mc.image_url, created_at: mc.created_at, updated_at: mc.updated_at, master_id: mc.master_id, master_name: masterProfile?.full_name || userEmail || 'Мастер', master_avatar: masterProfile?.avatar_url, master_city: masterProfile?.city, master_phone: masterProfile?.phone, is_upcoming: isUpcoming, is_past: isPast, can_cancel: isUpcoming && mc.status === 'published' && !isPast, can_review: isPast && mc.status === 'completed'  }};
            });

            return formattedRegistrations;
        });

        logInfo('My master classes fetched', {userId: session.user.id, count: result.length, duration: Date.now() - startTime});

        return NextResponse.json(result, { status: 200 });
        
    } catch (error) {
        logError('Error fetching my master classes', error);
        return NextResponse.json([], { status: 500 });
    }
}