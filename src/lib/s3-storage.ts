import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'ru-7',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
});

export async function uploadToS3(
    file: File,
    folder: string,
    id: string
): Promise<string | null> {
    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const key = `${folder}/${id}-${timestamp}.${fileExt}`;
        
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            ACL: 'public-read',
        });
        
        await s3Client.send(command);
        
        // Используем ваш публичный URL
        return `https://30bd5b8c-136d-48e3-b7c1-71a168d4fef4.selstorage.ru/${key}`;
    } catch (error) {
        console.error('S3 upload error:', error);
        return null;
    }
}

export async function deleteFromS3(fileUrl: string): Promise<boolean> {
    try {
        // Определяем ключ из URL в зависимости от формата
        let key: string | null = null;
        
        // Для публичного URL вида: https://30bd5b8c-136d-48e3-b7c1-71a168d4fef4.selstorage.ru/avatars/...
        if (fileUrl.includes('selstorage.ru')) {
            const parts = fileUrl.split('selstorage.ru/');
            if (parts.length > 1) {
                key = parts[1];
            }
        }
        // Для старого формата (если остались)
        else if (fileUrl.includes('s3.ru-7.storage.selcloud.ru')) {
            const parts = fileUrl.split('.s3.ru-7.storage.selcloud.ru/');
            if (parts.length > 1) {
                key = parts[1];
            }
        }
        
        if (!key) {
            console.error('Could not extract key from URL:', fileUrl);
            return false;
        }
        
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: key,
        });
        
        await s3Client.send(command);
        console.log('Deleted from S3:', key);
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        return false;
    }
}

// Дополнительная функция для удаления по ключу (без парсинга URL)
export async function deleteFromS3ByKey(key: string): Promise<boolean> {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: key,
        });
        
        await s3Client.send(command);
        console.log('Deleted from S3 by key:', key);
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        return false;
    }
}