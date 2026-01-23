"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, LogOut, Loader2, Globe } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { SignInModal } from "./sign-in-modal";

const APP_MODE = process.env.NEXT_PUBLIC_APP_MODE || "self-hosted";

export function SignInPanel() {
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  if (APP_MODE === "self-hosted") {
    return null;
  }

  return (
    <>
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
