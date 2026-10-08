import { useMemo, useState, type ReactNode } from 'react';
import { FiEdit3, FiFileText, FiFolder, FiFlag, FiTrash2, FiX } from 'react-icons/fi';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  CustomDatePicker,
  CustomDropdown,
  TextInput,
  TextTextarea,
} from '@/components/common/CustomFormControls';

export type TaskPriority = 'High' | 'Medium' | 'Low';

type CreateSpaceModalProps = {
  onClose: () => void;
  onCreate: (payload: { name: string; description: string }) => void | Promise<void>;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  initialName?: string;
  initialDescription?: string;
};

type CreateTaskModalProps = {
  spaceName: string;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    description: string;
    dueDate: string;
    priority: TaskPriority;
  }) => void | Promise<void>;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  initialTitle?: string;
  initialDescription?: string;
  initialDueDate?: string | null;
  initialPriority?: TaskPriority;
};

type CreateNoteModalProps = {
  spaceName: string;
  onClose: () => void;
  onCreate: (payload: { title: string; description: string }) => void | Promise<void>;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  initialTitle?: string;
  initialDescription?: string;
};

type ConfirmDeleteModalProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

type DuePreset = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'custom';

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const formatDisplayDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const getPresetDate = (preset: DuePreset) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (preset === 'tomorrow') {
    date.setDate(date.getDate() + 1);
  }

  if (preset === 'this_week') {
    date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7 || 5));
  }

  if (preset === 'next_week') {
    date.setDate(date.getDate() + 7);
  }

  return toDateInputValue(date);
};

const priorityOptions = [
  { id: 'High', label: 'High', description: 'Needs attention soon' },
  { id: 'Medium', label: 'Medium', description: 'Normal priority work' },
  { id: 'Low', label: 'Low', description: 'Can wait if needed' },
];

const dueOptions = [
  { id: 'today', label: 'Today', description: 'Due before end of day' },
  { id: 'tomorrow', label: 'Tomorrow', description: 'Carry into the next day' },
  { id: 'this_week', label: 'This week', description: 'Finish before the weekend' },
  { id: 'next_week', label: 'Next week', description: 'Plan for next week' },
  { id: 'custom', label: 'Custom date', description: 'Pick an exact due date' },
];

type ModalShellProps = {
  ariaLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  isSubmitting?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
};

const ModalShell = ({
  ariaLabel,
  eyebrow,
  title,
  subtitle,
  isSubmitting = false,
  onClose,
  children,
  footer,
}: ModalShellProps) => (
  <div
    className="settings-modal-backdrop"
    role="presentation"
    onClick={() => {
      if (!isSubmitting) {
        onClose();
      }
    }}
  >
    <div
      className="home-create-modal"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-busy={isSubmitting}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="home-create-modal__header">
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
          <span className="home-create-modal__subtitle">{subtitle}</span>
        </div>
        <button
          type="button"
          className="home-create-modal__close"
          onClick={onClose}
          aria-label="Close"
          disabled={isSubmitting}
        >
          <FiX aria-hidden="true" size={18} />
        </button>
      </header>

      <div className="home-create-modal__body">{children}</div>

      <footer className="home-create-modal__footer">{footer}</footer>
    </div>
  </div>
);

export const CreateSpaceModal = ({
  onClose,
  onCreate,
  isSubmitting = false,
  mode = 'create',
  initialName = '',
  initialDescription = '',
}: CreateSpaceModalProps) => {
  const isEdit = mode === 'edit';
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (isSubmitting) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Enter a space name to continue.');
      return;
    }

    if (trimmedName.length < 3) {
      setError('Space name must be at least 3 characters.');
      return;
    }

    void onCreate({
      name: trimmedName,
      description: description.trim() || 'New workspace for tasks and notes.',
    });
  };

  return (
    <ModalShell
      ariaLabel={isEdit ? 'Edit space' : 'Create space'}
      eyebrow={isEdit ? 'Workspace' : 'New workspace'}
      title={isEdit ? 'Edit space' : 'Create New Space'}
      subtitle={
        isEdit
          ? 'Update the name or description for this space.'
          : 'Give your space a name to organize tasks and notes.'
      }
      isSubmitting={isSubmitting}
      onClose={onClose}
      footer={
        <>
          <button
            className="home-create-modal__cancel"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="home-create-modal__submit"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create Space'}
          </button>
        </>
      }
    >
      <section className="home-create-section" aria-label="Space details">
        <h3>Details</h3>
        <TextInput
          label="Space name"
          icon={<FiFolder aria-hidden="true" size={15} />}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          placeholder="Enter space name"
          maxLength={60}
          autoFocus
          hint="Use at least 3 characters"
          disabled={isSubmitting}
        />

        <TextTextarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional short description for this space"
          rows={3}
          maxLength={200}
          hint={`${description.trim().length}/200`}
          disabled={isSubmitting}
        />
      </section>

      {error ? <p className="home-create-modal__error">{error}</p> : null}
    </ModalShell>
  );
};

export const CreateTaskModal = ({
  spaceName,
  onClose,
  onCreate,
  isSubmitting = false,
  mode = 'create',
  initialTitle = '',
  initialDescription = '',
  initialDueDate = null,
  initialPriority = 'Medium',
}: CreateTaskModalProps) => {
  const isEdit = mode === 'edit';
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [duePreset, setDuePreset] = useState<DuePreset>(initialDueDate ? 'custom' : 'today');
  const [customDueDate, setCustomDueDate] = useState(
    () => initialDueDate || toDateInputValue(new Date()),
  );
  const [priority, setPriority] = useState<TaskPriority>(initialPriority);
  const [isDueOpen, setIsDueOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [error, setError] = useState('');

  const resolvedDueDate = useMemo(
    () => (duePreset === 'custom' ? customDueDate : getPresetDate(duePreset)),
    [customDueDate, duePreset],
  );

  const closeMenus = () => {
    setIsDueOpen(false);
    setIsPriorityOpen(false);
    setIsDatePickerOpen(false);
  };

  const handleSubmit = () => {
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError('Enter a title to save this task.');
      return;
    }

    if (!trimmedDescription) {
      setError('Enter a description to save this task.');
      return;
    }

    void onCreate({
      title: trimmedTitle,
      description: trimmedDescription,
      dueDate: resolvedDueDate,
      priority,
    });
  };

  return (
    <ModalShell
      ariaLabel={isEdit ? 'Edit task' : 'Create task'}
      eyebrow={isEdit ? 'Task' : 'New task'}
      title={isEdit ? 'Edit task' : 'New task'}
      subtitle={`${spaceName} · ${todayLabel()}`}
      isSubmitting={isSubmitting}
      onClose={onClose}
      footer={
        <>
          <button
            className="home-create-modal__cancel"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="home-create-modal__submit"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save task'}
          </button>
        </>
      }
    >
      <section className="home-create-section" aria-label="Task details">
        <h3>Details</h3>
        <TextInput
          label="Title"
          icon={<FiEdit3 aria-hidden="true" size={15} />}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError('');
          }}
          placeholder="Task title"
          autoFocus
          disabled={isSubmitting}
        />

        <TextTextarea
          label="Description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setError('');
          }}
          placeholder="Write a short description..."
          rows={3}
          disabled={isSubmitting}
        />
      </section>

      <section className="home-create-section" aria-label="Task schedule">
        <h3>Schedule</h3>
        <div className="home-create-modal__row">
          <CustomDropdown
            label="Due date"
            options={dueOptions}
            value={duePreset}
            isOpen={isDueOpen}
            onOpenChange={(open) => {
              if (isSubmitting) {
                return;
              }
              setIsPriorityOpen(false);
              setIsDatePickerOpen(false);
              setIsDueOpen(open);
            }}
            onChange={(value) => setDuePreset(value as DuePreset)}
          />

          <CustomDropdown
            label="Priority"
            options={priorityOptions}
            value={priority}
            isOpen={isPriorityOpen}
            onOpenChange={(open) => {
              if (isSubmitting) {
                return;
              }
              setIsDueOpen(false);
              setIsDatePickerOpen(false);
              setIsPriorityOpen(open);
            }}
            onChange={(value) => setPriority(value as TaskPriority)}
          />
        </div>

        {duePreset === 'custom' ? (
          <CustomDatePicker
            label="Custom due date"
            value={customDueDate}
            isOpen={isDatePickerOpen}
            onOpenChange={(open) => {
              if (isSubmitting) {
                return;
              }
              setIsDueOpen(false);
              setIsPriorityOpen(false);
              setIsDatePickerOpen(open);
            }}
            onChange={(value) => {
              setCustomDueDate(value);
              closeMenus();
            }}
          />
        ) : (
          <div className="custom-field-summary">
            <FiFlag aria-hidden="true" size={14} />
            <span>
              Due {formatDisplayDate(resolvedDueDate)} · {priority} priority
            </span>
          </div>
        )}
      </section>

      {error ? <p className="home-create-modal__error">{error}</p> : null}
    </ModalShell>
  );
};

export const CreateNoteModal = ({
  spaceName,
  onClose,
  onCreate,
  isSubmitting = false,
  mode = 'create',
  initialTitle = '',
  initialDescription = '',
}: CreateNoteModalProps) => {
  const isEdit = mode === 'edit';
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError('Enter a title to save this note.');
      return;
    }

    if (!trimmedDescription) {
      setError('Enter a description to save this note.');
      return;
    }

    void onCreate({
      title: trimmedTitle,
      description: trimmedDescription,
    });
  };

  return (
    <ModalShell
      ariaLabel={isEdit ? 'Edit note' : 'Create note'}
      eyebrow={isEdit ? 'Note' : 'New note'}
      title={isEdit ? 'Edit note' : 'New note'}
      subtitle={`${spaceName} · ${todayLabel()}`}
      isSubmitting={isSubmitting}
      onClose={onClose}
      footer={
        <>
          <button
            className="home-create-modal__cancel"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="home-create-modal__submit"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save note'}
          </button>
        </>
      }
    >
      <section className="home-create-section" aria-label="Note details">
        <h3>Details</h3>
        <TextInput
          label="Title"
          icon={<FiFileText aria-hidden="true" size={15} />}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError('');
          }}
          placeholder="Note title"
          autoFocus
          disabled={isSubmitting}
        />

        <TextTextarea
          label="Description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setError('');
          }}
          placeholder="Write a short description..."
          rows={4}
          disabled={isSubmitting}
        />
      </section>

      {error ? <p className="home-create-modal__error">{error}</p> : null}
    </ModalShell>
  );
};

export const ConfirmDeleteModal = ({
  title,
  description,
  confirmLabel = 'Delete',
  isSubmitting = false,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) => (
  <ConfirmDialog
    tone="danger"
    icon={<FiTrash2 />}
    title={title}
    description={description}
    confirmLabel={confirmLabel}
    pendingLabel="Deleting…"
    isPending={isSubmitting}
    onCancel={onClose}
    onConfirm={onConfirm}
  />
);
