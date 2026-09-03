import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { TODOS_LOS_RANGOS } from "@/lib/labels";

const { auth } = NextAuth(authConfig);

const STAFF_ROLES = new Set<string>(TODOS_LOS_RANGOS);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isStaffArea = pathname.startsWith("/dashboard");
  const isCitizenArea = pathname.startsWith("/portal");

  if (!session?.user && (isStaffArea || isCitizenArea)) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session?.user) {
    const isStaff = STAFF_ROLES.has(session.user.role);

    if (isStaffArea && !isStaff) {
      return NextResponse.redirect(new URL("/portal", req.nextUrl.origin));
    }
    if (isCitizenArea && isStaff) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
    if (pathname === "/login" || pathname === "/registro") {
      return NextResponse.redirect(
        new URL(isStaff ? "/dashboard" : "/portal", req.nextUrl.origin),
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/login", "/registro"],
};
