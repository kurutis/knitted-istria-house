// src/components/payment/PaymentGateway.tsx
'use client';

import { useState } from 'react';
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

const paymentProviders: PaymentProvider[] = [
    { 
        id: 'yookassa', 
        name: 'ЮKassa', 
        icon: <YooKassaIcon size={32} />,
        description: 'Банковские карты, СБП, Apple Pay',
        commission: '2.8%'
    },
    { 
        id: 'tinkoff', 
        name: 'Т-Банк', 
        icon: <TBankIcon size={32} />,
        description: 'Карты, Рассрочка, Кредит',
        commission: '2.5%',
        popular: true
    },
    { 
        id: 'sbp', 
        name: 'СБП (Система быстрых платежей)', 
        icon: <SBPIcon size={32} />,
        description: 'Оплата по QR-коду через приложение банка',
        commission: '0.4%'
    },
    { 
        id: 'sberbank', 
        name: 'Сбербанк Онлайн', 
        icon: <SberIcon size={32} />,
        description: 'По реквизитам или СБП',
        commission: '2.9%'
    }
];

type PaymentStep = 'select' | 'processing' | 'qr' | 'success' | 'error';

export default function PaymentGateway({ amount, orderId, onSuccess, onCancel }: PaymentGatewayProps) {
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [step, setStep] = useState<PaymentStep>('select');
    const [errorMessage, setErrorMessage] = useState('');
    const [qrCode, setQrCode] = useState('');

    const handlePayment = async () => {
        if (!selectedProvider) {
            setErrorMessage('Выберите способ оплаты');
            return;
        }

        setStep('processing');
        setErrorMessage('');

        try {
            const response = await fetch('/api/payments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId, 
                    amount, 
                    provider: selectedProvider 
                })
            });

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
            {/* Header */}
            <div className="bg-gradient-to-r from-firm-orange to-firm-pink p-4">
                <h3 className="text-main font-semibold text-lg text-center">
                    Оплата заказа
                </h3>
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {/* Шаг 1: Выбор провайдера */}
                    {step === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-4"
                        >
                            <div className="text-center mb-6">
                                <p className="text-3xl font-bold text-firm-orange">
                                    {amount.toLocaleString()} ₽
                                </p>
                                <p className="text-sm text-firm-gray mt-1">К оплате</p>
                            </div>

                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {paymentProviders.map(provider => (
                                    <label
                                        key={provider.id}
                                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                                            selectedProvider === provider.id
                                                ? 'border-firm-orange bg-firm-orange/5'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-main'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="provider"
                                            value={provider.id}
                                            checked={selectedProvider === provider.id}
                                            onChange={() => setSelectedProvider(provider.id)}
                                            className="w-4 h-4 accent-firm-orange"
                                        />
                                        <div className="w-12 h-12 flex items-center justify-center">
                                            {provider.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-text">{provider.name}</p>
                                                {provider.popular && (
                                                    <span className="text-xs px-2 py-0.5 bg-firm-orange/10 text-firm-orange rounded-full">
                                                        Популярный
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-firm-gray mt-0.5">{provider.description}</p>
                                        </div>
                                        <span className="text-xs text-firm-gray">
                                            комиссия {provider.commission}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {errorMessage && (
                                <div className="bg-red-50 text-firm-red p-3 rounded-xl text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                {onCancel && (
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-text"
                                    >
                                        Отмена
                                    </button>
                                )}
                                <button
                                    onClick={handlePayment}
                                    disabled={!selectedProvider}
                                    className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Оплатить
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-xs text-firm-gray text-center mt-4">
                                <LockIcon color="#9CA3AF" size={14} />
                                <span>Безопасная оплата через платежные системы РФ</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Шаг 2: Обработка платежа */}
                    {step === 'processing' && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-8"
                        >
                            <div className="inline-block">
                                <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            </div>
                            <p className="text-text font-medium">Обработка платежа...</p>
                            <p className="text-sm text-firm-gray mt-2">
                                {selectedProvider === 'yookassa' && 'Соединение с ЮKassa...' ||
                                 selectedProvider === 'tinkoff' && 'Соединение с Т-Банк...' ||
                                 selectedProvider === 'sbp' && 'Генерация QR-кода...' ||
                                 selectedProvider === 'sberbank' && 'Соединение со Сбербанк Онлайн...' ||
                                 'Пожалуйста, подождите'}
                            </p>
                        </motion.div>
                    )}

                    {/* Шаг 3: QR-код для СБП */}
                    {step === 'qr' && (
                        <motion.div
                            key="qr"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6"
                        >
                            <div className="bg-gray-100 rounded-2xl p-6 inline-block mb-4">
                                <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center">
                                    {qrCode ? (
                                        <img src={qrCode} alt="QR-код для оплаты" className="w-40 h-40" />
                                    ) : (
                                        <div className="text-center">
                                            <SBPIcon size={48} />
                                            <p className="text-xs text-firm-gray mt-2">Демо-режим</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="font-semibold text-firm-green">Оплата через СБП</p>
                            <p className="text-sm text-firm-gray mt-2">
                                Отсканируйте QR-код в приложении вашего банка
                            </p>
                            <p className="text-xs text-firm-gray mt-4">
                                Сумма: {amount.toLocaleString()} ₽
                            </p>
                            <button
                                onClick={() => setStep('success')}
                                className="mt-4 px-6 py-2 bg-firm-green text-main rounded-xl hover:bg-green-600 transition font-medium"
                            >
                                Я оплатил(а)
                            </button>
                        </motion.div>
                    )}

                    {/* Шаг 4: Успешная оплата */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8"
                        >
                            <div className="flex justify-center mb-4">
                                <CheckCircleIcon size={64} color="#22C55E" />
                            </div>
                            <p className="text-firm-green font-bold text-lg">Платеж успешно завершен!</p>
                            <p className="text-firm-gray mt-1">Спасибо за покупку</p>
                            <p className="text-xs text-firm-gray mt-2">
                                Номер заказа будет отправлен на вашу почту
                            </p>
                        </motion.div>
                    )}

                    {/* Шаг 5: Ошибка */}
                    {step === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8"
                        >
                            <div className="flex justify-center mb-4">
                                <ErrorCircleIcon size={64} color="#EF4444" />
                            </div>
                            <p className="text-firm-red font-semibold">Ошибка оплаты</p>
                            <p className="text-firm-gray text-sm mt-2">{errorMessage}</p>
                            <button
                                onClick={resetPayment}
                                className="mt-4 px-6 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition font-medium"
                            >
                                Попробовать снова
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}