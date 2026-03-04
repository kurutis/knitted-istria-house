import { db } from "@/lib/db";
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
            return NextResponse.json(
                {error: 'Пароль должен быть не менее 6 символов'}, 
                {status: 400}
            );
        }

        console.log("Checking existing user for email:", email);
        const existingUser = await db.getUserByEmail(email);

        if(existingUser){
            console.log("User already exists:", email);
            return NextResponse.json(
                {error: 'Пользователь с таким email уже существует'}, 
                {status: 400}
            );
        }

        console.log("Hashing password...");
        const hashedPassword  = await bcrypt.hash(password, 10);
        
        console.log("Creating user with data:", {
            name, email, phone, 
            city: city || 'Москва', 
            role: role || 'buyer', 
            newsletterAgreement: newsletterAgreement || false
        });
        
        const user = await db.createUser({
            fullName: name,
            email, 
            password: hashedPassword, 
            phone, 
            city: city || 'Москва', 
            role: role || 'buyer', 
            newsletterAgreement: newsletterAgreement || false
        });

        console.log("User created successfully:", user.id);
        
        return NextResponse.json(
            {
                message: "Регистрация успешна", 
                userId: user.id, 
                testSmsCode: '1111'
            }, 
            {status: 200}
        );
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