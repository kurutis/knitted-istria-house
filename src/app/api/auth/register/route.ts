import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try{
        console.log("=== REGISTRATION START ===");
        
        const body = await request.json();
        console.log("Request body:", JSON.stringify(body, null, 2));
        
        const {name, email, phone, city, password, role, newsletterAgreement, smsCode} = body;

        console.log("Validating fields:", {name, email, phone, password});
        
        if (!email || !password || !name || !phone){
            console.log("Missing required fields");
            return NextResponse.json(
                {error: 'Все обязательные поля должны быть заполнены'}, 
                {status: 400}
            );
        }

        if (password.length < 6){
            console.log("Password too short");
            return NextResponse.json({error: 'Пароль должен быть не менее 6 символов'}, {status: 400});
        }

        console.log("Checking existing user for email:", email);
        
        // Проверяем существующего пользователя
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error("Error checking user:", checkError);
            return NextResponse.json({error: 'Ошибка проверки пользователя'}, {status: 500});
        }

        if(existingUser){
            console.log("User already exists:", email);
            return NextResponse.json({error: 'Пользователь с таким email уже существует'}, {status: 400});
        }

        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const now = new Date().toISOString();
        const userRole = role || 'buyer';
        const userCity = city || 'Москва';
        
        console.log("Creating user with data:", {name, email, phone, city: userCity, role: userRole, newsletterAgreement: newsletterAgreement || false});
        
        // Создаем пользователя
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: hashedPassword,
                role: userRole,
                role_selected: false,
                created_at: now,
                updated_at: now
            })
            .select('id, email, role, created_at')
            .single()

        if (createError) {
            console.error("Error creating user:", createError);
            return NextResponse.json({error: 'Ошибка создания пользователя: ' + createError.message}, {status: 500});
        }

        console.log("User created successfully:", newUser.id);

        // Создаем профиль пользователя
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                user_id: newUser.id,
                full_name: name,
                phone: phone,
                city: userCity,
                newsletter_agreement: newsletterAgreement || false,
                sms_code: '1111',
                sms_code_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                created_at: now,
                updated_at: now
            })

        if (profileError) {
            console.error("Error creating profile:", profileError);
            // Пробуем удалить созданного пользователя
            await supabase.from('users').delete().eq('id', newUser.id);
            return NextResponse.json({error: 'Ошибка создания профиля'}, {status: 500});
        }

        // Если роль "master", создаем запись в таблице masters
        if (userRole === 'master') {
            const { error: masterError } = await supabase
                .from('masters')
                .insert({
                    user_id: newUser.id,
                    created_at: now,
                    updated_at: now
                })

            if (masterError) {
                console.error("Error creating master record:", masterError);
                // Не удаляем пользователя, просто логируем
            }
        }
        
        return NextResponse.json({
            message: "Регистрация успешна",
            userId: newUser.id,
            testSmsCode: '1111'
        }, {status: 200});
        
    } catch(error: any){
        console.error("=== REGISTRATION ERROR ===");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Full error:", error);
        
        return NextResponse.json(
            {error: 'Ошибка регистрации: ' + error.message}, 
            {status: 500}
        );
    }
}