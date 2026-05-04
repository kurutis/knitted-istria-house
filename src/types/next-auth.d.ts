import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            roleSelected?: boolean;
            phone?: string;
            city?: string;
            is_verified?: boolean;
            is_partner?: boolean;
            is_banned?: boolean;
            requiresRoleSelection?: boolean;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        id: string;
        role: string;
        role_selected?: boolean;
        phone?: string;
        city?: string;
        is_verified?: boolean;
        is_partner?: boolean;
        is_banned?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        roleSelected?: boolean;
        phone?: string;
        city?: string;
        is_verified?: boolean;
        is_partner?: boolean;
        is_banned?: boolean;
        requiresRoleSelection?: boolean;
        name?: string;
        image?: string;
    }
}