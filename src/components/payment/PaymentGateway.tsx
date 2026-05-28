// src/components/payment/PaymentGateway.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCardIcon, SmartphoneIcon, BanknotesIcon, BuildingIcon } from '@/components/icons/PaymentIcons';

interface PaymentGatewayProps {
    amount: number;
    orderId: string;
    onSuccess: () => void;
    onCancel?: () => void;
}

interface PaymentProvider {
    id: string;
    name: string;
    icon: string;
    description: string;
    commission: string;
    popular?: boolean;
}

const paymentProviders: PaymentProvider[] = [
    { 
        id: 'yookassa', 
        name: 'ЮKassa', 
        icon: 'Я',
        description: 'Банковские карты, СБП, Apple Pay',
        commission: '2.8%'
    },
    { 
        id: 'tinkoff', 
        name: 'Тинькофф Касса', 
        icon: 'Т',
        description: 'Карты, Рассрочка, Кредит',
        commission: '2.5%',
        popular: true
    },
    { 
        id: 'sbp', 
        name: 'СБП (Система быстрых платежей)', 
        icon: '📱',
        description: 'Оплата по QR-коду через приложение банка',
        commission: '0.4%'
    },
    { 
        id: 'sberbank', 
        name: 'Сбербанк Онлайн', 
        icon: '🟢',
        description: 'По реквизитам или СБП',
        commission: '2.9%'
    },
    { 
        id: 'cash', 
        name: 'Наличные', 
        icon: '💵',
        description: 'При получении курьеру или в пункте выдачи',
        commission: '0%'
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-firm-orange to-firm-pink p-4">
                <h3 className="text-white font-semibold text-lg text-center">
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
                                <p className="text-sm text-gray-500 mt-1">К оплате</p>
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                {paymentProviders.map(provider => (
                                    <label
                                        key={provider.id}
                                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                                            selectedProvider === provider.id
                                                ? 'border-firm-orange bg-orange-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                            selectedProvider === provider.id
                                                ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {provider.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{provider.name}</p>
                                                {provider.popular && (
                                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                                        Популярный
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">{provider.description}</p>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            комиссия {provider.commission}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {errorMessage && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                {onCancel && (
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                                    >
                                        Отмена
                                    </button>
                                )}
                                <button
                                    onClick={handlePayment}
                                    disabled={!selectedProvider}
                                    className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Оплатить
                                </button>
                            </div>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                🔐 Демонстрация работы платежных систем РФ
                            </p>
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
                            <p className="text-gray-700 font-medium">Обработка платежа...</p>
                            <p className="text-sm text-gray-400 mt-2">
                                {selectedProvider === 'yookassa' && 'Соединение с ЮKassa...' ||
                                 selectedProvider === 'tinkoff' && 'Соединение с Тинькофф Касса...' ||
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
                                            <SmartphoneIcon size={48} color="#D97C8E" />
                                            <p className="text-xs text-gray-500 mt-2">Демо-режим</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="font-semibold text-green-600">Оплата через СБП</p>
                            <p className="text-sm text-gray-500 mt-2">
                                Отсканируйте QR-код в приложении вашего банка
                            </p>
                            <p className="text-xs text-gray-400 mt-4">
                                Сумма: {amount.toLocaleString()} ₽
                            </p>
                            <button
                                onClick={() => setStep('success')}
                                className="mt-4 px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
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
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-3xl">✅</span>
                            </div>
                            <p className="text-green-600 font-bold text-lg">Платеж успешно завершен!</p>
                            <p className="text-gray-600 mt-1">Спасибо за покупку</p>
                            <p className="text-xs text-gray-400 mt-2">
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
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-3xl">❌</span>
                            </div>
                            <p className="text-red-600 font-semibold">Ошибка оплаты</p>
                            <p className="text-gray-600 text-sm mt-2">{errorMessage}</p>
                            <button
                                onClick={resetPayment}
                                className="mt-4 px-6 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition"
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