import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Providers } from "./providers"
import AppLayout from "@/components/layout/AppLayout"

const raleway = localFont({
    src: [
        {
            path: "../fonts/Raleway/static/Raleway-Regular.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../fonts/Raleway/static/Raleway-Medium.ttf",
            weight: "500",
            style: "normal",
        },
        {
            path: "../fonts/Raleway/static/Raleway-SemiBold.ttf",
            weight: "600",
            style: "normal",
        },
        {
            path: "../fonts/Raleway/static/Raleway-Bold.ttf",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-raleway",
})

const montserratAlternates = localFont({
    src: [
        {
            path: "../fonts/Montserrat_Alternates/MontserratAlternates-Regular.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../fonts/Montserrat_Alternates/MontserratAlternates-Medium.ttf",
            weight: "500",
            style: "normal",
        },
        {
            path: "../fonts/Montserrat_Alternates/MontserratAlternates-SemiBold.ttf",
            weight: "600",
            style: "normal",
        },
        {
            path: "../fonts/Montserrat_Alternates/MontserratAlternates-Bold.ttf",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-montserrat-alternates",
})

export const metadata: Metadata = { 
    title: "Дом Вязанных Историй",
    description: "Платформа для продвижения авторских вязанных изделий",
    icons: {
        icon: '/logo.svg',
    },
};

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
    return (
        <html lang="ru">
            <body className={`${raleway.variable} ${montserratAlternates.variable}`}>
                <Providers>
                    <AppLayout>
                        {children}
                    </AppLayout>
                </Providers>
            </body>
        </html>
    );
}