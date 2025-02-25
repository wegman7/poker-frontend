'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getAccessToken, useUser } from '@auth0/nextjs-auth0';

import Cards from './Cards';
import Chips from './Chips';
import Seat from './Seat';
import BetButtons from './BetButtons';
import SitButtons from './SitButtons';
import { useEffect, useRef, useState } from 'react';
import LoadingScreen from '@/app/components/LoadingScreen';

const cardsPositions: string = 'left-[50%] top-[35%]';

const chipAreaSize: string = 'w-[16%] h-[5%]';
const chipAreaPositions: string = 'left-[50%] top-[50%]';

// Define the structure for a single player's hole cards.
type Card = string; // Example: "AS" for Ace of Spades, "10H" for Ten of Hearts

// Interface representing a single player
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

// Interface representing the event object
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


export default function Room() {
  const router = useRouter()
  const { user, error, isLoading } = useUser();
  const params = useParams();
  const searchParams = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [message, setMessage] = useState<State>();
  const [mySeatId, setMySeatId] = useState<number | null>(null);

  useEffect(() => {
    async function connectToWebsocket() {
      const token = await getAccessToken();

      // Create and open a new WebSocket connection
      const socket = new WebSocket(`ws://${process.env.NEXT_PUBLIC_BACKEND_URL}/ws/playerconsumer/${params.gameId}?token=${token}`);
      socketRef.current = socket;

      const startEngine = async (sb: number, bb: number) => {
        await new Promise(r => setTimeout(r, 1000));
        if (socketRef.current && searchParams.get('startEngine') === 'true') {
          socketRef.current.send(JSON.stringify(
            {
              channelCommand: 'startEngine',
              smallBlind: sb,
              bigBlind: bb
            }));
          console.log('Starting engine');
        }
        await new Promise(r => setTimeout(r, 1000));
        join();
      };

      const join = async () => {
        if (socketRef.current) {
          socketRef.current.send(JSON.stringify(
            {
              channelCommand: 'makeEngineCommand',
              engineCommand: 'join',
              seatId: -1
            }));
        }
        console.log('Joining game');
      };
  
      socket.onopen = () => {
        setIsConnected(true);
        startEngine(1, 2);
        console.log('WebSocket connected');
      };
  
      socket.onmessage = (event) => {
        const state: State = JSON.parse(event.data).event;
        console.log('Received: state', state);
        setMessage(state);
      };
  
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
  
      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };
    }

    connectToWebsocket();

    // Cleanup: close the socket when the component unmounts or when gameId changes
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [params.gameId, searchParams]);

  const sendSocketCommand = (payload: object, logMessage: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify(payload));
      console.log(logMessage);
    }
  }

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
  if (!message) {
    return <LoadingScreen />;
  }

  if (mySeatId === null) {
    for (const [seatId, player] of Object.entries(message.players)) {
      if (player.user === user.sub) {
        setMySeatId(Number(seatId));
        break;
      }
    }
  }

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-green-800 rounded-[50%_50%_50%_50%]" />
      <Cards position={cardsPositions} cards={message.communityCards} />
      <Chips size={chipAreaSize} position={chipAreaPositions} amount={message.collectedPot} dealer={false} />
      {[...Array(9)].map((_, index) => (
        <Seat key={index} seatId={index} player={message.players[index]} />
      ))}
      {
        mySeatId !== null ?
        <>
          <SitButtons addChips={addChips} sitIn={sitIn} sitOut={sitOut} leave={leave} sittingOut={message.players[mySeatId].sittingOut} />
          {
            message.players[mySeatId].spotlight ?
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
            : null
          }
        </>
        : null
      }
      {
        searchParams.get('startEngine') === 'true' && message.gameStopped ?
        <div className="absolute w-[40%] left-1/2 top-[25%] transform -translate-x-1/2 -translate-y-1/2 text-white rounded-lg text-center">
          <button
            className="bg-blue-600 w-[full] py-[5%] px-[5%] rounded-md hover:bg-blue-500 dynamic-text-lg"
            onClick={startGame}
          >
            Start game
          </button>
        </div>
        : null
      }
    </div>
  );
}
