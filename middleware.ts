import { NextResponse } from "next/server";

export function middleware() {
  // Временно пропускаем все запросы
  return NextResponse.next();
}

export const config = {
  matcher: [],
};