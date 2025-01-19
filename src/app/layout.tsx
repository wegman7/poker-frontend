import { UserProvider } from '@auth0/nextjs-auth0/client';
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <UserProvider>
          <body className="bg-gray-900 text-white">
              {children}
          </body>
      </UserProvider>
    </html>
  );
}
