"use client";

import Link from "next/link";
import logo from '../../../public/logo.svg'
import Image from "next/image";
import search from '../../../public/search.svg'
import cart from '../../../public/cart.svg'
import favorite from '../../../public/favorites.svg'
import profile from '../../../public/profile.svg'
import { useSession } from "next-auth/react";
import chat from '../../../public/chat.svg'

export default function Header() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'
  const isAuthenticated = !!session?.user
  const isBuyer = session?.user?.role === 'buyer'
  const isMaster = session?.user?.role === 'master'

  return (
    <header className="bg-main h-[10vh] flex items-center">
      <nav className="ml-[5%] w-[90%] mr-[5%]">
        <div className="flex justify-between items-center">
          <div className="flex gap-5 items-center"> 
            <Image className="w-20 h-20" src={logo} alt="logo" />
            <Link className="w-40 font-['Montserrat_Alternates'] text-m font-bold text-firm-pink" href="/">Дом <span className="text-firm-orange font-['Montserrat_Alternates'] font-semibold">вязанных</span> историй</Link>
          </div>

          <ul className="flex justify-between gap-30">
            <li><Link className="font-['Montserrat_Alternates'] font-semibold hover:font-bold duration-300 ease-in-out" href="/catalog">Каталог</Link></li>
            <li><Link className="font-['Montserrat_Alternates'] font-semibold hover:font-bold duration-300 ease-in-out" href="/blog">Блог</Link></li>
            <li><Link className="font-['Montserrat_Alternates'] font-semibold hover:font-bold duration-300 ease-in-out" href="/master-classes">Мастер-классы</Link></li>
          </ul>

          <div className="relative">
            <Image className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" src={search} alt="search"/>
            <input className="w-full p-2 pl-8 rounded-lg outline-none placeholder:text-black font-['Montserrat_Alternates'] font-semibold" type="text" placeholder="Поиск" />
          </div>

          <div>
            <ul className="flex justify-between gap-8 items-center">
              {isAuthenticated && isBuyer || isMaster &&(
                <li>
                  <Link href="/chats">
                    <Image src={chat} className="w-7 h-7" alt="chat" />
                  </Link>
                </li>
              )}
              <li><Link className="font-['Montserrat_Alternates']" href="/shopping-cart"><Image src={cart} alt="shopping cart" className="w-7 h-7" /></Link></li>
              <li><Link className="font-['Montserrat_Alternates']" href="/favorites"><Image src={favorite} alt="favorites" className="w-7 h-7 " /></Link></li>
              <li>
                {isLoading ? (
                  <div className="w-7 h-7"></div>
                ) : isAuthenticated ? (
                  <Link href="/profile">
                    {session.user.image ? (
                      <Image src={session.user.image} alt="profile" className="w-7 h-7 rounded-full" width={28} height={28} />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-firm-orange flex items-center justify-center text-white text-sm">
                        {session.user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </Link>
                ) : (
                  <Link href="/auth/signin">
                    <Image src={profile} alt="profile" className="w-7 h-7" />
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}