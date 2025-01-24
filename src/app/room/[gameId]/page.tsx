'use client';

import { useParams } from 'next/navigation';
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

export default function Room() {
  const params = useParams();
  const gameId = params.gameId;
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);

  console.log(message);

  useEffect(() => {
    async function connectToWebsocket() {
      const token = await getAccessToken();

      // Create and open a new WebSocket connection
      const socket = new WebSocket(`ws://localhost:8000/ws/playerconsumer/${gameId}?token=${token}`);
      socketRef.current = socket;
  
      socket.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };
  
      socket.onmessage = (event) => {
        console.log('Received:', event.data);
        setMessage(event.data);
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
  }, [gameId]);

  const sendMessage = () => {
    if (socketRef.current && isConnected) {
      const message = {
        channelCommand: 'fakeCommand',
        timestamp: new Date().toISOString(),
      };

      socketRef.current.send(JSON.stringify(message));
      console.log('Sent:', message);
    }
  };

  sendMessage();

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-h-[calc(100vw*3/4)] max-w-[calc(100vh*4/3)] aspect-[4/3]">
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-green-800 rounded-[50%_50%_50%_50%]" />
      <Cards size={cardsSizes[2]} position={cardsPositions} cards={['As', 'Kd', 'Qc', 'Jh']} />
      <Chips size={chipAreaSize} position={chipAreaPositions} amount={67.25} />
      {[...Array(9)].map((_, index) => (
        <Seat key={index} seatId={index} />
      ))}
      <SitButtons />
      <BetButtons />
    </div>
  );
}
