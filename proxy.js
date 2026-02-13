import { NextResponse } from "next/server";

export function proxy(req) {
  const token = req.cookies.get("token")?.value;

  // Rutas protegidas
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard");

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
