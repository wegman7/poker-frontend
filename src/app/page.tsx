'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export default function Home() {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  if (user) {
    return (
      <div>
        Welcome {user.name}!
        <Link href="/room">Room</Link>
        <Link href="/api/auth/logout">Logout</Link>
      </div>
    );
  }

  return (
    <div>Click here to login - <Link href="/api/auth/login">Login</Link></div>
  )
}