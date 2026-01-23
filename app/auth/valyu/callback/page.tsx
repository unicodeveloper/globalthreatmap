"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export const dynamic = "force-dynamic";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setErrorMessage("Authorization failed. Please try again.");
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setErrorMessage("Invalid callback parameters.");
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      const storedState = sessionStorage.getItem("oauth_state");
      if (state !== storedState) {
        setStatus("error");
        setErrorMessage("Invalid state parameter. Possible CSRF attack.");
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
      if (!codeVerifier) {
        setStatus("error");
        setErrorMessage("Code verifier not found. Please try again.");
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      try {
        const tokenResponse = await fetch("/api/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, codeVerifier }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error || "Token exchange failed");
        }

        const { access_token, refresh_token, expires_in, user } = await tokenResponse.json();

        sessionStorage.removeItem("oauth_code_verifier");
        sessionStorage.removeItem("oauth_state");

        signIn(
          {
            id: user.sub || user.id,
            name: user.name || user.email,
            email: user.email,
            picture: user.picture,
            email_verified: user.email_verified,
          },
          {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in || 3600,
          }
        );

        setStatus("success");
        setTimeout(() => router.push("/"), 1000);
      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Authentication failed");
        setTimeout(() => router.push("/"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, signIn]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-8 text-center">
        {status === "processing" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 border-4 border-border border-t-primary rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Signing you in...
            </h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we complete your authentication.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Success!
            </h2>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the app...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authentication Failed
            </h2>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 border-4 border-border border-t-primary rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Loading...
            </h2>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
