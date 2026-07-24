'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@auth0/nextjs-auth0';

import type { State } from './types';

const MAX_RECONNECTS = 5;
const RECONNECT_DELAY_MS = 3000;
const FAILED_REDIRECT_DELAY_MS = 3000;

export interface GameCommands {
  startGame: () => void;
  addChips: (chips: number) => void;
  sitIn: () => void;
  sitOut: () => void;
  leave: () => void;
  fold: () => void;
  check: () => void;
  call: () => void;
  bet: (chips: number) => void;
}

export interface GameSocket {
  state: State | undefined;
  isConnected: boolean;
  reconnectAttempt: number;
  connectionFailed: boolean;
  maxReconnects: number;
  commands: GameCommands;
}

export function useGameSocket(gameId: string, shouldStartEngine: boolean): GameSocket {
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const hasStartedEngineRef = useRef(false);
  const unmountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [connectionFailed, setConnectionFailed] = useState<boolean>(false);
  const [state, setState] = useState<State>();

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
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/ws/playerconsumer/${gameId}?token=${token}`
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

        if (shouldStartEngine && !hasStartedEngineRef.current) {
          hasStartedEngineRef.current = true;
          startEngineAndJoin(1, 2);
        } else {
          join();
        }
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        const nextState: State = JSON.parse(event.data).event;
        console.log('Received: state', nextState);
        setState(nextState);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

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
  }, [gameId, shouldStartEngine, router]);

  const sendSocketCommand = (payload: object, logMessage: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify(payload));
      console.log(logMessage);
    }
  };

  const commands: GameCommands = {
    startGame: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'startGame'
        },
        'Starting game'
      );
    },
    addChips: (chips: number) => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'addChips',
          chips
        },
        'Adding chips'
      );
    },
    sitIn: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'sitIn',
        },
        'Sitting in'
      );
    },
    sitOut: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'sitOut',
        },
        'Sitting out'
      );
    },
    leave: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'leave'
        },
        'Leaving game'
      );
      router.push('/');
    },
    fold: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'fold'
        },
        'Folding'
      );
    },
    check: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'check'
        },
        'Checking'
      );
    },
    call: () => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'call'
        },
        'Calling'
      );
    },
    bet: (chips: number) => {
      sendSocketCommand(
        {
          channelCommand: 'makeEngineCommand',
          engineCommand: 'bet',
          chips: chips
        },
        'Betting'
      );
    },
  };

  return {
    state,
    isConnected,
    reconnectAttempt,
    connectionFailed,
    maxReconnects: MAX_RECONNECTS,
    commands,
  };
}
