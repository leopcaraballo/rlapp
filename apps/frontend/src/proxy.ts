import type { NextRequest } from "next/server";

import { middleware } from "./proxi";

export const config = {
  matcher: "/:path*",
};

export default function proxy(request: NextRequest) {
  return middleware(request);
}
