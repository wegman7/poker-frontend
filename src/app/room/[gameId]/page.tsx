'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { getAccessToken } from '@auth0/nextjs-auth0';

import Cards from './Cards';
import Chips from './Chips';
import Seat from './Seat';
import BetButtons from './BetButtons';
import SitButtons from './SitButtons';
import { useEffect, useRef, useState } from 'react';

const cardsSizes: { [key: string]: string } = {
  '0': 'w-[14%] h-[12%]',
  '1': 'w-[18%] h-[12%]',
  '2': 'w-[24%] h-[12%]',
  '3': 'w-[30%] h-[12%]',
};
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
  communityCards: Card[] | null;
  players: { [seatNumber: string]: Player };
}


export default function Room() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<State>();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    async function connectToWebsocket() {
      const token = await getAccessToken();

      // Create and open a new WebSocket connection
      const socket = new WebSocket(`ws://localhost:8000/ws/playerconsumer/${params.gameId}?token=${token}`);
      socketRef.current = socket;

      const startEngine = async (sb: number, bb: number) => {
        if (socketRef.current) {
          socketRef.current.send(JSON.stringify(
            {
              channelCommand: 'startEngine',
              smallBlind: sb,
              bigBlind: bb
            }));
        }
        console.log('Starting engine');
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
        console.log('Received:', JSON.parse(event.data));
        const state: State = JSON.parse(event.data).event;
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

  if (!message) {
    return <div>Connecting to game...</div>;
  }

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-green-800 rounded-[50%_50%_50%_50%]" />
      <Cards size={cardsSizes[2]} position={cardsPositions} cards={message.communityCards} />
      <Chips size={chipAreaSize} position={chipAreaPositions} amount={message.pot} />
      {[...Array(9)].map((_, index) => (
        <Seat key={index} seatId={index} player={message.players.seatId} />
      ))}
      <SitButtons />
      <BetButtons />
    </div>
  );
}
