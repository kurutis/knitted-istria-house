interface SanitizeOptions {
    maxLength?: number;
    allowLineBreaks?: boolean;
    allowedTags?: string[];
    allowedAttributes?: string[];
}

// Конфигурация по умолчанию
const DEFAULT_OPTIONS: SanitizeOptions = {
    maxLength: 10000,
    allowLineBreaks: false,
    allowedTags: [],
    allowedAttributes: []
};

// HTML сущности
const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
    '/': '&#x2F;'
};

// Обратные сущности для декодирования
const reverseHtmlEntities: Record<string, string> = Object.entries(htmlEntities).reduce(
    (acc, [key, value]) => ({ ...acc, [value]: key }),
    {}
);

// Базовые SQL символы для экранирования
const sqlSpecialChars = ["'", '"', ';', '--', '/*', '*/', '@', '\\'];

// Экранирование HTML
export function sanitizeHTML(str: string, options: SanitizeOptions = {}): string {
    if (!str) return '';
    
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let result = str;
    
    // Замена HTML сущностей
    result = result.replace(/[&<>"'`/]/g, (char) => htmlEntities[char] || char);
    
    // Обработка переносов строк
    if (!opts.allowLineBreaks) {
        result = result.replace(/\n/g, ' ');
        result = result.replace(/\r/g, ' ');
    } else {
        result = result.replace(/\r\n/g, '\n');
    }
    
    // Удаление потенциально опасных тегов, если не разрешены
    if (opts.allowedTags && opts.allowedTags.length > 0) {
        const tagsPattern = new RegExp(`<(?!\/?(?:${opts.allowedTags.join('|')})\\b)[^>]*>`, 'gi');
        result = result.replace(tagsPattern, '');
    } else {
        result = result.replace(/<[^>]*>/g, '');
    }
    
    // Ограничение длины
    if (opts.maxLength && result.length > opts.maxLength) {
        result = result.substring(0, opts.maxLength);
    }
    
    return result;
}

// Декодирование HTML
export function decodeHTML(str: string): string {
    if (!str) return '';
    
    return str.replace(/&(#?[a-zA-Z0-9]+);/g, (match, entity) => {
        if (reverseHtmlEntities[match]) {
            return reverseHtmlEntities[match];
        }
        if (entity.startsWith('#')) {
            const code = parseInt(entity.slice(1), 10);
            if (!isNaN(code)) {
                return String.fromCharCode(code);
            }
        }
        return match;
    });
}

// Санитизация для текста
export function sanitizeText(str: string, options: SanitizeOptions = {}): string {
    if (!str) return '';
    
    let result = str.trim();
    
    // Замена множественных пробелов
    result = result.replace(/\s+/g, ' ');
    
    // Удаление управляющих символов
    result = result.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Ограничение длины
    if (options.maxLength && result.length > options.maxLength) {
        result = result.substring(0, options.maxLength);
    }
    
    return result;
}

// Валидация и санитизация email
export function sanitizeEmail(email: string): string {
    if (!email) return '';
    
    let result = email.toLowerCase().trim();
    
    // Удаление пробелов внутри email
    result = result.replace(/\s/g, '');
    
    // Базовая валидация формата
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(result)) {
        return '';
    }
    
    // Ограничение длины (максимальная длина email по RFC - 254 символа)
    if (result.length > 254) {
        return '';
    }
    
    return result;
}

// Валидация и санитизация телефона
export function sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    // Удаляем все кроме цифр и плюса
    let result = phone.replace(/[^0-9+]/g, '');
    
    // Удаляем лишние плюсы
    result = result.replace(/^\+/, '').replace(/\+/g, '');
    
    // Добавляем плюс в начало, если номер начинается с кода страны
    if (result.startsWith('7') || result.startsWith('8')) {
        result = '+' + result;
    }
    
    // Ограничение длины
    if (result.length > 15) {
        result = result.substring(0, 15);
    }
    
    return result;
}

// Форматирование телефона для отображения
export function formatPhone(phone: string): string {
    const cleaned = sanitizePhone(phone);
    
    // Формат +7 (XXX) XXX-XX-XX
    if (cleaned.startsWith('+7')) {
        const numbers = cleaned.slice(2);
        if (numbers.length === 10) {
            return `+7 (${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 8)}-${numbers.slice(8, 10)}`;
        }
    }
    
    return cleaned;
}

// Валидация URL
export function sanitizeURL(url: string): string {
    if (!url) return '';
    
    let result = url.trim();
    
    // Проверка на допустимые протоколы
    const allowedProtocols = ['http://', 'https://', 'ftp://', 'ftps://'];
    let hasProtocol = false;
    
    for (const protocol of allowedProtocols) {
        if (result.toLowerCase().startsWith(protocol)) {
            hasProtocol = true;
            break;
        }
    }
    
    if (!hasProtocol) {
        result = 'https://' + result;
    }
    
    // Удаление потенциально опасных символов
    result = result.replace(/[<>"'`]/g, '');
    
    // Ограничение длины
    if (result.length > 2000) {
        result = result.substring(0, 2000);
    }
    
    return result;
}

// Экранирование для SQL (предотвращение инъекций)
export function escapeSQL(str: string): string {
    if (!str) return '';
    
    let result = str;
    for (const char of sqlSpecialChars) {
        result = result.split(char).join(`\\${char}`);
    }
    
    return result;
}

// Санитизация имени пользователя
export function sanitizeUsername(username: string): string {
    if (!username) return '';
    
    let result = username.trim();
    
    // Разрешаем только буквы, цифры, подчеркивания и дефисы
    result = result.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '');
    
    // Ограничение длины
    if (result.length < 3) return '';
    if (result.length > 50) result = result.substring(0, 50);
    
    return result;
}

// Санитизация названия
export function sanitizeTitle(title: string, maxLength: number = 200): string {
    if (!title) return '';
    
    let result = title.trim();
    
    // Удаление множественных пробелов
    result = result.replace(/\s+/g, ' ');
    
    // Удаление HTML
    result = result.replace(/<[^>]*>/g, '');
    
    // Ограничение длины
    if (result.length > maxLength) {
        result = result.substring(0, maxLength);
    }
    
    return result;
}

// Санитизация описания
export function sanitizeDescription(description: string, maxLength: number = 5000): string {
    if (!description) return '';
    
    let result = description.trim();
    
    // Сохраняем переносы строк
    result = result.replace(/\r\n/g, '\n');
    
    // Удаление HTML кроме базовых тегов
    result = result.replace(/<(?!\/?(?:b|i|u|strong|em|br)\b)[^>]*>/gi, '');
    
    // Ограничение длины
    if (result.length > maxLength) {
        result = result.substring(0, maxLength);
    }
    
    return result;
}

// Валидация и санитизация числа
export function sanitizeNumber(value: unknown, defaultValue: number = 0, min?: number, max?: number): number {
    let num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
    
    if (isNaN(num)) {
        return defaultValue;
    }
    
    if (min !== undefined && num < min) {
        num = min;
    }
    
    if (max !== undefined && num > max) {
        num = max;
    }
    
    return num;
}

// Валидация и санитизация цены
export function sanitizePrice(price: unknown): number {
    const num = typeof price === 'string' ? parseFloat(price) : typeof price === 'number' ? price : NaN;
    
    if (isNaN(num) || num < 0) {
        return 0;
    }
    
    // Округление до 2 знаков
    return Math.round(num * 100) / 100;
}

// Валидация UUID
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Санитизация объекта (рекурсивная)
export function sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    rules: Partial<Record<keyof T, (value: unknown) => unknown>>
): T {
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

// Удаление опасных полей из объекта
export function removeDangerousFields<T extends Record<string, unknown>>(
    obj: T,
    allowedFields: (keyof T)[]
): Partial<T> {
    const result: Partial<T> = {};
    
    for (const field of allowedFields) {
        if (field in obj) {
            result[field] = obj[field];
        }
    }
    
    return result;
}

// Экспорт всех утилит
export const sanitize = {
    html: sanitizeHTML,
    decodeHtml: decodeHTML,
    text: sanitizeText,
    email: sanitizeEmail,
    phone: sanitizePhone,
    formatPhone,
    url: sanitizeURL,
    sql: escapeSQL,
    username: sanitizeUsername,
    title: sanitizeTitle,
    description: sanitizeDescription,
    number: sanitizeNumber,
    price: sanitizePrice,
    uuid: isValidUUID,
    object: sanitizeObject,
    removeFields: removeDangerousFields
};