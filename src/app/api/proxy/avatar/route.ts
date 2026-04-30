import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
        return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://yandex.ru/'
            }
        });
        
        const buffer = await response.arrayBuffer();
        
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 500 });
    }
}