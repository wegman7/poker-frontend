import { Suspense } from 'react';

import LoadingScreen from '@/app/components/LoadingScreen';
import RoomClient from './RoomClient';

export default function RoomPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RoomClient />
    </Suspense>
  );
}
