// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface ProfileData {
    updated_at: string;
    full_name?: string | null;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    newsletter_agreement?: boolean;
    avatar_url?: string | null;
}

interface ProfileUpdateData {
    updated_at: string;
    full_name?: string | null;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    newsletter_agreement?: boolean;
    avatar_url?: string | null;
}

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту
const putLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 обновлений в минуту

// Валидация телефона
function validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!phone) return { valid: true };
    const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    if (!phoneRegex.test(phone)) {
        return { valid: false, error: 'Неверный формат телефона' };
    }
    return { valid: true };
}

function validateName(name: string): { valid: boolean; error?: string } {
    if (!name) return { valid: true };
    if (name.length < 2) {
        return { valid: false, error: 'Имя должно содержать минимум 2 символа' };
    }
    if (name.length > 100) {
        return { valid: false, error: 'Имя не может превышать 100 символов' };
    }
    return { valid: true };
}

function validateCity(city: string): { valid: boolean; error?: string } {
    if (!city) return { valid: true };
    if (city.length > 100) {
        return { valid: false, error: 'Название города не может превышать 100 символов' };
    }
    return { valid: true };
}

function validateAddress(address: string): { valid: boolean; error?: string } {
    if (!address) return { valid: true };
    if (address.length > 200) {
        return { valid: false, error: 'Адрес не может превышать 200 символов' };
    }
    return { valid: true };
}

// GET - получить профиль пользователя
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;

    // Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, role, created_at")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Получаем профиль
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, phone, city, address, avatar_url, newsletter_agreement, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    // Проверяем, существует ли профиль, если нет - создаем
    if (!profile && !profileError) {
      const now = new Date().toISOString();
      await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          created_at: now,
          updated_at: now
        });
      
      // Повторно получаем данные
      const { data: newProfile } = await supabase
        .from("profiles")
        .select("full_name, phone, city, address, avatar_url, newsletter_agreement, created_at, updated_at")
        .eq("user_id", userId)
        .single();
      
      return NextResponse.json({
        success: true,
        profile: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullname: newProfile?.full_name || "",
          phone: newProfile?.phone || "",
          city: newProfile?.city || "",
          address: newProfile?.address || "",
          avatar_url: newProfile?.avatar_url || null,
          newsletter_agreement: newProfile?.newsletter_agreement || false,
          member_since: user.created_at,
          has_profile: true
        }
      });
    }

    // ВАЖНО: Правильно маппим full_name -> fullname
    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullname: profile?.full_name || "",  // ← КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
        phone: profile?.phone || "",
        city: profile?.city || "",
        address: profile?.address || "",
        avatar_url: profile?.avatar_url || null,
        newsletter_agreement: profile?.newsletter_agreement || false,
        member_since: user.created_at,
        has_profile: true
      },
      meta: {
        cached: false,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("Error in user profile API:", error);
    return NextResponse.json({ 
      error: "Внутренняя ошибка сервера" 
    }, { status: 500 });
  }
}

// PUT - обновить профиль пользователя
export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const formData = await request.formData();
        
        const fullname = formData.get('fullname') as string;
        const phone = formData.get('phone') as string;
        const city = formData.get('city') as string;
        const address = formData.get('address') as string;
        const newsletterAgreement = formData.get('newsletterAgreement') === 'true';
        const avatarFile = formData.get('avatar') as File | null;
        const removeAvatar = formData.get('remove_avatar') === 'true';

        // Валидация
        const nameValidation = validateName(fullname);
        if (!nameValidation.valid) {
            return NextResponse.json({ error: nameValidation.error }, { status: 400 });
        }

        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.valid) {
            return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
        }

        const cityValidation = validateCity(city);
        if (!cityValidation.valid) {
            return NextResponse.json({ error: cityValidation.error }, { status: 400 });
        }

        const addressValidation = validateAddress(address);
        if (!addressValidation.valid) {
            return NextResponse.json({ error: addressValidation.error }, { status: 400 });
        }

        // Проверяем размер аватара
        if (avatarFile && avatarFile.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'Аватар не может превышать 5MB' }, { status: 400 });
        }

        if (avatarFile && !avatarFile.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 });
        }

        let avatarUrl: string | null = null;

        // Обработка аватара
        if (removeAvatar) {
            // Получаем старый аватар и удаляем его
            const { data: oldProfile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (oldProfile?.avatar_url) {
                await deleteFromS3(oldProfile.avatar_url).catch(err => 
                    logError('Error deleting old avatar', err, 'warning')
                );
            }
            avatarUrl = null;
        } else if (avatarFile && avatarFile.size > 0) {
            // Получаем старый аватар для удаления
            const { data: oldProfile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (oldProfile?.avatar_url) {
                await deleteFromS3(oldProfile.avatar_url).catch(err => 
                    logError('Error deleting old avatar', err, 'warning')
                );
            }

            // Загружаем новый аватар
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${session.user.id}/avatar.${fileExt}`;
            avatarUrl = await uploadToS3(avatarFile, 'avatars', fileName);
            
            if (!avatarUrl) {
                logError('Failed to upload avatar to S3');
            }
        }

        // Проверяем, существует ли профиль
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        const now = new Date().toISOString();
        const profileData: ProfileUpdateData = {
            updated_at: now
        };

        if (fullname !== undefined) profileData.full_name = fullname?.trim() || null;
        if (phone !== undefined) profileData.phone = phone?.trim() || null;
        if (city !== undefined) profileData.city = city?.trim() || null;
        if (address !== undefined) profileData.address = address?.trim() || null;
        if (newsletterAgreement !== undefined) profileData.newsletter_agreement = newsletterAgreement;
        if (avatarUrl !== null) profileData.avatar_url = avatarUrl;
        if (removeAvatar) profileData.avatar_url = null;

        let error;
        
        if (!existingProfile) {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    user_id: session.user.id,
                    ...profileData,
                    created_at: now
                });
            error = insertError;
        } else {
            const { error: updateError } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('user_id', session.user.id);
            error = updateError;
        }

        if (error) {
            logError('Error updating profile', error);
            return NextResponse.json({ error: 'Ошибка обновления профиля' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(`user_profile_${session.user.id}`);

        logInfo('User profile updated', {
            userId: session.user.id,
            fieldsUpdated: Object.keys(profileData),
            avatarUpdated: !!avatarUrl || removeAvatar,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Профиль успешно обновлен',
            avatar_url: avatarUrl
        }, { status: 200 });
        
    } catch (error) {
        logError('Error updating profile', error);
        return NextResponse.json({ error: 'Ошибка обновления профиля' }, { status: 500 });
    }
}