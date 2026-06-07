import { logError, logInfo, logWarning } from './error-logger';

const SMS_CONFIG = {apiId: process.env.SMS_RU_API_ID, testMode: process.env.NODE_ENV === 'development' || process.env.SMS_TEST_MODE === 'true', timeout: 10000, minBalance: 50, defaultTestCode: '1111', codeLength: 4}

interface SMSResponse {
    status: string;
    status_code: number;
    status_text?: string;
    balance?: number;
    sms_id?: string;
}

const SMSErrors: Record<number, string> = {200: 'Неправильный API ID', 201: 'Не хватает средств на счете', 202: 'Неправильно указан номер телефона получателя', 203: 'Нет текста сообщения', 204: 'Имя отправителя не зарегистрировано', 205: 'Сообщение слишком длинное (> 800 символов)', 206: 'Будет превышен лимит на отправку сообщений в день', 207: 'Неправильно указан IP-адрес сервера', 208: 'Пустой IP-адрес', 210: 'Неправильно указано время отправки', 211: 'Неправильный формат номера', 220: 'Неверный формат JSON', 230: 'Ошибка авторизации', 240: 'Неверный формат страны отправителя'}

export function cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    let cleaned = phone.replace(/[^0-9]/g, '');
    
    if (cleaned.startsWith('8')) { cleaned = '7' + cleaned.slice(1)}

    if (cleaned.length === 11 && cleaned.startsWith('7')) {return `+${cleaned}`}
    
    return cleaned;
}

export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
    const cleaned = cleanPhoneNumber(phone);
    const numbersOnly = cleaned.replace(/[^0-9]/g, '');
    
    if (!numbersOnly) {return { valid: false, error: 'Номер телефона не указан' }}
    if (numbersOnly.length < 10) {return { valid: false, error: 'Номер телефона слишком короткий' }}
    if (numbersOnly.length > 12) {return { valid: false, error: 'Номер телефона слишком длинный' }}
    
    const validCountryCodes = ['7', '375', '380', '44', '1', '49', '33', '34', '39', '48', '90', '66'];
    const countryCode = numbersOnly.substring(0, numbersOnly.length === 11 ? 1 : numbersOnly.length === 12 ? 3 : 0);
    
    if (countryCode && !validCountryCodes.includes(countryCode)) {return { valid: false, error: 'Неподдерживаемый код страны' }}
    
    return { valid: true };
}

export function generateSMSCode(): string {
    if (SMS_CONFIG.testMode) { return SMS_CONFIG.defaultTestCode}
    
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    return code;
}

export async function sendSMS(phone: string, code: string): Promise<boolean> {
    const startTime = Date.now();
    const cleanPhone = cleanPhoneNumber(phone);
    
    const validation = validatePhoneNumber(cleanPhone);
    if (!validation.valid) {
        logWarning('Invalid phone number for SMS', undefined, { phone, error: validation.error });
        return false;
    }
    
    if (SMS_CONFIG.testMode) {
        logInfo(`[TEST MODE] SMS code for ${cleanPhone}: ${code}`, { phone: cleanPhone, code });
        return true;
    }
    
    if (!SMS_CONFIG.apiId) {
        logError('SMS_RU_API_ID not configured', new Error('Missing API ID'));
        return false;
    }
    
    try {
        const response = await fetch('https://sms.ru/sms/send', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'}, body: new URLSearchParams({api_id: SMS_CONFIG.apiId, to: cleanPhone.replace(/[^0-9]/g, ''), msg: `Ваш код подтверждения: ${code}`, json: '1'}).toString(), signal: AbortSignal.timeout(SMS_CONFIG.timeout)})
        
        const duration = Date.now() - startTime;
        const data = await response.json() as SMSResponse;

        const isSuccess = data.status === 'OK' || data.status === '100' || data.status === '101' || data.status === '102' || data.status_code === 100 || data.status_code === 101 || data.status_code === 102
        
        if (isSuccess) {
            logInfo('SMS sent successfully', {phone: maskPhone(cleanPhone), duration, status: data.status, smsId: data.sms_id})
            return true;
        }
        
        const errorMessage = SMSErrors[data.status_code] || data.status_text || 'Неизвестная ошибка';
        
        logError('SMS sending failed', new Error(errorMessage), 'warning', {phone: maskPhone(cleanPhone), statusCode: data.status_code, duration})
        
        return false;
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        if (error instanceof Error) {
            if (error.name === 'TimeoutError') {
                logError('SMS timeout', error, 'warning', { phone: maskPhone(cleanPhone), duration });
            } else {
                logError('SMS sending error', error, 'warning', { phone: maskPhone(cleanPhone), duration });
            }
        }
        
        return false;
    }
}

export async function sendVerificationSMS(phone: string): Promise<{ success: boolean; code?: string; error?: string }> {
    const code = generateSMSCode();
    const success = await sendSMS(phone, code);
    
    if (success) {return { success: true, code }}
    
    return { success: false, error: 'Не удалось отправить SMS. Попробуйте позже.' };
}

export async function checkSMSBalance(): Promise<{ balance: number | null; isLow: boolean; error?: string }> {
    if (SMS_CONFIG.testMode) {
        logInfo('Balance check skipped in test mode');
        return { balance: 100, isLow: false };
    }
    
    if (!SMS_CONFIG.apiId) {
        return { balance: null, isLow: false, error: 'SMS API не настроен' };
    }
    
    try {
        const response = await fetch(`https://sms.ru/my/balance?api_id=${SMS_CONFIG.apiId}&json=1`, {signal: AbortSignal.timeout(5000)});
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.balance) {
            const balance = parseFloat(data.balance);
            const isLow = balance < SMS_CONFIG.minBalance;
            
            if (isLow) {logWarning('Low SMS balance', undefined, { balance, minBalance: SMS_CONFIG.minBalance })} else {logInfo('SMS balance checked', { balance })}
            
            return { balance, isLow };
        }
        
        return { balance: null, isLow: false, error: data.status_text || 'Ошибка проверки баланса' };
        
    } catch (error) {
        logError('Balance check error', error, 'warning');
        return { balance: null, isLow: false, error: 'Не удалось проверить баланс' };
    }
}

export function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
        const number = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;
        return `+7 (${number.slice(1, 4)}) ${number.slice(4, 7)}-${number.slice(7, 9)}-${number.slice(9, 11)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('380')) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('375')) {
        return `+${cleaned.slice(0, 3)} (${cleaned.slice(3, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8, 10)}-${cleaned.slice(10, 12)}`;
    }
    return `+${cleaned}`;
}

export function maskPhone(phone: string): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length >= 10) {
        const start = cleaned.slice(0, -4)
        const end = cleaned.slice(-4)
        return `${start.slice(0, Math.min(3, start.length))}***${end}`}
    return '***'
}

export function isSMSCodeValid(inputCode: string, storedCode: string): boolean {
    if (!inputCode || !storedCode) return false;
    return inputCode === storedCode;
}

export function isSMSCodeValidWithExpiry(inputCode: string, storedCode: string | null | undefined, expiresAt: string | null | undefined): { valid: boolean; expired?: boolean } {
    if (!inputCode || !storedCode) return { valid: false }
    if (inputCode !== storedCode) return { valid: false }
    if (expiresAt && new Date(expiresAt) < new Date()) return { valid: false, expired: true }
    
    return { valid: true };
}

export const sms = {generateCode: generateSMSCode, send: sendSMS, sendVerification: sendVerificationSMS, checkBalance: checkSMSBalance, formatPhone: formatPhoneNumber, validatePhone: validatePhoneNumber, cleanPhone: cleanPhoneNumber, maskPhone, isValidCode: isSMSCodeValid, isValidCodeWithExpiry: isSMSCodeValidWithExpiry}