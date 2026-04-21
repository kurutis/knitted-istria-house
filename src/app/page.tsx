'use client'

import Link from "next/link";
import HeroSlider from "@/components/HeroSlider"
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import MasterDashboard from "@/components/master/MasterDashboard";
import TopMasters from "@/components/TopMasters";
import PopularProducts from "@/components/PopularProducts";

export default function HomePage() {
  const { data: session, status } = useSession()
  const [isMaster, setIsMaster] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'master'){
      setIsMaster(true)
    } else{
      setIsMaster(false)
    }
  }, [session, status])

  if (isMaster) {
    return <MasterDashboard session={session} />
  }
  return (
    <div className="ml-[5%] w-[90%] mr-5%">
      <div>
        <HeroSlider />
      </div>
      <TopMasters />
      <div className="flex items-center gap-20 justify-center mt-5 h-[4vh]">
        <button className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-pink p-2 w-[20%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white hover:cursor-pointer">Найти изделие для себя</button>
        <button className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 w-[20%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white hover:cursor-pointer">Найти своего мастера</button>
      </div>
      <div>
        <PopularProducts />
      </div>
      <div>
        {/* blog */}
      </div>
    </div>
  );
}