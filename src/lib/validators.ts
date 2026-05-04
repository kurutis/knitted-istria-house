// lib/validation.ts
import { z } from 'zod';

// ============================================
// Общие валидаторы
// ============================================

// Валидация UUID
export const uuidSchema = z.string().uuid('Неверный формат ID');

// Валидация email
export const emailSchema = z
    .string()
    .email('Неверный формат email')
    .min(5, 'Email слишком короткий')
    .max(255, 'Email слишком длинный')
    .transform(val => val.toLowerCase().trim());

// Валидация телефона (российские номера)
export const phoneSchema = z
    .string()
    .regex(
        /^(\+7|7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
        'Неверный формат телефона'
    )
    .optional()
    .nullable()
    .transform(val => val?.replace(/[^0-9]/g, '') || null);

// Валидация пароля
export const passwordSchema = z
    .string()
    .min(6, 'Пароль должен быть не менее 6 символов')
    .max(100, 'Пароль слишком длинный')
    .regex(/[A-Za-z]/, 'Пароль должен содержать хотя бы одну букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру');

// Валидация имени
export const nameSchema = z
    .string()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(100, 'Имя не может превышать 100 символов')
    .regex(/^[a-zA-Zа-яА-Я\s-]+$/, 'Имя может содержать только буквы, пробелы и дефисы')
    .transform(val => val.trim());

// Валидация города
export const citySchema = z
    .string()
    .min(2, 'Город обязателен')
    .max(100, 'Название города слишком длинное')
    .regex(/^[a-zA-Zа-яА-Я\s-]+$/, 'Название города может содержать только буквы')
    .transform(val => val.trim());

// Валидация адреса
export const addressSchema = z
    .string()
    .max(200, 'Адрес слишком длинный')
    .optional()
    .nullable()
    .transform(val => val?.trim() || null);

// ============================================
// Аутентификация
// ============================================

// Валидация регистрации
export const registerSchema = z.object({
    name: nameSchema,
    email: emailSchema.optional(),
    phone: phoneSchema,
    city: citySchema,
    password: passwordSchema,
    role: z.enum(['buyer', 'master'], {
        message: 'Выберите роль'
    }),
    newsletterAgreement: z.boolean().optional().default(false),
});

// Валидация входа
export const signInSchema = z.object({
    identifier: z.string().min(3, 'Введите email или телефон'),
    password: z.string().min(1, 'Введите пароль'),
});

// Валидация сброса пароля
export const resetPasswordSchema = z.object({
    email: emailSchema,
});

// Валидация обновления пароля
export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Подтвердите пароль'),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
});

// ============================================
// Профиль
// ============================================

// Валидация обновления профиля
export const updateProfileSchema = z.object({
    fullname: nameSchema,
    phone: phoneSchema,
    city: citySchema.optional(),
    address: addressSchema,
    newsletterAgreement: z.boolean().optional(),
});

// Валидация обновления профиля мастера
export const updateMasterProfileSchema = updateProfileSchema.extend({
    description: z.string().max(2000, 'Описание не может превышать 2000 символов').optional().nullable(),
    customOrdersEnabled: z.boolean().optional(),
});

// ============================================
// Товары
// ============================================

// Валидация товара
export const productSchema = z.object({
    title: z.string()
        .min(3, 'Название минимум 3 символа')
        .max(255, 'Название не может превышать 255 символов'),
    description: z.string()
        .max(5000, 'Описание не может превышать 5000 символов')
        .optional()
        .nullable(),
    price: z.number()
        .positive('Цена должна быть положительной')
        .max(10000000, 'Цена не может превышать 10 000 000 ₽'),
    category: z.string().min(1, 'Выберите категорию'),
    technique: z.string().max(100).optional().nullable(),
    size: z.string().max(100).optional().nullable(),
    color: z.string().max(50).optional().nullable(),
    careInstructions: z.string().max(1000).optional().nullable(),
    stockQuantity: z.number().int().min(0).max(9999).optional().nullable(),
    isAvailable: z.boolean().optional().default(true),
});

// Валидация обновления товара
export const updateProductSchema = productSchema.partial();

// ============================================
// Комментарии и отзывы
// ============================================

// Валидация комментария
export const commentSchema = z.object({
    content: z.string()
        .min(1, 'Комментарий не может быть пустым')
        .max(1000, 'Комментарий не может превышать 1000 символов'),
});

// Валидация отзыва
export const reviewSchema = z.object({
    rating: z.number()
        .min(1, 'Оценка должна быть от 1 до 5')
        .max(5, 'Оценка должна быть от 1 до 5'),
    comment: z.string()
        .max(500, 'Комментарий не может превышать 500 символов')
        .optional()
        .nullable(),
});

// ============================================
// Мастер-классы
// ============================================

// Валидация мастер-класса
export const masterClassSchema = z.object({
    title: z.string().min(3, 'Название минимум 3 символа').max(200),
    description: z.string().min(10, 'Описание минимум 10 символов').max(5000),
    type: z.enum(['online', 'offline', 'hybrid'], {
        message: 'Выберите тип мастер-класса'
    }),
    price: z.number().min(0, 'Цена не может быть отрицательной').max(100000),
    maxParticipants: z.number().int().min(1, 'Минимум 1 участник').max(1000),
    dateTime: z.string().datetime({ message: 'Неверный формат даты' }),
    durationMinutes: z.number().int().min(15, 'Минимум 15 минут').max(480),
    location: z.string().max(200).optional().nullable(),
    onlineLink: z.string().url('Неверный формат ссылки').optional().nullable(),
    materials: z.string().max(2000).optional().nullable(),
}).refine(data => {
    if (data.type === 'online' && !data.onlineLink) {
        return false;
    }
    if (data.type === 'offline' && !data.location) {
        return false;
    }
    return true;
}, {
    message: 'Для онлайн МК требуется ссылка, для офлайн - адрес',
    path: ['type'],
});

// ============================================
// Блог
// ============================================

// Валидация поста блога
export const blogPostSchema = z.object({
    title: z.string().min(3, 'Заголовок минимум 3 символа').max(200),
    content: z.string().min(10, 'Содержание минимум 10 символов').max(50000),
    excerpt: z.string().max(500).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    status: z.enum(['draft', 'published']).default('draft'),
});

// ============================================
// Заказы
// ============================================

// Валидация создания заказа
export const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: uuidSchema,
        quantity: z.number().int().min(1).max(99),
    })).min(1, 'Добавьте хотя бы один товар'),
    shippingAddress: addressSchema,
    shippingCity: citySchema,
    shippingPostalCode: z.string().regex(/^\d{5,6}$/, 'Неверный формат индекса').optional(),
    paymentMethod: z.enum(['card', 'cash', 'online']),
    notes: z.string().max(500).optional().nullable(),
});

// Валидация обновления статуса заказа
export const updateOrderStatusSchema = z.object({
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'completed']),
    trackingNumber: z.string().max(100).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
});

// ============================================
// Индивидуальные заказы
// ============================================

// Валидация запроса на индивидуальный заказ
export const customRequestSchema = z.object({
    masterId: uuidSchema,
    name: nameSchema,
    email: emailSchema,
    description: z.string().min(10, 'Опишите подробнее, что вы хотите').max(5000),
    budget: z.number().min(100, 'Бюджет не может быть менее 100 ₽').max(1000000).optional().nullable(),
});

// ============================================
// Поиск и фильтрация
// ============================================

// Валидация параметров поиска
export const searchParamsSchema = z.object({
    query: z.string().min(1).max(100),
    category: z.string().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    sort: z.enum(['newest', 'popular', 'price_asc', 'price_desc', 'rating']).default('newest'),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
});

// ============================================
// Вспомогательные функции
// ============================================

// Функция для валидации с человеческими ошибками
export async function validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
    try {
        const validated = await schema.parseAsync(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map(err => err.message);
            return { success: false, errors };
        }
        return { success: false, errors: ['Ошибка валидации'] };
    }
}

// Утилита для получения первого сообщения об ошибке
export function getFirstErrorMessage(error: unknown): string {
    if (error instanceof z.ZodError) {
        return error.issues[0]?.message || 'Ошибка валидации';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Неизвестная ошибка';
}

// Экспорт всех схем
export const validators = {
    uuid: uuidSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    name: nameSchema,
    city: citySchema,
    address: addressSchema,
    register: registerSchema,
    signIn: signInSchema,
    resetPassword: resetPasswordSchema,
    updatePassword: updatePasswordSchema,
    updateProfile: updateProfileSchema,
    updateMasterProfile: updateMasterProfileSchema,
    product: productSchema,
    updateProduct: updateProductSchema,
    comment: commentSchema,
    review: reviewSchema,
    masterClass: masterClassSchema,
    blogPost: blogPostSchema,
    createOrder: createOrderSchema,
    updateOrderStatus: updateOrderStatusSchema,
    customRequest: customRequestSchema,
    searchParams: searchParamsSchema,
};