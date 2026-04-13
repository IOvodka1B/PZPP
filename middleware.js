import { NextResponse } from "next/server";

export function middleware(request) {
  const response = NextResponse.next();

  if (!request.cookies.get("funnel_visitor_id")) {
    response.cookies.set("funnel_visitor_id", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/f/:path*"],
};
