import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

export async function GET(request: Request) {
  try {
    const rateResult = limiter(request);
    if (!rateResult.success) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
    

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20);
    const sortBy = searchParams.get('sortBy') || 'rating';

    let usersQuery = supabase.from('users').select('id, email, created_at').eq('role', 'master').eq('is_banned', false);

    if (sortBy === 'newest') usersQuery = usersQuery.order('created_at', { ascending: false }); 

    const { data: users, error: usersError } = await usersQuery.limit(limit);
    if (usersError) throw usersError;
    if (!users || users.length === 0) return NextResponse.json([]);

    const userIds = users.map(u => u.id);

    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('user_id, full_name, avatar_url, city, address').in('user_id', userIds);

    const { data: mastersData, error: mastersError } = await supabase.from('masters').select('user_id, is_verified, is_partner, custom_orders_enabled').in('user_id', userIds);

    const profilesMap = new Map();
    profiles?.forEach(p => profilesMap.set(p.user_id, p));

    const mastersMap = new Map();
    mastersData?.forEach(m => mastersMap.set(m.user_id, m));

    const { data: products, error: prodError } = await supabase.from('products').select('id, master_id, price').in('master_id', userIds).eq('status', 'active');

    const masterProductIds = new Map<string, string[]>();
    (products || []).forEach(p => {
      const existing = masterProductIds.get(p.master_id);
      if (existing) existing.push(p.id);
      else masterProductIds.set(p.master_id, [p.id]);
    });

    const salesMap = new Map<string, number>();
    for (const masterId of userIds) {
      const productIds = masterProductIds.get(masterId) || [];
      if (productIds.length === 0) {
        salesMap.set(masterId, 0);
        continue;
      }

      const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('quantity, product_id, order_id').in('product_id', productIds);

      if (itemsError || !orderItems || orderItems.length === 0) {
        salesMap.set(masterId, 0);
        continue;
      }

      const orderIds = [...new Set(orderItems.map(item => item.order_id))];
      const { data: orders, error: ordersError } = await supabase.from('orders').select('id, status, payment_status').in('id', orderIds);

      const validOrderIds = new Set(
        (orders || []).filter(o => o.status !== 'cancelled' && o.payment_status === 'paid').map(o => o.id)
      );

      let total = 0;
      for (const item of orderItems) {if (validOrderIds.has(item.order_id)) {total += item.quantity}}
      salesMap.set(masterId, total);
    }

    const { data: reviews, error: revError } = await supabase.from('reviews').select('target_id, rating').in('target_id', userIds).eq('target_type', 'master');

    const ratingSumMap = new Map<string, number>();
    const ratingCountMap = new Map<string, number>();
    (reviews || []).forEach(r => {
      const curSum = ratingSumMap.get(r.target_id) || 0;
      const curCnt = ratingCountMap.get(r.target_id) || 0;
      ratingSumMap.set(r.target_id, curSum + r.rating);
      ratingCountMap.set(r.target_id, curCnt + 1);
    });

    const formatted = users.map(user => {
      const profile = profilesMap.get(user.id);
      const master = mastersMap.get(user.id);
      const totalSales = salesMap.get(user.id) || 0;
      const avgRating = ratingSumMap.has(user.id) ? ratingSumMap.get(user.id)! / ratingCountMap.get(user.id)! : 0;

      return { id: user.id, name: profile?.full_name || user.email?.split('@')[0] || 'Мастер', avatar_url: profile?.avatar_url || null, city: profile?.city || null, sales: totalSales, rating: parseFloat(avgRating.toFixed(1)), is_verified: master?.is_verified || false, is_partner: master?.is_partner || false, custom_orders_enabled: master?.custom_orders_enabled || false };
    });

    if (sortBy === 'rating') {
      formatted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'sales') {
      formatted.sort((a, b) => b.sales - a.sales);
    }

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Top masters error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки топ мастеров' }, { status: 500 });
  }
}