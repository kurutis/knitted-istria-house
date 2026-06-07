interface SanitizeOptions {
    maxLength?: number;
    allowLineBreaks?: boolean;
    allowedTags?: string[];
    allowedAttributes?: string[];
}

const DEFAULT_OPTIONS: SanitizeOptions = {
    maxLength: 10000,
    allowLineBreaks: false,
    allowedTags: [],
    allowedAttributes: []
};

const htmlEntities: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '/': '&#x2F;'};
const reverseHtmlEntities: Record<string, string> = Object.entries(htmlEntities).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {})
const sqlSpecialChars = ["'", '"', ';', '--', '/*', '*/', '@', '\\'];

export function sanitizeHTML(str: string, options: SanitizeOptions = {}): string {
    if (!str) return '';
    
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let result = str;
    
    result = result.replace(/[&<>"'`/]/g, (char) => htmlEntities[char] || char);
    
    // Обработка переносов строк
    if (!opts.allowLineBreaks) {
        result = result.replace(/\n/g, ' ');
        result = result.replace(/\r/g, ' ');
    } else {
        result = result.replace(/\r\n/g, '\n');
    }
    
    if (opts.allowedTags && opts.allowedTags.length > 0) {
        const tagsPattern = new RegExp(`<(?!\/?(?:${opts.allowedTags.join('|')})\\b)[^>]*>`, 'gi');
        result = result.replace(tagsPattern, '');
    } else {
        result = result.replace(/<[^>]*>/g, '');
    }
    
    if (opts.maxLength && result.length > opts.maxLength) {
        result = result.substring(0, opts.maxLength);
    }
    
    return result;
}

export function decodeHTML(str: string): string {
    if (!str) return '';
    
    return str.replace(/&(#?[a-zA-Z0-9]+);/g, (match, entity) => {
        if (reverseHtmlEntities[match]) {return reverseHtmlEntities[match]}
        if (entity.startsWith('#')) {
            const code = parseInt(entity.slice(1), 10);
            if (!isNaN(code)) {return String.fromCharCode(code)}
        }
        return match;
    });
}

export function sanitizeText(str: string, options: SanitizeOptions = {}): string {
    if (!str) return '';
    
    let result = str.trim();
    
    result = result.replace(/\s+/g, ' ');

    result = result.replace(/[\x00-\x1F\x7F]/g, '');
    
    if (options.maxLength && result.length > options.maxLength) {result = result.substring(0, options.maxLength)}
    
    return result;
}

export function sanitizeEmail(email: string): string {
    if (!email) return '';
    
    let result = email.toLowerCase().trim();
    
    result = result.replace(/\s/g, '');
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(result)) {return ''}
    
    if (result.length > 254) {return ''}
    
    return result;
}

export function sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    let result = phone.replace(/[^0-9+]/g, '');
    
    result = result.replace(/^\+/, '').replace(/\+/g, '');
    
    if (result.startsWith('7') || result.startsWith('8')) {result = '+' + result}
    if (result.length > 15) {result = result.substring(0, 15)}
    
    return result;
}

export function formatPhone(phone: string): string {
    const cleaned = sanitizePhone(phone);
    if (cleaned.startsWith('+7')) {
        const numbers = cleaned.slice(2);
        if (numbers.length === 10) {
            return `+7 (${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 8)}-${numbers.slice(8, 10)}`;
        }
    }
    return cleaned;
}

export function sanitizeURL(url: string): string {
    if (!url) return '';
    
    let result = url.trim();
    
    const allowedProtocols = ['http://', 'https://', 'ftp://', 'ftps://'];
    let hasProtocol = false;
    
    for (const protocol of allowedProtocols) {
        if (result.toLowerCase().startsWith(protocol)) {
            hasProtocol = true;
            break;
        }
    }
    
    if (!hasProtocol) {result = 'https://' + result}
    result = result.replace(/[<>"'`]/g, '');
    if (result.length > 2000) {result = result.substring(0, 2000)}
    return result;
}

export function escapeSQL(str: string): string {
    if (!str) return '';
    
    let result = str;
    for (const char of sqlSpecialChars) {result = result.split(char).join(`\\${char}`)}
    return result;
}

export function sanitizeUsername(username: string): string {
    if (!username) return '';
    
    let result = username.trim();
    result = result.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '');
    if (result.length < 3) return '';
    if (result.length > 50) result = result.substring(0, 50);
    
    return result;
}

export function sanitizeTitle(title: string, maxLength: number = 200): string {
    if (!title) return '';
    
    let result = title.trim()
    result = result.replace(/\s+/g, ' ')
    result = result.replace(/<[^>]*>/g, '')
    if (result.length > maxLength) {result = result.substring(0, maxLength)}
    
    return result;
}

export function sanitizeDescription(description: string, maxLength: number = 5000): string {
    if (!description) return ''
    
    let result = description.trim()
    result = result.replace(/\r\n/g, '\n');
    
    result = result.replace(/<(?!\/?(?:b|i|u|strong|em|br)\b)[^>]*>/gi, '');
    
    if (result.length > maxLength) {result = result.substring(0, maxLength)}
    
    return result;
}

export function sanitizeNumber(value: unknown, defaultValue: number = 0, min?: number, max?: number): number {
    let num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
    if (isNaN(num)) {return defaultValue}
    if (min !== undefined && num < min) {num = min}
    if (max !== undefined && num > max) {num = max}
    
    return num;
}

export function sanitizePrice(price: unknown): number {
    const num = typeof price === 'string' ? parseFloat(price) : typeof price === 'number' ? price : NaN;
    
    if (isNaN(num) || num < 0) {return 0}
    return Math.round(num * 100) / 100;
}

export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T, rules: Partial<Record<keyof T, (value: unknown) => unknown>>): T {
    const result = {} as T;
    
    for (const key of Object.keys(obj) as (keyof T)[]) {
        if (rules[key]) {
            result[key] = rules[key](obj[key]) as T[keyof T];
        } else {
            result[key] = obj[key];
        }
    }
    
    return result;
}

export function removeDangerousFields<T extends Record<string, unknown>>(obj: T, allowedFields: (keyof T)[]): Partial<T> {
    const result: Partial<T> = {};
    
    for (const field of allowedFields) {if (field in obj) {result[field] = obj[field]}}
    
    return result;
}

export const sanitize = {html: sanitizeHTML, decodeHtml: decodeHTML, text: sanitizeText, email: sanitizeEmail, phone: sanitizePhone, formatPhone, url: sanitizeURL, sql: escapeSQL, username: sanitizeUsername, title: sanitizeTitle, description: sanitizeDescription, number: sanitizeNumber, price: sanitizePrice, uuid: isValidUUID, object: sanitizeObject, removeFields: removeDangerousFields}