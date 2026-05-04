import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";

console.log('=== AUTH ROUTE INITIALIZED ===');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };