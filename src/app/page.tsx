'use client';

import { useUser } from '@auth0/nextjs-auth0';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const { user, error, isLoading } = useUser();
  const [gameId, setGameId] = useState('');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  if (user) {
    return (
      <div className="relative min-h-screen bg-gray-900 flex flex-col justify-center items-center">
        <button className="absolute top-5 right-5 bg-red-600 text-white py-2 px-6 rounded-md hover:bg-red-500 text-lg sm:text-xl transition-all">
          <Link href="/auth/logout">Logout</Link>
        </button>

        <div className="text-center p-6">
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold mb-8">
            Poker Game
          </h1>
          <div className="flex flex-col items-center gap-6">
            <button className="bg-blue-600 text-white py-3 px-6 sm:py-4 sm:px-8 md:py-5 md:px-10 rounded-md hover:bg-blue-500 text-lg sm:text-xl md:text-2xl font-semibold transition-all">
              <Link href={"/room/" + crypto.randomUUID() + "?startEngine=true"}>Create Game</Link>
            </button>

            <span className="text-white text-lg sm:text-xl md:text-2xl font-semibold">
              OR
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="text"
                placeholder="Enter Game ID"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="w-full sm:w-64 py-3 px-4 sm:py-4 sm:px-6 md:py-5 md:px-8 rounded-md text-lg sm:text-xl md:text-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button className="bg-green-600 text-white py-3 px-6 sm:py-4 sm:px-8 md:py-5 md:px-10 rounded-md hover:bg-green-500 text-lg sm:text-xl md:text-2xl font-semibold transition-all">
                Join Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-900 flex flex-col justify-center items-center">
      <button className="absolute top-5 right-5 bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-500 text-lg sm:text-xl transition-all">
        <Link href="/auth/login">Login</Link>
      </button>
    </div>
  );
}
