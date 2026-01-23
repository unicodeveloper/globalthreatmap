"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, LogOut, Loader2, Globe } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { SignInModal } from "./sign-in-modal";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";


export function SignInPanel() {
  const { user, isAuthenticated, isLoading, signOut, checkAuthFromStorage } =
    useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [authMessage, setAuthMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for OAuth callback parameters and localStorage on mount
  useEffect(() => {
    // Only check auth in valyu mode
    if (APP_MODE === "valyu") {
      checkAuthFromStorage();
    }

    // Check URL for auth success/error
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get("auth");
    const authError = params.get("error");

    if (authSuccess === "success") {
      setAuthMessage({ type: "success", text: "Successfully signed in!" });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Clear message after 3 seconds
      setTimeout(() => setAuthMessage(null), 3000);
    } else if (authError) {
      setAuthMessage({ type: "error", text: decodeURIComponent(authError) });
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Clear message after 5 seconds
      setTimeout(() => setAuthMessage(null), 5000);
    }
  }, [checkAuthFromStorage]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAuthButtonClick = () => {
    if (isAuthenticated) {
      setShowDropdown(!showDropdown);
    } else {
      setShowSignInModal(true);
    }
  };

  // Don't render anything in self-hosted mode
  if (APP_MODE === "self-hosted") {
    return null;
  }

  return (
    <>
      {/* Auth Message Toast */}
      {authMessage && (
        <div
          className={cn(
            "fixed left-4 top-4 z-50 rounded-lg px-4 py-3 shadow-lg animate-in fade-in slide-in-from-left-2 duration-200",
            authMessage.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          )}
        >
          {authMessage.text}
        </div>
      )}

      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40"
        ref={dropdownRef}
      >
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-lg">
          {/* User Avatar or Lock Icon */}
          <button
            onClick={handleAuthButtonClick}
            disabled={isLoading}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl transition-colors",
              isAuthenticated ? "hover:bg-muted" : "bg-muted/50 hover:bg-muted",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isAuthenticated && user ? (
              user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          <div className="mx-2 border-t border-border" />

          <div className="flex h-14 w-14 items-center justify-center">
            <Globe className="h-6 w-6 text-red-500" />
          </div>
        </div>

        {/* User Dropdown */}
        {showDropdown && isAuthenticated && user && (
          <div className="absolute left-full top-0 ml-3 w-64 rounded-xl border border-border bg-card p-4 shadow-xl animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {user.name || "User"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <button
                onClick={() => {
                  signOut();
                  setShowDropdown(false);
                }}
                disabled={isLoading}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </>
  );
}
