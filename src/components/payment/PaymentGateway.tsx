'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { YooKassaIcon } from '@/components/icons/payments/YooKassaIcon';
import { TBankIcon } from '@/components/icons/payments/TBankIcon';
import { SBPIcon } from '@/components/icons/payments/SBPIcon';
import { SberIcon } from '@/components/icons/payments/SberIcon';
import { CheckCircleIcon } from '@/components/icons/CheckCircleIcon';
import { ErrorCircleIcon } from '@/components/icons/ErrorCircleIcon';
import { LockIcon } from '@/components/icons/LockIcon';

interface PaymentGatewayProps {
    amount: number;
    orderId: string;
    onSuccess: () => void;
    onCancel?: () => void;
}

interface PaymentProvider {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    commission: string;
    popular?: boolean;
}

const paymentProviders: PaymentProvider[] = [{ id: 'yookassa', name: 'ЮKassa', icon: <YooKassaIcon size={28} />, description: 'Банковские карты, СБП, Apple Pay', commission: '2.8%' }, { id: 'tinkoff', name: 'Т-Банк', icon: <TBankIcon size={28} />, description: 'Карты, Рассрочка, Кредит', commission: '2.5%', popular: true }, { id: 'sbp', name: 'СБП', icon: <SBPIcon size={28} />, description: 'Система быстрых платежей', commission: '0.4%' }, { id: 'sberbank', name: 'Сбербанк', icon: <SberIcon size={28} />, description: 'По реквизитам или СБП', commission: '2.9%' }]

type PaymentStep = 'select' | 'processing' | 'qr' | 'success' | 'error';

export default function PaymentGateway({ amount, orderId, onSuccess, onCancel }: PaymentGatewayProps) {
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [step, setStep] = useState<PaymentStep>('select');
    const [errorMessage, setErrorMessage] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handlePayment = async () => {
        if (!selectedProvider) {
            setErrorMessage('Выберите способ оплаты');
            return;
        }

        setStep('processing');
        setErrorMessage('');

        try {
            const response = await fetch('/api/payments/process', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, amount, provider: selectedProvider })});

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка обработки платежа');
            }

            if (selectedProvider === 'sbp') {
                setQrCode(data.qrCode);
                setStep('qr');
            } else {
                setStep('success');
                setTimeout(() => onSuccess(), 1500);
            }

        } catch (error) {
            console.error('Payment error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Ошибка при оплате');
            setStep('error');
        }
    };

    const resetPayment = () => {
        setStep('select');
        setSelectedProvider('');
        setErrorMessage('');
        setQrCode('');
    };

    return (
        <div className="bg-main rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-linear-to-r from-firm-orange to-firm-pink p-3 sm:p-4">
                <h3 className="text-main font-semibold text-base sm:text-lg text-center">Оплата заказа</h3>
            </div>

            <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                    {step === 'select' && (
                        <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                            <div className="text-center mb-4 sm:mb-6">
                                <p className="text-2xl sm:text-3xl font-bold text-firm-orange">{amount.toLocaleString()} ₽</p>
                                <p className="text-xs sm:text-sm text-firm-gray mt-1">К оплате</p>
                            </div>

                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 sm:pr-2">
                                {paymentProviders.map(provider => (
                                    <label key={provider.id} className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedProvider === provider.id ? 'border-firm-orange bg-firm-orange/5' : 'border-gray-200 hover:border-gray-300 hover:bg-main'}`} >
                                        <input type="radio" name="provider" value={provider.id}  checked={selectedProvider === provider.id} onChange={() => setSelectedProvider(provider.id)} className="w-4 h-4 accent-firm-orange hrink-0" />
                                        <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">{provider.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold text-text text-sm sm:text-base truncate">{provider.name}</p>
                                                {provider.popular && (<span className="text-xs px-2 py-0.5 bg-firm-orange/10 text-firm-orange rounded-full whitespace-nowrap">Популярный</span> )}
                                            </div>
                                            <p className="text-xs text-firm-gray mt-0.5 line-clamp-1">{isMobile ? provider.description.split(',')[0] : provider.description}</p>
                                        </div>
                                        <span className="text-xs text-firm-gray shrink-0">комиссия {provider.commission}</span>
                                    </label>
                                ))}
                            </div>

                            {errorMessage && ( <div className="bg-red-50 text-firm-red p-3 rounded-xl text-sm">{errorMessage}</div>)}

                            <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
                                {onCancel && (<button onClick={onCancel} className="order-2 sm:order-1 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-text text-sm sm:text-base">Отмена</button>)}
                                <button onClick={handlePayment} disabled={!selectedProvider} className="order-1 sm:order-2 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed">Оплатить</button>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-xs text-firm-gray text-center mt-4">
                                <LockIcon color="#9CA3AF" size={14} />
                                <span className="text-[11px] sm:text-xs">Безопасная оплата через платежные системы РФ</span>
                            </div>
                        </motion.div>
                    )}

                    {step === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8 sm:py-12">
                            <div className="inline-block">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            </div>
                            <p className="text-text font-medium text-sm sm:text-base">Обработка платежа...</p>
                            <p className="text-xs sm:text-sm text-firm-gray mt-2">{selectedProvider === 'yookassa' && 'Соединение с ЮKassa...' || selectedProvider === 'tinkoff' && 'Соединение с Т-Банк...' || selectedProvider === 'sbp' && 'Генерация QR-кода...' || selectedProvider === 'sberbank' && 'Соединение со Сбербанк...' || 'Пожалуйста, подождите'}</p>
                        </motion.div>
                    )}

                    {step === 'qr' && (
                        <motion.div key="qr" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 sm:py-6">
                            <div className="bg-gray-100 rounded-2xl p-4 sm:p-6 inline-block mb-4">
                                <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white rounded-xl flex items-center justify-center">
                                    {qrCode ? (
                                        <img src={qrCode} alt="QR-код для оплаты" className="w-32 h-32 sm:w-40 sm:h-40" />
                                    ) : (
                                        <div className="text-center">
                                            <SBPIcon size={40} />
                                            <p className="text-xs text-firm-gray mt-2">Демо-режим</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="font-semibold text-firm-green text-sm sm:text-base">Оплата через СБП</p>
                            <p className="text-xs sm:text-sm text-firm-gray mt-2">Отсканируйте QR-код в приложении вашего банка</p>
                            <p className="text-xs text-firm-gray mt-3 sm:mt-4">Сумма: {amount.toLocaleString()} ₽</p>
                            <button onClick={() => setStep('success')} className="mt-4 px-5 sm:px-6 py-2 bg-firm-green text-main rounded-xl hover:bg-green-600 transition font-medium text-sm sm:text-base">Я оплатил(а)</button>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 sm:py-12">
                            <div className="flex justify-center mb-4">
                                <CheckCircleIcon size={56} color="#22C55E" />
                            </div>
                            <p className="text-firm-green font-bold text-base sm:text-lg">Платеж успешно завершен!</p>
                            <p className="text-firm-gray mt-1 text-sm sm:text-base">Спасибо за покупку</p>
                            <p className="text-xs text-firm-gray mt-2">Номер заказа будет отправлен на вашу почту</p>
                        </motion.div>
                    )}

                    {step === 'error' && (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 sm:py-12">
                            <div className="flex justify-center mb-4">
                                <ErrorCircleIcon size={56} color="#EF4444" />
                            </div>
                            <p className="text-firm-red font-semibold text-base sm:text-lg">Ошибка оплаты</p>
                            <p className="text-firm-gray text-xs sm:text-sm mt-2 px-4">{errorMessage}</p>
                            <button onClick={resetPayment} className="mt-6 px-5 sm:px-6 py-2 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition font-medium text-sm sm:text-base">Попробовать снова</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}