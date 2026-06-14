import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

interface MasterRow {
  id: string;
  email: string;
  profiles: { full_name: string | null; avatar_url: string | null; city: string | null }[];
  masters: {
    is_verified: boolean;
    is_partner: boolean;
    custom_orders_enabled: boolean;
    description: string | null;
    moderation_status: string;
  }[];
}

interface Product {
  id: string;
  master_id: string;
  price: number;
}

interface OrderItem {
  quantity: number;
  product_id: string;
  order_id: string;
}

interface Order {
  id: string;
  status: string;
  payment_status: string;
}

interface Review {
  target_id: string;
  rating: number;
}

export async function GET(request: Request) {
  try {
    const rateResult = limiter(request);
    if (!rateResult.success) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
    

    const cacheKey = "top_masters_list";
    const data = await cachedQuery(cacheKey, async () => {
      const { data: masters, error: mastersError } = await supabase.from("users").select(`id, email, profiles!inner ( full_name, avatar_url, city ), masters!inner (is_verified, is_partner, custom_orders_enabled, description, moderation_status)`).eq("role", "master").eq("is_banned", false);

      if (mastersError) throw mastersError;
      if (!masters || masters.length === 0) return [];

      const userIds = masters.map((m: MasterRow) => m.id);

      const { data: products, error: prodError } = await supabase.from("products").select("id, master_id, price").in("master_id", userIds).eq("status", "active");

      if (prodError) console.error("products error", prodError);

      const masterProductIds = new Map<string, string[]>();
      (products || []).forEach((p: Product) => {
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

        const { data: orderItems, error: itemsError } = await supabase.from("order_items").select("quantity, product_id, order_id").in("product_id", productIds);

        if (itemsError || !orderItems || orderItems.length === 0) {
          salesMap.set(masterId, 0);
          continue;
        }

        const orderIds = [...new Set(orderItems.map((item: OrderItem) => item.order_id))];
        const { data: orders, error: ordersError } = await supabase.from("orders").select("id, status, payment_status").in("id", orderIds);

        const validOrderIds = new Set((orders || []).filter((o: Order) => o.status !== "cancelled" && o.payment_status === "paid").map((o: Order) => o.id));

        let total = 0;
        for (const item of orderItems) {if (validOrderIds.has(item.order_id)) {total += item.quantity;}}
        salesMap.set(masterId, total);
      }

      const { data: reviews, error: revError } = await supabase.from("reviews").select("target_id, rating").in("target_id", userIds).eq("target_type", "master");

      if (revError) console.error("reviews error", revError);
      const ratingSumMap = new Map<string, number>();
      const ratingCountMap = new Map<string, number>();
      (reviews || []).forEach((r: Review) => {
        const curSum = ratingSumMap.get(r.target_id) || 0;
        const curCnt = ratingCountMap.get(r.target_id) || 0;
        ratingSumMap.set(r.target_id, curSum + r.rating);
        ratingCountMap.set(r.target_id, curCnt + 1);
      });

      const result = masters.map((m: MasterRow) => {
        const profile = m.profiles[0]
        const masterInfo = m.masters[0];
        const totalSales = salesMap.get(m.id) || 0;
        const avgRating = ratingSumMap.has(m.id) ? ratingSumMap.get(m.id)! / ratingCountMap.get(m.id)! : 0;
        return {id: m.id, name: profile?.full_name || m.email?.split("@")[0] || "Мастер", avatar_url: profile?.avatar_url || null, city: profile?.city || null, sales: totalSales, rating: parseFloat(avgRating.toFixed(1)), is_verified: masterInfo?.is_verified || false, is_partner: masterInfo?.is_partner || false, custom_orders_enabled: masterInfo?.custom_orders_enabled || false};
      });

      result.sort((a, b) => {
        if (a.rating !== b.rating) return b.rating - a.rating;
        return b.sales - a.sales;
      });

      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "8"), 20);
      return result.slice(0, limit);
    }, 300); 

    return NextResponse.json(data);
  } catch (error) {
    console.error("Top masters error:", error);
    return NextResponse.json({ error: "Ошибка загрузки топ мастеров" }, { status: 500 });
  }
}