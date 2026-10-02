import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';

import { useToast } from '@/app/ToastProvider';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getApiErrorMessage } from '@/services/apiErrors';
import { useDeleteMeetingMutation } from '@/services/meetingsApi';

export type DeleteMeetingTarget = {
  id: string;
  title: string;
  spaceId?: string | null;
};

type DeleteMeetingDialogProps = {
  meeting: DeleteMeetingTarget;
  onCancel: () => void;
  onDeleted: (meetingId: string) => void;
};

const deleteErrorMessage = (error: unknown) => {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 404) {
    return 'This meeting no longer exists. It may have been deleted already.';
  }
  if (status === 403) {
    return 'You do not have permission to delete this meeting.';
  }
  if (status === 'FETCH_ERROR') {
    return 'Unable to reach the server. Check your connection and try again.';
  }
  return getApiErrorMessage(error, 'Unable to delete this meeting. Please try again.');
};

export const DeleteMeetingDialog = ({ meeting, onCancel, onDeleted }: DeleteMeetingDialogProps) => {
  const { showToast } = useToast();
  const [deleteMeeting, { isLoading }] = useDeleteMeetingMutation();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isLoading) {
      return;
    }
    setError(null);
    try {
      await deleteMeeting({ sessionId: meeting.id, spaceId: meeting.spaceId ?? null }).unwrap();
      showToast({ type: 'success', message: 'Meeting deleted' });
      onDeleted(meeting.id);
    } catch (caught) {
      if ((caught as { status?: unknown } | null)?.status === 404) {
        showToast({ type: 'info', message: 'Meeting was already deleted' });
        onDeleted(meeting.id);
        return;
      }
      setError(deleteErrorMessage(caught));
    }
  };

  return (
    <ConfirmDialog
      tone="danger"
      icon={<FiTrash2 size={20} />}
      title="Delete this meeting?"
      description={
        <>
          <strong>{meeting.title || 'Untitled meeting'}</strong> will be permanently deleted, including its
          recording, transcript, summary, notes and tasks. This cannot be undone.
        </>
      }
      confirmLabel="Delete meeting"
      pendingLabel="Deleting…"
      isPending={isLoading}
      error={error}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    />
  );
};
