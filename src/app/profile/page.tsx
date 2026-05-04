"use client";

import BuyerProfile from "@/components/profile/BuyerProfile";
import MasterProfile from "@/components/profile/MasterProfile";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

type AdaptedSession = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string;
    role?: string;
  };
} | null;

function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const loading = status === "loading";
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !session) {
    return null;
  }

  const userRole = session?.user?.role;

  if (userRole === "master") {
    return <MasterProfile session={session as AdaptedSession} />;
  }
  
  return (
    <BuyerProfile
      session={session as AdaptedSession}
      initialTab={tabParam === "profile" ? "profile" : undefined}
    />
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileContent />
    </Suspense>
  );
}