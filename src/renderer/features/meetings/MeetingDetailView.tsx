import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiFile,
  FiFileText,
  FiImage,
  FiMapPin,
  FiMoreHorizontal,
  FiPaperclip,
  FiShare2,
  FiUser,
  FiVideo,
} from 'react-icons/fi';

import { AiChatView } from '@/features/ai-chat/AiChatView';

import type { MeetingRecord, MeetingTask } from './meetingsTypes';

type DetailTab = 'summary' | 'transcript' | 'comment' | 'attachments' | 'tasks' | 'notes';

type MeetingDetailViewProps = {
  meeting: MeetingRecord;
  onBack: () => void;
};

const TAB_OPTIONS: Array<{ id: DetailTab; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'comment', label: 'Comments' },
  { id: 'attachments', label: 'Attachments' },
];

const TASK_STATUS_LABEL: Record<MeetingTask['status'], string> = {
  open: 'Open',
  done: 'Done',
  blocked: 'Blocked',
};

const AttachmentIcon = ({ type }: { type: MeetingRecord['attachments'][number]['type'] }) => {
  if (type === 'image') return <FiImage aria-hidden="true" size={16} />;
  if (type === 'pdf') return <FiFile aria-hidden="true" size={16} />;
  return <FiPaperclip aria-hidden="true" size={16} />;
};

export const MeetingDetailView = ({ meeting, onBack }: MeetingDetailViewProps) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');

  useEffect(() => {
    setActiveTab('summary');
  }, [meeting.id]);

  const openTaskCount = useMemo(
    () => meeting.tasks.filter((task) => task.status !== 'done').length,
    [meeting.tasks],
  );

  return (
    <section className="meeting-detail" aria-label={meeting.title}>
      <div className="meeting-detail__main">
        <button type="button" className="meeting-detail__back" onClick={onBack}>
          <FiArrowLeft aria-hidden="true" size={16} />
          Back to meetings
        </button>

        <div className="meeting-player-wrap">
          <div className={`meeting-player meeting-player--${meeting.thumbnailTone}`}>
            <img src={meeting.coverImage} alt="" className="meeting-player__image" />
            <div className="meeting-player__toolbar" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <strong>End</strong>
            </div>
            <button type="button" className="meeting-player__play" aria-label="Play recording">
              <FiVideo size={22} />
            </button>
          </div>
        </div>

        <header className="meeting-detail__header">
          <div className="meeting-detail__heading">
            <h1>{meeting.title}</h1>
            <div className="meeting-detail__meta">
              <span>
                <FiCalendar aria-hidden="true" size={14} />
                {meeting.dateLabel}
              </span>
              <span>
                <FiClock aria-hidden="true" size={14} />
                {meeting.startLabel} – {meeting.endLabel}
              </span>
              <div className="meeting-detail__avatars" aria-label="Participants">
                {meeting.participants.slice(0, 4).map((person) => (
                  <span key={person.id} style={{ background: person.color }} title={person.name}>
                    {person.initials}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="meeting-detail__actions">
            <button type="button" className="meeting-detail__share">
              <FiShare2 aria-hidden="true" size={15} />
              Share
            </button>
            <button type="button" className="meeting-detail__more" aria-label="More actions">
              <FiMoreHorizontal size={18} />
            </button>
          </div>
        </header>

        <div className="meeting-detail__tabs" role="tablist" aria-label="Meeting content">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`meeting-detail__tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'tasks' && openTaskCount > 0 ? <em>{openTaskCount}</em> : null}
              {tab.id === 'notes' ? <em>{meeting.notes.length}</em> : null}
            </button>
          ))}
        </div>

        <div className="meeting-detail__panel" role="tabpanel">
          {activeTab === 'summary' ? (
            <div className="meeting-summary">
              <article className="meeting-section-card">
                <header>
                  <h3>Overview</h3>
                </header>
                <p>{meeting.summaryIntro}</p>
              </article>

              <div className="meeting-summary__grid">
                <article className="meeting-section-card meeting-section-card--accent">
                  <header>
                    <span className="meeting-section-card__icon is-topics">
                      <FiMapPin size={15} aria-hidden="true" />
                    </span>
                    <h3>Key Topics</h3>
                  </header>
                  <p>{meeting.keyTopics}</p>
                </article>
                <article className="meeting-section-card meeting-section-card--accent">
                  <header>
                    <span className="meeting-section-card__icon is-decisions">
                      <FiCheckSquare size={15} aria-hidden="true" />
                    </span>
                    <h3>Decisions</h3>
                  </header>
                  <p>{meeting.decisions}</p>
                </article>
                <article className="meeting-section-card meeting-section-card--accent">
                  <header>
                    <span className="meeting-section-card__icon is-issues">
                      <FiAlertTriangle size={15} aria-hidden="true" />
                    </span>
                    <h3>Unresolved</h3>
                  </header>
                  <p>{meeting.unresolved}</p>
                </article>
              </div>

              <article className="meeting-section-card">
                <header>
                  <h3>Key Takeaways</h3>
                </header>
                <ul className="meeting-summary__takeaways">
                  {meeting.takeaways.map((item) => (
                    <li key={item.title}>
                      <FiCheckCircle aria-hidden="true" size={16} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ) : null}

          {activeTab === 'transcript' ? (
            <div className="meeting-transcript">
              <article className="meeting-section-card meeting-section-card--tight">
                <header>
                  <h3>Full transcript</h3>
                  <small>{meeting.transcript.length} segments</small>
                </header>
                <div className="meeting-transcript__list">
                  {meeting.transcript.map((line) => (
                    <article key={line.id} className="meeting-transcript__line">
                      <div className="meeting-transcript__speaker">
                        <span>{line.speaker.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{line.speaker}</strong>
                          <time>{line.timeLabel}</time>
                        </div>
                      </div>
                      <p>{line.text}</p>
                    </article>
                  ))}
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === 'tasks' ? (
            <div className="meeting-tasks">
              <article className="meeting-section-card meeting-section-card--tight">
                <header>
                  <h3>Action items</h3>
                  <small>
                    {openTaskCount} open · {meeting.tasks.length} total
                  </small>
                </header>
                <div className="meeting-tasks__list">
                  {meeting.tasks.map((task) => (
                    <article key={task.id} className={`meeting-task-row is-${task.status}`}>
                      <span className="meeting-task-row__check" aria-hidden="true">
                        <FiCheckSquare size={16} />
                      </span>
                      <div className="meeting-task-row__body">
                        <strong>{task.title}</strong>
                        <div className="meeting-task-row__meta">
                          <span>
                            <FiUser size={12} aria-hidden="true" />
                            {task.owner}
                          </span>
                          <span>
                            <FiClock size={12} aria-hidden="true" />
                            {task.dueLabel}
                          </span>
                        </div>
                      </div>
                      <span className={`meeting-task-row__status is-${task.status}`}>
                        {TASK_STATUS_LABEL[task.status]}
                      </span>
                    </article>
                  ))}
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === 'notes' ? (
            <div className="meeting-notes">
              {meeting.notes.map((note) => (
                <article key={note.id} className="meeting-section-card meeting-note-card">
                  <header>
                    <span className="meeting-note-card__icon" aria-hidden="true">
                      <FiFileText size={15} />
                    </span>
                    <div>
                      <h3>{note.title}</h3>
                      <small>
                        {note.author} · {note.timeLabel}
                      </small>
                    </div>
                  </header>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === 'comment' ? (
            <div className="meeting-comments">
              {meeting.comments.length === 0 ? (
                <article className="meeting-section-card meeting-empty-state">
                  <h3>No comments yet</h3>
                  <p>Ask Buddy a question or leave the first comment for this recording.</p>
                </article>
              ) : (
                <article className="meeting-section-card meeting-section-card--tight">
                  <header>
                    <h3>Discussion</h3>
                    <small>{meeting.comments.length} comments</small>
                  </header>
                  <div className="meeting-comments__list">
                    {meeting.comments.map((comment) => (
                      <article key={comment.id} className="meeting-comments__item">
                        <span style={{ background: comment.color }}>{comment.initials}</span>
                        <div>
                          <header>
                            <strong>{comment.author}</strong>
                            <time>{comment.timeLabel}</time>
                          </header>
                          <p>{comment.text}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              )}
            </div>
          ) : null}

          {activeTab === 'attachments' ? (
            <div className="meeting-attachments">
              {meeting.attachments.length === 0 ? (
                <article className="meeting-section-card meeting-empty-state">
                  <h3>No attachments</h3>
                  <p>Files shared in this meeting will appear here.</p>
                </article>
              ) : (
                <article className="meeting-section-card meeting-section-card--tight">
                  <header>
                    <h3>Shared files</h3>
                    <small>{meeting.attachments.length} files</small>
                  </header>
                  <div className="meeting-attachments__list">
                    {meeting.attachments.map((file) => (
                      <article key={file.id} className="meeting-attachments__item">
                        <span>
                          <AttachmentIcon type={file.type} />
                        </span>
                        <div>
                          <strong>{file.name}</strong>
                          <small>{file.sizeLabel}</small>
                        </div>
                        <em>{file.type.toUpperCase()}</em>
                      </article>
                    ))}
                  </div>
                </article>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <aside className="meeting-ask" aria-label="AI Chat">
        <AiChatView compact />
      </aside>
    </section>
  );
};
