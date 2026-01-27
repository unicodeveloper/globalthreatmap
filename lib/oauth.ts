/**
 * OAuth 2.0 with PKCE (Proof Key for Code Exchange) utilities
 */

/**
 * Generates a random code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generates a code challenge from a code verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encoding (without padding)
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Check if OAuth is configured
 */
export function isOAuthConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VALYU_CLIENT_ID &&
    process.env.NEXT_PUBLIC_VALYU_AUTH_URL &&
    process.env.NEXT_PUBLIC_REDIRECT_URI
  );
}

/**
 * Initiates the OAuth flow by redirecting to the authorization endpoint
 */
export async function initiateOAuthFlow() {
  // Check if OAuth is configured
  if (!isOAuthConfigured()) {
    console.warn(
      "OAuth is not configured. Set NEXT_PUBLIC_VALYU_CLIENT_ID, NEXT_PUBLIC_VALYU_AUTH_URL, and NEXT_PUBLIC_REDIRECT_URI."
    );
    return;
  }

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier in localStorage (needed for token exchange)
  // Using localStorage instead of sessionStorage to persist across tabs/redirects
  // Include timestamp for expiration check
  localStorage.setItem("oauth_code_verifier", codeVerifier);
  localStorage.setItem("oauth_timestamp", Date.now().toString());

  // Generate random state for CSRF protection
  const state = generateCodeVerifier();
  localStorage.setItem("oauth_state", state);

  // Build authorization URL
  const authUrl = new URL(
    "/auth/v1/oauth/authorize",
    process.env.NEXT_PUBLIC_VALYU_AUTH_URL
  );
  authUrl.searchParams.append(
    "client_id",
    process.env.NEXT_PUBLIC_VALYU_CLIENT_ID!
  );
  authUrl.searchParams.append(
    "redirect_uri",
    process.env.NEXT_PUBLIC_REDIRECT_URI!
  );
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", "openid profile email");
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("state", state);

  // Redirect to authorization endpoint
  window.location.href = authUrl.toString();
}

/**
 * User info interface
 */
export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  updated_at?: string;
}
