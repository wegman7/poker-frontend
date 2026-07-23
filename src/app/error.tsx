'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center text-white gap-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-gray-400">{error.message}</p>
      <button
        className="bg-blue-600 py-2 px-6 rounded-md hover:bg-blue-500"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
