"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { initiateOAuthFlow, isOAuthConfigured } from "@/lib/oauth";

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ValyuLogoWithText() {
  return (
    <div className="flex items-center gap-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20L4 4h16L12 20z" />
      </svg>
      <span className="font-semibold tracking-wide">VALYU</span>
    </div>
  );
}

export function SignInModal({ open, onOpenChange }: SignInModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValyuSignIn = async () => {
    setIsLoading(true);
    setError(null);

    // Check if OAuth is configured
    if (!isOAuthConfigured()) {
      setError(
        "OAuth is not configured. Please contact the administrator or use self-hosted mode."
      );
      setIsLoading(false);
      return;
    }

    try {
      // Initiate PKCE OAuth flow
      await initiateOAuthFlow();
    } catch (err) {
      console.error("OAuth initiation error:", err);
      setError("Failed to initiate sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-md">
      <DialogHeader onClose={handleClose}>
        <DialogTitle className="text-center text-xl">Sign in</DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-6">
        <p className="text-center text-sm text-muted-foreground">
          Sign in to access all features.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Valyu is the intelligence layer of GTM. It gives access to real-time web search, financial, academic, medical research and proprietary data sources.
        </p>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Sign In Button */}
        <Button
          onClick={handleValyuSignIn}
          disabled={isLoading}
          className="w-full h-12"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Redirecting to Valyu...
            </>
          ) : (
            <>
              <span className="mr-2">Sign in with</span>
              <ValyuLogoWithText />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account? You can create one during sign-in.
        </p>
      </DialogContent>
    </Dialog>
  );
}
