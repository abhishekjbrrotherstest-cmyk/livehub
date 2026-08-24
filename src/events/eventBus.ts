import { EventEmitter } from 'events';
import type { RoomStatus } from '../types';

export interface BusEventMap {
  'room:participant-joined': { roomId: string; user: { userId: string; name: string }; at: string };
  'room:participant-left': { roomId: string; user: { userId: string; name: string }; at: string };
  'room:participant-count-changed': { roomId: string; participantCount: number; at: string };
  'room:status-changed': { roomId: string; status: RoomStatus; at: string };
  'rtc:participant-joined': { roomId: string; identity: string; at: string };
  'rtc:participant-left': { roomId: string; identity: string; at: string };
}

type Handler<T> = (payload: T) => void;

class TypedEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  publish<K extends keyof BusEventMap>(event: K, payload: BusEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  subscribe<K extends keyof BusEventMap>(event: K, handler: Handler<BusEventMap[K]>): () => void {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
    return () => this.emitter.off(event, handler as (...args: unknown[]) => void);
  }
}

export const bus = new TypedEventBus();
