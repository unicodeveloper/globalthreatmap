import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "unauthorized", message: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const body = await request.json();
    const { path, method, body: requestBody } = body;

    if (!path) {
      return NextResponse.json(
        { error: "invalid_request", message: "Missing path parameter" },
        { status: 400 }
      );
    }

    const appUrl = process.env.VALYU_APP_URL || "https://platform.valyu.ai";
    const proxyUrl = `${appUrl}/api/oauth/proxy`;

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path,
        method: method || "POST",
        body: requestBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Proxy] Error:", response.status, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            error: "auth_error",
            message: "Session expired. Please sign in again.",
            requiresReauth: true,
            details: errorData,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "proxy_error", message: errorData.message || "Request failed", details: errorData },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Proxy] Error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
