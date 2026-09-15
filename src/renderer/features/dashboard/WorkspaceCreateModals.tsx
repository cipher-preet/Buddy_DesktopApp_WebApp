import { useMemo, useState } from 'react';
import { FiCalendar, FiEdit3, FiFileText, FiFolder, FiFlag, FiX } from 'react-icons/fi';

import {
  CustomDropdown,
  TextInput,
  TextTextarea,
} from '@/components/common/CustomFormControls';

export type TaskPriority = 'High' | 'Medium' | 'Low';

type CreateSpaceModalProps = {
  onClose: () => void;
  onCreate: (payload: { name: string; description: string }) => void;
};

type CreateTaskModalProps = {
  spaceName: string;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    description: string;
    dueDate: string;
    priority: TaskPriority;
  }) => void;
};

type CreateNoteModalProps = {
  spaceName: string;
  onClose: () => void;
  onCreate: (payload: { title: string; description: string }) => void;
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

export const CreateSpaceModal = ({ onClose, onCreate }: CreateSpaceModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Enter a space name to continue.');
      return;
    }

    if (trimmedName.length < 3) {
      setError('Space name must be at least 3 characters.');
      return;
    }

    onCreate({
      name: trimmedName,
      description: description.trim() || 'New workspace for tasks and notes.',
    });
  };

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal settings-action-modal home-create-modal"
        role="dialog"
        aria-label="Create space"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>Create New Space</h2>
            <p>Give your space a name to organize tasks and notes.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <TextInput
          label="Space name"
          icon={<FiFolder aria-hidden="true" size={16} />}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          placeholder="Enter space name"
          maxLength={60}
          autoFocus
          hint="Use at least 3 characters"
        />

        <TextTextarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional short description for this space"
          maxLength={200}
          hint={`${description.trim().length}/200`}
        />

        {error ? <p className="settings-form-error">{error}</p> : null}

        <div className="settings-modal-actions">
          <button className="settings-secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-primary-button" type="button" onClick={handleSubmit}>
            Create Space
          </button>
        </div>
      </div>
    </div>
  );
};

export const CreateTaskModal = ({ spaceName, onClose, onCreate }: CreateTaskModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duePreset, setDuePreset] = useState<DuePreset>('today');
  const [customDueDate, setCustomDueDate] = useState(() => toDateInputValue(new Date()));
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [isDueOpen, setIsDueOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [error, setError] = useState('');

  const resolvedDueDate = useMemo(
    () => (duePreset === 'custom' ? customDueDate : getPresetDate(duePreset)),
    [customDueDate, duePreset],
  );

  const handleSubmit = () => {
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

    onCreate({
      title: trimmedTitle,
      description: trimmedDescription,
      dueDate: formatDisplayDate(resolvedDueDate),
      priority,
    });
  };

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal settings-action-modal home-create-modal"
        role="dialog"
        aria-label="Create task"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>New task</h2>
            <p>
              {spaceName} · {todayLabel()}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <TextInput
          label="Title"
          icon={<FiEdit3 aria-hidden="true" size={16} />}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError('');
          }}
          placeholder="Task title"
          maxLength={80}
          autoFocus
          hint="Title max 80 characters"
        />

        <TextTextarea
          label="Description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setError('');
          }}
          placeholder="Write a short description..."
          maxLength={500}
          hint={`${description.trim().length}/500`}
        />

        <div className="home-create-modal__row">
          <CustomDropdown
            label="Due date"
            options={dueOptions}
            value={duePreset}
            isOpen={isDueOpen}
            onOpenChange={(open) => {
              setIsDueOpen(open);
              if (open) {
                setIsPriorityOpen(false);
              }
            }}
            onChange={(value) => setDuePreset(value as DuePreset)}
          />

          <CustomDropdown
            label="Priority"
            options={priorityOptions}
            value={priority}
            isOpen={isPriorityOpen}
            onOpenChange={(open) => {
              setIsPriorityOpen(open);
              if (open) {
                setIsDueOpen(false);
              }
            }}
            onChange={(value) => setPriority(value as TaskPriority)}
          />
        </div>

        {duePreset === 'custom' ? (
          <TextInput
            label="Custom due date"
            icon={<FiCalendar aria-hidden="true" size={16} />}
            type="date"
            value={customDueDate}
            onChange={(event) => setCustomDueDate(event.target.value)}
            hint={`Selected: ${formatDisplayDate(customDueDate)}`}
          />
        ) : (
          <div className="custom-field-summary">
            <FiFlag aria-hidden="true" size={14} />
            <span>
              Due {formatDisplayDate(resolvedDueDate)} · {priority} priority
            </span>
          </div>
        )}

        {error ? <p className="settings-form-error">{error}</p> : null}

        <div className="settings-modal-actions">
          <button className="settings-secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-primary-button" type="button" onClick={handleSubmit}>
            Save task
          </button>
        </div>
      </div>
    </div>
  );
};

export const CreateNoteModal = ({ spaceName, onClose, onCreate }: CreateNoteModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
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

    onCreate({
      title: trimmedTitle,
      description: trimmedDescription,
    });
  };

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal settings-action-modal home-create-modal"
        role="dialog"
        aria-label="Create note"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>New note</h2>
            <p>
              {spaceName} · {todayLabel()}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <TextInput
          label="Title"
          icon={<FiFileText aria-hidden="true" size={16} />}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError('');
          }}
          placeholder="Note title"
          maxLength={80}
          autoFocus
          hint="Title max 80 characters"
        />

        <TextTextarea
          label="Description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setError('');
          }}
          placeholder="Write a short description..."
          maxLength={500}
          hint={`${description.trim().length}/500`}
        />

        {error ? <p className="settings-form-error">{error}</p> : null}

        <div className="settings-modal-actions">
          <button className="settings-secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-primary-button" type="button" onClick={handleSubmit}>
            Save note
          </button>
        </div>
      </div>
    </div>
  );
};
