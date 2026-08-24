import { useEffect, useRef, useState } from 'react';
import { CreateRoomModal } from '../components/rooms/CreateRoomModal';
import { RoomCard } from '../components/rooms/RoomCard';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchRooms } from '../store/roomsSlice';

export function RoomsPage() {
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.rooms.list);
  const counts = useAppSelector((state) => state.rooms.counts);

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (list.status === 'idle') {
      void dispatch(fetchRooms({ page: 1, search: '' }));
    }
  }, [dispatch, list.status]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void dispatch(fetchRooms({ page: 1, search }));
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [dispatch, search]);

  const goToPage = (page: number) => {
    void dispatch(fetchRooms({ page, search }));
  };

  const loadingFirstTime = list.status === 'loading' && list.items.length === 0;
  const isEmpty = list.status === 'succeeded' && list.items.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Live Rooms</h1>
          <p className="text-sm text-slate-400">
            {list.meta ? `${list.meta.total} room${list.meta.total === 1 ? '' : 's'} · realtime updates on` : 'Browse and join voice rooms'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>＋ Create Room</Button>
      </div>

      <div className="relative mb-6">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search rooms…"
          className="w-full rounded-xl border border-white/10 bg-surface-raised py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {loadingFirstTime && (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {isEmpty && (
        <EmptyState
          title="No rooms found"
          subtitle={
            search
              ? `Nothing matches "${search}". Try a different keyword.`
              : 'Be the first to create a live voice room!'
          }
          action={<Button onClick={() => setCreateOpen(true)}>Create the first room</Button>}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.items.map((room) => (
          <RoomCard key={room._id} room={room} liveCount={counts[room._id]} />
        ))}
      </div>

      {list.meta && list.meta.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={list.meta.page <= 1} onClick={() => goToPage(list.meta!.page - 1)}>
            ← Prev
          </Button>
          <span className="text-sm text-slate-400">
            Page {list.meta.page} of {list.meta.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={list.meta.page >= list.meta.totalPages}
            onClick={() => goToPage(list.meta!.page + 1)}
          >
            Next →
          </Button>
        </div>
      )}

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
