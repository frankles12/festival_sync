import { Session as DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    accessToken?: string | unknown; // Or a more specific type if known
    error?: string | unknown;
    // Extend user type if needed, e.g., adding id from Spotify
    user?: {
      id?: string | unknown; // Add id if available from token.user
    } & DefaultUser;
  }

  // Optional: Extend the User type if you have custom properties coming from the provider profile
  // interface User extends DefaultUser {
  //   id: string; // Example: ensuring id is always string
  // }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    accessToken?: string | unknown;
    accessTokenExpires?: number | unknown;
    refreshToken?: string | unknown;
    error?: string | unknown;
    // Add user object structure if it's added in the jwt callback
    user?: {
      id?: string | unknown;
    } & DefaultUser;
  }
} 