// Генерация 4-значного SMS кода
export const generateSMSCode = (): string => {
    // В режиме разработки всегда возвращаем 1111 для тестирования
    if (process.env.NODE_ENV === 'development') {
        return '1111'
    }
    // В продакшене генерируем случайный код
    return Math.floor(1000 + Math.random() * 9000).toString()
}

// Отправка SMS через sms.ru
export const sendSMS = async (phone: string, code: string): Promise<boolean> => {
    // Очистка номера телефона (оставляем только цифры, убираем +, пробелы, скобки, тире)
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    console.log('Clean phone:', cleanPhone) // Добавьте для отладки
    
    // Валидация номера телефона (должен быть 10-15 цифр)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        console.error(`❌ Неверный формат номера телефона: ${phone} -> ${cleanPhone}`)
        return false
    }

    // Режим разработки - только логирование
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV SMS] Код для ${cleanPhone}: ${code}`)
        return true
    }

    // Проверка наличия API ID
    if (!process.env.SMS_RU_API_ID) {
        console.error('❌ SMS_RU_API_ID не настроен в переменных окружения')
        return false
    }

    try {
        const startTime = Date.now()
        
        const response = await fetch('https://sms.ru/sms/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: new URLSearchParams({
                api_id: process.env.SMS_RU_API_ID,
                to: cleanPhone,
                msg: `Ваш код подтверждения: ${code}`,
                json: '1'
            }).toString(),
            // Таймаут 10 секунд
            signal: AbortSignal.timeout(10000)
        })
        
        const duration = Date.now() - startTime
        const data = await response.json()
        
        // Коды ответа sms.ru:
        // 100 - OK (сообщение отправлено)
        // 101 - Отправляется (сообщение передано на отправку)
        // 102 - Идёт отправка (сообщение отправляется)
        // 103 - Отправлено (сообщение доставлено до оператора)
        // 200 - Неправильный api_id
        // 201 - Не хватает средств на счете
        // 202 - Неправильно указан номер телефона получателя
        // 203 - Нет текста сообщения
        // 204 - Имя отправителя не зарегистрировано
        // 205 - Сообщение слишком длинное (> 800 символов)
        // 206 - Будет превышен лимит на отправку сообщений в день
        // 207 - Неправильно указан IP-адрес сервера
        // 208 - Пустой ip адрес
        // 210 - Неправильно указано время отправки
        // 211 - Неправильный формат номера
        // 220 - Неверный формат json
        // 230 - Ошибка авторизации
        // 240 - Неверный формат страны отправителя
        
        // Успешные коды
        if (data.status === 'OK' || data.status === 100 || data.status === 101 || data.status === 102) {
            console.log(`✅ SMS отправлено на номер ${cleanPhone} за ${duration}мс`)
            return true
        }
        
        // Обработка ошибок
        let errorMessage = ''
        switch (data.status_code) {
            case 200:
                errorMessage = 'Неправильный API ID'
                break
            case 201:
                errorMessage = 'Не хватает средств на счете. Пополните баланс в личном кабинете sms.ru'
                break
            case 202:
                errorMessage = 'Неправильно указан номер телефона получателя'
                break
            case 203:
                errorMessage = 'Нет текста сообщения'
                break
            case 204:
                errorMessage = 'Имя отправителя не зарегистрировано'
                break
            case 205:
                errorMessage = 'Сообщение слишком длинное'
                break
            case 206:
                errorMessage = 'Будет превышен лимит на отправку сообщений в день'
                break
            case 207:
                errorMessage = 'Неправильно указан IP-адрес сервера'
                break
            case 208:
                errorMessage = 'Пустой IP-адрес'
                break
            case 210:
                errorMessage = 'Неправильно указано время отправки'
                break
            case 211:
                errorMessage = 'Неправильный формат номера'
                break
            case 220:
                errorMessage = 'Неверный формат JSON'
                break
            case 230:
                errorMessage = 'Ошибка авторизации'
                break
            case 240:
                errorMessage = 'Неверный формат страны отправителя'
                break
            default:
                errorMessage = data.status_text || 'Неизвестная ошибка'
        }
        
        console.error(`❌ Ошибка SMS: ${errorMessage} (код: ${data.status_code})`)
        return false
        
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'TimeoutError') {
                console.error('❌ Таймаут при отправке SMS (10 секунд)')
            } else {
                console.error('❌ Ошибка при отправке SMS:', error.message)
            }
        } else {
            console.error('❌ Неизвестная ошибка при отправке SMS:', error)
        }
        return false
    }
}

// Проверка баланса SMS.RU
export const checkSMSBalance = async (): Promise<number | null> => {
    if (process.env.NODE_ENV === 'development') {
        console.log('[DEV] Проверка баланса пропущена (режим разработки)')
        return 100 // Тестовый баланс для разработки
    }

    if (!process.env.SMS_RU_API_ID) {
        console.error('❌ SMS_RU_API_ID не настроен')
        return null
    }

    try {
        const response = await fetch(`https://sms.ru/my/balance?api_id=${process.env.SMS_RU_API_ID}&json=1`, {
            signal: AbortSignal.timeout(5000)
        })
        
        const data = await response.json()
        
        if (data.status === 'OK') {
            const balance = parseFloat(data.balance)
            console.log(`💰 Баланс SMS.RU: ${balance.toFixed(2)} ₽`)
            
            // Предупреждение о низком балансе (< 50₽)
            if (balance < 50) {
                console.warn(`⚠️ Низкий баланс SMS.RU: ${balance.toFixed(2)} ₽. Пополните счёт.`)
            }
            
            return balance
        } else {
            console.error(`❌ Ошибка проверки баланса: ${data.status_text}`)
            return null
        }
    } catch (error) {
        console.error('❌ Ошибка при проверке баланса:', error)
        return null
    }
}

// Форматирование номера телефона для отображения
export const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
        return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
    }
    return `+${cleaned}`
}