import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); 

const ALLOWED_DOMAINS = ['supabase.co', 'supabase.in', 'selstorage.ru', '30bd5b8c-136d-48e3-b7c1-71a168d4fef4.selstorage.ru', 'googleusercontent.com', 'fbcdn.net', 'scontent.xx.fbcdn.net', 'cdninstagram.com', 'vk.com', 'vkuser.net', 'userapi.com', 'yandex.ru', 'yandex.net', 'yastatic.net', 'cloudinary.com', 'imgur.com', 'i.imgur.com', 's3.amazonaws.com', 's3.eu-central-1.amazonaws.com', 'storage.yandexcloud.net', 'cdn.jsdelivr.net', 'unpkg.com'];

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function isDomainAllowed(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
        
        const internalIPs = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '169.254.'];
        for (const ip of internalIPs) {if (hostname.startsWith(ip)) return false;}
        
        
        return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    } catch {
        return false;
    }
}

function validateUrl(url: string): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string') return { valid: false, error: 'URL не указан' };
    
    
    if (url.length > 2000) return { valid: false, error: 'URL слишком длинный' };
    
    
    try {
        const urlObj = new URL(url);
        
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return { valid: false, error: 'Поддерживаются только HTTP/HTTPS URL' };
        
        
        if (!isDomainAllowed(url)) return { valid: false, error: 'Домен не разрешен' };
        
        
        return { valid: true };
    } catch {
        return { valid: false, error: 'Неверный формат URL' };
    }
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Proxy image rate limit exceeded', { ip });
            return NextResponse.json({ error: 'Слишком много запросов. Попробуйте через минуту.' }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        let url = searchParams.get('url');
        
        if (!url) return NextResponse.json({ error: 'URL изображения не указан' }, { status: 400 });
        
        
        try {url = decodeURIComponent(url)} catch {}
        
        const validation = validateUrl(url);
        if (!validation.valid) {
            logError('Proxy image validation failed', { url, error: validation.error }, 'warning');
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
        
        try {
            const response = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8', 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8', 'Referer': 'https://knitly.ru/', 'Cache-Control': 'no-cache'}, signal: controller.signal});
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                logError('Proxy image fetch failed', { url, status: response.status }, 'warning');
                return NextResponse.json({error: `Не удалось загрузить изображение: ${response.status}`}, { status: response.status });
            }
            
            const contentType = response.headers.get('Content-Type');
            if (!contentType || !ALLOWED_MIME_TYPES.some(type => contentType.includes(type))) return NextResponse.json({error: 'Неверный тип файла. Поддерживаются только изображения.'}, { status: 400 });
            
            
            const contentLength = response.headers.get('Content-Length');
            if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) return NextResponse.json({ error: 'Изображение слишком большое (максимум 5MB)'}, { status: 400 });
            
            
            const buffer = await response.arrayBuffer();
            
            if (buffer.byteLength > MAX_IMAGE_SIZE) return NextResponse.json({ error: 'Изображение слишком большое (максимум 5MB)'}, { status: 400 });
            
            
            logInfo('Image proxied successfully', {url: url.substring(0, 100), size: buffer.byteLength, type: contentType, duration: Date.now() - startTime })
            
            return new NextResponse(buffer, {headers: {'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400', 'Content-Length': buffer.byteLength.toString(), 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' }})
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError instanceof Error && fetchError.name === 'AbortError') return NextResponse.json({ error: 'Превышено время ожидания' }, { status: 504 });
            
            
            throw fetchError;
        }
        
    } catch (error) {
        logError('Proxy image error', error);
        return NextResponse.json({error: 'Ошибка загрузки изображения' }, { status: 500 });
    }
}

export async function OPTIONS() {return new NextResponse(null, {headers: {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'} });}