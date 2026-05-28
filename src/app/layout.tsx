import type { Metadata } from "next"
import { Raleway, Montserrat_Alternates } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import AppLayout from "@/components/layout/AppLayout"
import ErrorHandler from "@/components/ErrorHandler"

const raleway = Raleway({
    subsets: ['cyrillic', 'latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-raleway',
})

const montserratAlternates = Montserrat_Alternates({
    subsets: ['cyrillic', 'latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-montserrat-alternates',
})

export const metadata: Metadata = { 
    title: "Дом Вязанных Историй",
    description: "Платформа для продвижения авторских вязанных изделий",
    icons: {
        icon: '/logo.svg',
    },
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode;}>) {
    return (
        <html lang="ru">
            <body className={`${raleway.variable} ${montserratAlternates.variable}`}>
                <ErrorHandler />
                <Providers>
                    <AppLayout>
                        {children}
                    </AppLayout>
                </Providers>
            </body>
        </html>
    );
}