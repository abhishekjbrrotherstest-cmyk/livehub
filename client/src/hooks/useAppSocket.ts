import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  countUpdated,
  messageReceived,
  participantJoined,
  participantLeft,
  presenceOffline,
  presenceOnline,
  statusUpdated
} from '../store/roomsSlice';

export function useAppSocket(): void {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    if (!token) return undefined;

    const socket = connectSocket(token);

    socket.on('presence:online', (payload) => dispatch(presenceOnline(payload)));
    socket.on('presence:offline', (payload) => dispatch(presenceOffline(payload)));
    socket.on('room:participant-joined', (payload) => dispatch(participantJoined(payload)));
    socket.on('room:participant-left', (payload) => dispatch(participantLeft(payload)));
    socket.on('room:participant-count', (payload) => dispatch(countUpdated(payload)));
    socket.on('room:status-updated', (payload) => dispatch(statusUpdated(payload)));
    socket.on('room:message', (payload) => dispatch(messageReceived(payload)));

    const heartbeat = window.setInterval(() => {
      socket.emit('presence:heartbeat');
    }, 25000);

    return () => {
      window.clearInterval(heartbeat);
      disconnectSocket();
    };
  }, [token, dispatch]);
}
