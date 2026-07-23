import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0";

import { auth0 } from "@/lib/auth0";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker",
  description: "Real-time multiplayer Texas Hold'em",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth0.getSession();

  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <Auth0Provider user={session?.user}>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
