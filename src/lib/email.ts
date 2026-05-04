import nodemailer from 'nodemailer';
import { logError, logInfo } from './error-logger';

// Типы для email
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

interface TemplateData {
    name: string;
    code?: string;
    resetUrl?: string;
    year?: number;
    siteName?: string;
}

// Конфигурация
const SITE_NAME = 'Дом вязанных историй';
const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const CODE_EXPIRY_MINUTES = 15;
const RESET_LINK_EXPIRY_HOURS = 1;

// Создание транспортера с проверкой конфигурации
function createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
        if (process.env.NODE_ENV === 'production') {
            logError('SMTP configuration missing', new Error('Missing SMTP config'));
        }
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: true, // Используем пул соединений
        maxConnections: 5,
        rateDelta: 1000, // Лимит сообщений в секунду
        rateLimit: 5,
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
    });
}

const transporter = createTransporter();

// Шаблоны email
const templates = {
    verification: (data: TemplateData) => ({
        subject: 'Подтверждение регистрации',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Подтверждение регистрации</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding: 30px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .code { font-size: 36px; font-weight: bold; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 12px; margin: 20px 0; letter-spacing: 8px; color: #D97C8E; font-family: monospace; }
                    .button { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
                    .warning { font-size: 12px; color: #999; margin-top: 20px; }
                    @media (max-width: 480px) {
                        .content { padding: 20px; }
                        .code { font-size: 28px; letter-spacing: 4px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h1>✨ ${SITE_NAME}</h1>
                        </div>
                        <div class="content">
                            <h2>Добро пожаловать, ${escapeHtml(data.name)}! 🧶</h2>
                            <p>Для завершения регистрации введите следующий код подтверждения:</p>
                            <div class="code">${data.code}</div>
                            <p>Код действителен в течение <strong>${CODE_EXPIRY_MINUTES} минут</strong>.</p>
                            <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
                            <div class="warning">
                                ⚠️ Никогда не сообщайте этот код никому. Сотрудники ${SITE_NAME} никогда не запрашивают его.
                            </div>
                        </div>
                        <div class="footer">
                            <p>© ${data.year || new Date().getFullYear()} ${SITE_NAME}. Все права защищены.</p>
                            <p><a href="${SITE_URL}" style="color: #D97C8E;">${SITE_URL}</a></p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    passwordReset: (data: TemplateData) => ({
        subject: 'Восстановление пароля',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Восстановление пароля</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { text-align: center; padding: 30px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .button { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 10px 0; }
                    .link { word-break: break-all; background: #f0f0f0; padding: 12px; border-radius: 8px; font-size: 12px; margin: 15px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
                    .warning { font-size: 12px; color: #999; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h1>🔐 ${SITE_NAME}</h1>
                        </div>
                        <div class="content">
                            <h2>Здравствуйте, ${escapeHtml(data.name)}!</h2>
                            <p>Мы получили запрос на сброс пароля для вашей учётной записи.</p>
                            <p>Для создания нового пароля нажмите на кнопку ниже:</p>
                            <div style="text-align: center;">
                                <a href="${data.resetUrl}" class="button">Сбросить пароль</a>
                            </div>
                            <p>Или скопируйте ссылку в браузер:</p>
                            <div class="link">${data.resetUrl}</div>
                            <p>Ссылка действительна в течение <strong>${RESET_LINK_EXPIRY_HOURS} часа</strong>.</p>
                            <div class="warning">
                                ⚠️ Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. 
                                Ваш пароль останется без изменений.
                            </div>
                        </div>
                        <div class="footer">
                            <p>© ${data.year || new Date().getFullYear()} ${SITE_NAME}. Все права защищены.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    welcome: (data: TemplateData) => ({
        subject: 'Добро пожаловать на платформу!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Добро пожаловать!</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🧶 ${SITE_NAME}</h1>
                    </div>
                    <div class="content">
                        <h2>Добро пожаловать, ${escapeHtml(data.name)}!</h2>
                        <p>Рады видеть вас на нашей платформе. Здесь вы сможете:</p>
                        <ul>
                            <li>✨ Находить уникальные вязаные изделия</li>
                            <li>👨‍🎨 Общаться с талантливыми мастерами</li>
                            <li>📚 Участвовать в мастер-классах</li>
                            <li>💝 Сохранять понравившиеся товары в избранное</li>
                        </ul>
                        <p>Приятных покупок и творческого вдохновения!</p>
                    </div>
                    <div class="footer">
                        <p>© ${data.year || new Date().getFullYear()} ${SITE_NAME}</p>
                    </div>
                </div>
            </body>
            </html>
        `
    })
};

// Функция для экранирования HTML
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Отправка email с проверкой
async function sendEmail(options: EmailOptions): Promise<boolean> {
    // В режиме разработки просто логируем
    if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV EMAIL] ========================================');
        console.log(`📧 [DEV EMAIL] To: ${options.to}`);
        console.log(`📧 [DEV EMAIL] Subject: ${options.subject}`);
        console.log(`📧 [DEV EMAIL] Body preview: ${options.text || options.html?.substring(0, 200)}...`);
        console.log('📧 [DEV EMAIL] ========================================');
        return true;
    }

    if (!transporter) {
        logError('Email transporter not configured', new Error('SMTP not configured'));
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${SITE_NAME}" <${process.env.SMTP_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text
        });

        logInfo('Email sent successfully', {
            messageId: info.messageId,
            to: options.to,
            subject: options.subject
        });

        return true;
    } catch (error) {
        logError('Email sending failed', error);
        return false;
    }
}

// Публичные функции
export async function sendVerificationEmail(email: string, code: string, name: string): Promise<boolean> {
    const template = templates.verification({ name, code });
    return sendEmail({
        to: email,
        subject: template.subject,
        html: template.html
    });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, name: string): Promise<boolean> {
    const template = templates.passwordReset({ name, resetUrl });
    return sendEmail({
        to: email,
        subject: template.subject,
        html: template.html
    });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const template = templates.welcome({ name });
    return sendEmail({
        to: email,
        subject: template.subject,
        html: template.html
    });
}

// Функция для проверки конфигурации email
export function isEmailConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

// Функция для тестирования соединения
export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
    if (!transporter) {
        return { success: false, error: 'SMTP not configured' };
    }

    try {
        await transporter.verify();
        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        return { success: false, error: errorMessage };
    }
}