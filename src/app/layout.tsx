import { UserProvider } from '@auth0/nextjs-auth0/client';
import "./globals.css";
// import { ThemeProvider } from '@mui/material';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <UserProvider>
          <body className="bg-gray-900 text-white">
            {/* <ThemeProvider> */}
              {children}
            {/* </ThemeProvider> */}
          </body>
      </UserProvider>
    </html>
  );
}
