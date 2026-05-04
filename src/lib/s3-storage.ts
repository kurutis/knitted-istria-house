// lib/s3-storage.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { logError, logInfo } from './error-logger';

// Конфигурация
const S3_CONFIG = {
    region: process.env.S3_REGION || 'ru-7',
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET!,
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,
    publicUrl: process.env.S3_PUBLIC_URL || 'https://30bd5b8c-136d-48e3-b7c1-71a168d4fef4.selstorage.ru',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
};

// Проверка конфигурации
function validateConfig(): boolean {
    const required = ['bucket', 'accessKey', 'secretKey'];
    const missing = required.filter(key => !S3_CONFIG[key as keyof typeof S3_CONFIG]);
    
    if (missing.length > 0) {
        logError('S3 configuration missing', new Error(`Missing: ${missing.join(', ')}`));
        return false;
    }
    return true;
}

// Создание клиента S3
const s3Client = new S3Client({
    region: S3_CONFIG.region,
    endpoint: S3_CONFIG.endpoint,
    credentials: {
        accessKeyId: S3_CONFIG.accessKey,
        secretAccessKey: S3_CONFIG.secretKey,
    },
    forcePathStyle: true,
    maxAttempts: 3,
    retryMode: 'adaptive',
});

// Генерация ключа файла
function generateKey(folder: string, id: string, originalName: string): string {
    const timestamp = Date.now();
    const fileExt = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedFileName = originalName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 50);
    return `${folder}/${id}/${timestamp}-${sanitizedFileName}.${fileExt}`;
}

// Получение публичного URL
function getPublicUrl(key: string): string {
    return `${S3_CONFIG.publicUrl}/${key}`;
}

// Извлечение ключа из URL
function extractKeyFromUrl(url: string): string | null {
    try {
        // Для публичного URL
        if (url.includes(S3_CONFIG.publicUrl)) {
            const parts = url.split(`${S3_CONFIG.publicUrl}/`);
            if (parts.length > 1) return parts[1];
        }
        
        // Для старого формата
        if (url.includes('selstorage.ru')) {
            const parts = url.split('selstorage.ru/');
            if (parts.length > 1) return parts[1];
        }
        
        // Для endpoint URL
        if (S3_CONFIG.endpoint && url.includes(S3_CONFIG.endpoint)) {
            const parts = url.split(`${S3_CONFIG.endpoint}/${S3_CONFIG.bucket}/`);
            if (parts.length > 1) return parts[1];
        }
        
        return null;
    } catch (error) {
        logError('Error extracting key from URL', error, 'warning');
        return null;
    }
}

// Проверка существования файла
async function fileExists(key: string): Promise<boolean> {
    try {
        const command = new HeadObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: key,
        });
        await s3Client.send(command);
        return true;
    } catch (error) {
        return false;
    }
}

// Валидация файла
function validateFile(file: File): { valid: boolean; error?: string } {
    if (!file || file.size === 0) {
        return { valid: false, error: 'Файл не выбран' };
    }
    
    if (file.size > S3_CONFIG.maxFileSize) {
        return { valid: false, error: `Файл слишком большой. Максимум ${S3_CONFIG.maxFileSize / 1024 / 1024}MB` };
    }
    
    if (!S3_CONFIG.allowedMimeTypes.includes(file.type)) {
        return { valid: false, error: `Неподдерживаемый тип файла. Разрешены: ${S3_CONFIG.allowedMimeTypes.join(', ')}` };
    }
    
    return { valid: true };
}

// Загрузка файла в S3
export async function uploadToS3(
    file: File,
    folder: string,
    id: string,
    options?: {
        onProgress?: (progress: number) => void;
        contentType?: string;
    }
): Promise<string | null> {
    const startTime = Date.now();
    
    try {
        if (!validateConfig()) return null;
        
        const validation = validateFile(file);
        if (!validation.valid) {
            logError('File validation failed', new Error(validation.error), 'warning');
            return null;
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = generateKey(folder, id, file.name);
        const contentType = options?.contentType || file.type;
        
        const command = new PutObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000', // 1 год кэширования
            Metadata: {
                originalName: encodeURIComponent(file.name),
                uploadedAt: new Date().toISOString(),
                size: buffer.length.toString()
            }
        });
        
        await s3Client.send(command);
        
        const publicUrl = getPublicUrl(key);
        
        logInfo('File uploaded to S3', {
            key,
            folder,
            size: buffer.length,
            type: contentType,
            duration: Date.now() - startTime
        });
        
        return publicUrl;
    } catch (error) {
        logError('S3 upload error', error);
        return null;
    }
}

// Удаление файла из S3 по URL
export async function deleteFromS3(fileUrl: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
        if (!validateConfig()) return false;
        
        const key = extractKeyFromUrl(fileUrl);
        if (!key) {
            logError('Could not extract key from URL', new Error(`Invalid URL: ${fileUrl}`), 'warning');
            return false;
        }
        
        // Проверяем существование файла перед удалением
        const exists = await fileExists(key);
        if (!exists) {
            logInfo('File does not exist, skipping deletion', { key });
            return true;
        }
        
        const command = new DeleteObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: key,
        });
        
        await s3Client.send(command);
        
        logInfo('File deleted from S3', {
            key,
            url: fileUrl.substring(0, 100),
            duration: Date.now() - startTime
        });
        
        return true;
    } catch (error) {
        logError('S3 delete error', error);
        return false;
    }
}

// Удаление файла по ключу
export async function deleteFromS3ByKey(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
        if (!validateConfig()) return false;
        
        const command = new DeleteObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: key,
        });
        
        await s3Client.send(command);
        
        logInfo('File deleted from S3 by key', {
            key,
            duration: Date.now() - startTime
        });
        
        return true;
    } catch (error) {
        logError('S3 delete error', error);
        return false;
    }
}

// Удаление всех файлов в папке
export async function deleteFolder(folder: string): Promise<{ deleted: number; failed: number }> {
    const startTime = Date.now();
    let deleted = 0;
    let failed = 0;
    
    try {
        if (!validateConfig()) return { deleted, failed };
        
        // Получаем список файлов в папке
        const listCommand = new ListObjectsV2Command({
            Bucket: S3_CONFIG.bucket,
            Prefix: folder,
        });
        
        const listedObjects = await s3Client.send(listCommand);
        
        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return { deleted, failed };
        }
        
        // Удаляем файлы
        for (const object of listedObjects.Contents) {
            if (object.Key) {
                const success = await deleteFromS3ByKey(object.Key);
                if (success) {
                    deleted++;
                } else {
                    failed++;
                }
            }
        }
        
        logInfo('Folder deleted from S3', {
            folder,
            deleted,
            failed,
            duration: Date.now() - startTime
        });
        
        return { deleted, failed };
    } catch (error) {
        logError('S3 delete folder error', error);
        return { deleted, failed };
    }
}

// Получение информации о файле
export async function getFileInfo(key: string): Promise<{ size: number; lastModified: Date; contentType: string } | null> {
    try {
        if (!validateConfig()) return null;
        
        const command = new HeadObjectCommand({
            Bucket: S3_CONFIG.bucket,
            Key: key,
        });
        
        const result = await s3Client.send(command);
        
        return {
            size: result.ContentLength || 0,
            lastModified: result.LastModified || new Date(),
            contentType: result.ContentType || 'unknown'
        };
    } catch (error) {
        logError('S3 get file info error', error, 'warning');
        return null;
    }
}

// Проверка доступности S3
export async function checkS3Connection(): Promise<boolean> {
    try {
        if (!validateConfig()) return false;
        
        const command = new ListObjectsV2Command({
            Bucket: S3_CONFIG.bucket,
            MaxKeys: 1,
        });
        
        await s3Client.send(command);
        return true;
    } catch (error) {
        logError('S3 connection check failed', error);
        return false;
    }
}

// Экспорт конфигурации для использования в других модулях
export const s3Config = {
    maxFileSize: S3_CONFIG.maxFileSize,
    allowedMimeTypes: S3_CONFIG.allowedMimeTypes,
    isConfigured: validateConfig()
};