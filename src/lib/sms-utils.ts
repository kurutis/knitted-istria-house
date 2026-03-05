export const generateSMSCode = () => {
    if (process.env.NODE_ENV === 'development'){
        return '1111'
    }
    return Math.floor(1000 + Math.random()*9000).toString()
}

export const sendSMS = async (phone: string, code: string) => {
    if (process.env.NODE_ENV === 'development'){
        console.log(`[DEV SMS] Код для ${phone}: ${code}`)
        return true
    }

    // Здесь будет реальная интеграция с SMS сервисом (sms.ru или twilio)

    try{
        return true
    } catch (error){
        console.error('SMS sending error:', error)
        return false
    }
}