'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getAccessToken, useUser } from '@auth0/nextjs-auth0';

import Cards from './Cards';
import Chips from './Chips';
import Seat from './Seat';
import BetButtons from './BetButtons';
import SitButtons from './SitButtons';
import { useEffect, useMemo, useRef, useState } from 'react';
import LoadingScreen from '@/app/components/LoadingScreen';

const cardsPositions: string = 'left-[50%] top-[35%]';

const chipAreaSize: string = 'w-[16%] h-[5%]';
const chipAreaPositions: string = 'left-[50%] top-[50%]';

type Card = string;

export interface Player {
  seatId: number;
  user: string;
  sittingOut: boolean;
  chips: number;
  chipsInPot: number;
  timeBank: number;
  holeCards: Card[] | null;
  spotlight: boolean;
  dealer: boolean;
}

interface State {
  channelCommand: string;
  bigBlind: number;
  timebankTotal: number;
  pot: number;
  collectedPot: number;
  currentBet: number;
  minRaise: number;
  communityCards: Card[] | null;
  players: { [seatNumber: string]: Player };
  gameStopped: boolean;
}

const MAX_RECONNECTS = 5;
const RECONNECT_DELAY_MS = 3000;
const FAILED_REDIRECT_DELAY_MS = 3000;

export default function Room() {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  const params = useParams();
  const searchParams = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const hasStartedEngineRef = useRef(false);
  const unmountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [connectionFailed, setConnectionFailed] = useState<boolean>(false);
  const [message, setMessage] = useState<State>();
  const [copied, setCopied] = useState<boolean>(false);

  // Derived, not stored: recomputing keeps the seat correct if the player
  // rejoins in a different seat, which the previous set-once effect did not.
  const mySeatId = useMemo(() => {
    if (!message || !user) return null;
    const entry = Object.entries(message.players).find(
      ([, player]) => player.user === user.sub
    );
    return entry ? Number(entry[0]) : null;
  }, [message, user]);

  useEffect(() => {
    unmountedRef.current = false;

    const join = () => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({
        channelCommand: 'makeEngineCommand',
        engineCommand: 'join',
        seatId: -1,
      }));
      console.log('Joining game');
    };

    const startEngineAndJoin = async (sb: number, bb: number) => {
      await new Promise(r => setTimeout(r, 5000));
      if (socketRef.current?.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({
        channelCommand: 'startEngine',
        smallBlind: sb,
        bigBlind: bb,
      }));
      console.log('Starting engine');
      await new Promise(r => setTimeout(r, 5000));
      join();
    };

    const connect = async () => {
      if (unmountedRef.current) return;
      const token = await getAccessToken();
      const socket = new WebSocket(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/ws/playerconsumer/${params.gameId}?token=${token}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        // If a newer connect() ran after this one, socketRef.current will point
        // to the newer socket. Bail out and let the newer socket's onopen handle it.
        if (socketRef.current !== socket) { socket.close(); return; }
        setIsConnected(true);
        setReconnectAttempt(0);
        setConnectionFailed(false);
        reconnectCountRef.current = 0;
        console.log('WebSocket connected');

        if (searchParams.get('startEngine') === 'true' && !hasStartedEngineRef.current) {
          hasStartedEngineRef.current = true;
          startEngineAndJoin(1, 2);
        } else {
          join();
        }
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        const state: State = JSON.parse(event.data).event;
        console.log('Received: state', state);
        setMessage(state);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // Fix 6: reconnect with overlay; redirect home after max attempts
      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        setIsConnected(false);
        console.log('WebSocket disconnected');
        if (unmountedRef.current) return;
        if (reconnectCountRef.current < MAX_RECONNECTS) {
          reconnectCountRef.current++;
          setReconnectAttempt(reconnectCountRef.current);
          setTimeout(connect, RECONNECT_DELAY_MS);
        } else {
          setConnectionFailed(true);
          setTimeout(() => router.push('/'), FAILED_REDIRECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      socketRef.current?.close();
    };
  }, [params.gameId, searchParams]);

  const sendSocketCommand = (payload: object, logMessage: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify(payload));
      console.log(logMessage);
    }
  };

  const startGame = () => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'startGame'
      },
      'Starting game'
    );
  };

  const addChips = (chips: number) => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'addChips',
        chips
      },
      'Adding chips'
    );
  };

  const sitIn = () => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'sitIn',
      },
      'Sitting in'
    );
  };

  const sitOut = () => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'sitOut',
      },
      'Sitting out'
    );
  };

  const leave = () => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'leave'
      },
      'Leaving game'
    );
    router.push('/');
  };

  const fold = () => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'fold'
      },
      'Folding'
    );
  };

  const check = () => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'check'
      },
      'Checking'
    );
  };

  const call = () => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'call'
      },
      'Calling'
    );
  };

  const bet = (chips: number) => {
    sendSocketCommand(
      {
        channelCommand: 'makeEngineCommand',
        engineCommand: 'bet',
        chips: chips
      },
      'Betting'
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;
  if (!user) return <div>Please login to access this page.</div>;
  if (!message) return <LoadingScreen />;

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
      <Cards position={cardsPositions} cards={message.communityCards} />
      <Chips size={chipAreaSize} position={chipAreaPositions} amount={message.collectedPot} dealer={false} />
      {[...Array(9)].map((_, index) => (
        <Seat key={index} seatId={index} player={message.players[index]} />
      ))}
      {mySeatId !== null && (
        <>
          <SitButtons
            addChips={addChips}
            sitIn={sitIn}
            sitOut={sitOut}
            leave={leave}
            sittingOut={message.players[mySeatId].sittingOut}
          />
          {message.players[mySeatId].spotlight && (
            <BetButtons
              fold={fold}
              check={check}
              call={call}
              bet={bet}
              pot={message.pot}
              collectedPot={message.collectedPot}
              currentBet={message.currentBet}
              minRaise={message.minRaise}
              chips={message.players[mySeatId].chips}
              chipsInPot={message.players[mySeatId].chipsInPot}
            />
          )}
        </>
      )}
      {searchParams.get('startEngine') === 'true' && message.gameStopped && (
        <div className="absolute w-[40%] left-1/2 top-[25%] transform -translate-x-1/2 -translate-y-1/2 text-white rounded-lg text-center">
          <button
            className="bg-blue-600 w-[full] py-[5%] px-[5%] rounded-md hover:bg-blue-500 dynamic-text-lg"
            onClick={startGame}
          >
            Start game
          </button>
        </div>
      )}

      {/* Fix 6: disconnection overlay */}
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
                  Reconnecting... (attempt {reconnectAttempt} of {MAX_RECONNECTS})
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
