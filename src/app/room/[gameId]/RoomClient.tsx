'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { useMemo, useState } from 'react';

import Cards from './Cards';
import Chips from './Chips';
import Seat from './Seat';
import BetButtons from './BetButtons';
import SitButtons from './SitButtons';
import LoadingScreen from '@/app/components/LoadingScreen';
import { useGameSocket } from './useGameSocket';

const cardsPositions: string = 'left-[50%] top-[35%]';

const chipAreaSize: string = 'w-[16%] h-[5%]';
const chipAreaPositions: string = 'left-[50%] top-[50%]';

export default function RoomClient() {
  const { user, error, isLoading } = useUser();
  const params = useParams();
  const searchParams = useSearchParams();
  const shouldStartEngine = searchParams.get('startEngine') === 'true';

  const {
    state,
    isConnected,
    reconnectAttempt,
    connectionFailed,
    maxReconnects,
    commands,
  } = useGameSocket(params.gameId as string, shouldStartEngine);

  // Derived, not stored: recomputing keeps the seat correct if the player
  // rejoins in a different seat, which the previous set-once effect did not.
  const mySeatId = useMemo(() => {
    if (!state || !user) return null;
    const entry = Object.entries(state.players).find(
      ([, player]) => player.user === user.sub
    );
    return entry ? Number(entry[0]) : null;
  }, [state, user]);

  const [copied, setCopied] = useState<boolean>(false);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;
  if (!user) return <div>Please login to access this page.</div>;
  if (!state) return <LoadingScreen />;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
      <button
        className="absolute top-[2%] left-[86%] text-white dynamic-text opacity-60 hover:opacity-100 transition-opacity"
        onClick={() => {
          navigator.clipboard.writeText(params.gameId as string);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? 'Copied!' : 'Copy room ID'}
      </button>
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-green-800 rounded-[50%_50%_50%_50%]" />
      <Cards position={cardsPositions} cards={state.communityCards} />
      <Chips size={chipAreaSize} position={chipAreaPositions} amount={state.collectedPot} dealer={false} />
      {[...Array(9)].map((_, index) => (
        <Seat key={index} seatId={index} player={state.players[index]} />
      ))}
      {mySeatId !== null && (
        <>
          <SitButtons
            addChips={commands.addChips}
            sitIn={commands.sitIn}
            sitOut={commands.sitOut}
            leave={commands.leave}
            sittingOut={state.players[mySeatId].sittingOut}
          />
          {state.players[mySeatId].spotlight && (
            <BetButtons
              fold={commands.fold}
              check={commands.check}
              call={commands.call}
              bet={commands.bet}
              pot={state.pot}
              collectedPot={state.collectedPot}
              currentBet={state.currentBet}
              minRaise={state.minRaise}
              chips={state.players[mySeatId].chips}
              chipsInPot={state.players[mySeatId].chipsInPot}
            />
          )}
        </>
      )}
      {shouldStartEngine && state.gameStopped && (
        <div className="absolute w-[40%] left-1/2 top-[25%] transform -translate-x-1/2 -translate-y-1/2 text-white rounded-lg text-center">
          <button
            className="bg-blue-600 w-[full] py-[5%] px-[5%] rounded-md hover:bg-blue-500 dynamic-text-lg"
            onClick={commands.startGame}
          >
            Start game
          </button>
        </div>
      )}

      {(!isConnected || connectionFailed) && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 text-white text-center max-w-sm w-full mx-4">
            {connectionFailed ? (
              <>
                <p className="text-xl font-bold mb-2">Unable to Reconnect</p>
                <p className="text-gray-300">Returning you to the home page...</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold mb-2">Connection Lost</p>
                <p className="text-gray-300">
                  Reconnecting... (attempt {reconnectAttempt} of {maxReconnects})
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
