import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import AppLayout from "@/components/layout/AppLayout"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { 
    title: "Дом Вязанных Историй",
    description: "Платформа для продвижения авторских вязанных изделий"
};

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
    return (
        <html lang="ru">
            <body className={inter.className}>
                <Providers>
                    <AppLayout>
                        {children}
                    </AppLayout>
                </Providers>
            </body>
        </html>
    );
}