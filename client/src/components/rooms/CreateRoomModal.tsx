import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAppDispatch } from '../../store/hooks';
import { pushToast } from '../../store/uiSlice';
import type { RoomSummary } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError('Room name must be at least 3 characters');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<RoomSummary>('/rooms', { method: 'POST', body: { name: trimmed } });
      dispatch(pushToast({ type: 'success', message: `Room "${trimmed}" created` }));
      onClose();
      setName('');
      navigate(`/rooms/${res.data._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} title="Create a room" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Room name"
          placeholder="e.g. Friday Night Karaoke"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          maxLength={80}
          error={error}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
