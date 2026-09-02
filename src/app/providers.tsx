"use client";

import { PrivyProvider } from "@privy-io/react-auth";

// FocusRoom isn't a wallet app, so login is scoped to email/Google and
// embedded wallet creation is switched off — Privy is used purely as an
// identity provider here (see backend/app/auth.py for how that identity is
// verified server-side).
export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    // Fails loudly in development rather than silently rendering a broken
    // login button — auth is a hard requirement, not an optional layer.
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "NEXT_PUBLIC_PRIVY_APP_ID is not set. Create an app at https://dashboard.privy.io " +
          "and add it to your .env.local — see the root README for details."
      );
    }
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
        appearance: {
          theme: "light",
          accentColor: "#F2A65A",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
