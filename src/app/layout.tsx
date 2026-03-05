import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "@/components/layout/header"
import { Providers } from "./providers"


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Дом Вязанных Историй",
  description: "Платформа для продвижения авторских вязанных изделий",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
      <html lang="ru">
        <body className={inter.className}>
          <Providers>
            <Header />
            <main className="container mx-auto">
              {children}
            </main>
          </Providers>
        </body>
      </html>
    );
  }