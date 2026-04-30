import { supabase } from './supabase'

// Загрузка аватара
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `${userId}/${fileName}`

        const { error, data } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (error) throw error

        // Получаем публичный URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        return publicUrl
    } catch (error) {
        console.error('Error uploading avatar:', error)
        return null
    }
}

// Загрузка изображений товаров
export async function uploadProductImages(productId: string, files: File[]): Promise<string[]> {
    const urls: string[] = []
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${productId}/${Date.now()}-${i}.${fileExt}`
        
        const { error } = await supabase.storage
            .from('products')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (!error) {
            const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(fileName)
            urls.push(publicUrl)
        }
    }
    
    return urls
}

// Загрузка изображений блога
export async function uploadBlogImages(postId: string, files: File[]): Promise<string[]> {
    const urls: string[] = []
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${postId}/${Date.now()}-${i}.${fileExt}`
        
        const { error } = await supabase.storage
            .from('blog')
            .upload(fileName, file)

        if (!error) {
            const { data: { publicUrl } } = supabase.storage
                .from('blog')
                .getPublicUrl(fileName)
            urls.push(publicUrl)
        }
    }
    
    return urls
}

// Удаление файла
export async function deleteFile(bucket: string, filePath: string): Promise<boolean> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath])
        
        if (error) throw error
        return true
    } catch (error) {
        console.error('Error deleting file:', error)
        return false
    }
}

// Удаление всех файлов папки
export async function deleteFolder(bucket: string, folderPath: string): Promise<boolean> {
    try {
        const { data: files } = await supabase.storage
            .from(bucket)
            .list(folderPath)
        
        if (files && files.length > 0) {
            const filePaths = files.map(file => `${folderPath}/${file.name}`)
            const { error } = await supabase.storage
                .from(bucket)
                .remove(filePaths)
            
            if (error) throw error
        }
        return true
    } catch (error) {
        console.error('Error deleting folder:', error)
        return false
    }
}