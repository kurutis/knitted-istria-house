import nodemailer from 'nodemailer';

// Настройки для отправки email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mail.ru',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function sendVerificationEmail(email: string, code: string, name: string): Promise<boolean> {
    try {
        // В режиме разработки просто логируем
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV EMAIL] To: ${email}, Code: ${code}`);
            return true;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); border-radius: 10px 10px 0 0; }
                    .header h1 { color: white; margin: 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code { font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0; letter-spacing: 5px; color: #D97C8E; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Дом вязанных историй</h1>
                    </div>
                    <div class="content">
                        <h2>Добро пожаловать, ${name}!</h2>
                        <p>Для завершения регистрации введите следующий код подтверждения:</p>
                        <div class="code">${code}</div>
                        <p>Код действителен в течение 15 минут.</p>
                        <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Дом вязанных историй. Все права защищены.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"Дом вязанных историй" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Подтверждение регистрации',
            html,
        });

        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, name: string): Promise<boolean> {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV EMAIL] Password reset for ${email}: ${resetUrl}`);
            return true;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); border-radius: 10px 10px 0 0; }
                    .header h1 { color: white; margin: 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #F4A67F 0%, #D97C8E 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Дом вязанных историй</h1>
                    </div>
                    <div class="content">
                        <h2>Здравствуйте, ${name}!</h2>
                        <p>Мы получили запрос на сброс пароля для вашей учётной записи.</p>
                        <p>Для создания нового пароля нажмите на кнопку ниже:</p>
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Сбросить пароль</a>
                        </div>
                        <p>Или скопируйте ссылку в браузер: <br/> <a href="${resetUrl}">${resetUrl}</a></p>
                        <p>Ссылка действительна в течение 1 часа.</p>
                        <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
                    </div>
                    <div class="footer">
                        <p>© 2026 Дом вязанных историй. Все права защищены.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"Дом вязанных историй" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Восстановление пароля',
            html,
        });

        return true;
    } catch (error) {
        console.error('Password reset email error:', error);
        return false;
    }
}