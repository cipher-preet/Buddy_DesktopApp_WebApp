import { useState } from 'react';
import {
  FiCalendar,
  FiCheck,
  FiCopy,
  FiDownload,
  FiLink,
  FiMail,
  FiShare2,
  FiVideo,
} from 'react-icons/fi';

import { AiChatView } from '@/features/ai-chat/AiChatView';

type SidePanelTab = 'ai-chat' | 'meetings' | 'share';

type SidePanelContentProps = {
  activeTab: SidePanelTab;
  onStartRecording?: () => void;
};

const upcomingMeetings = [
  {
    id: 'm1',
    title: 'Product planning sync',
    time: 'Today · 2:30 PM',
    platform: 'Google Meet',
  },
  {
    id: 'm2',
    title: 'Customer kickoff',
    time: 'Tomorrow · 11:00 AM',
    platform: 'Zoom',
  },
];

export const SidePanelContent = ({ activeTab, onStartRecording }: SidePanelContentProps) => {
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState('');

  const copyShareLink = async () => {
    const link = 'https://buddy.app/share/workspace-home';
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard may be unavailable in some Electron contexts; still show success UI.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (activeTab === 'ai-chat') {
    return <AiChatView compact />;
  }

  if (activeTab === 'meetings') {
    return (
      <div className="side-panel-meetings" aria-label="Meetings">
        <section>
          <h2>Record a live meeting</h2>
          <p>Works with Zoom, Google Meet, or Microsoft Teams.</p>
          <button className="meeting-url-button" type="button" onClick={onStartRecording}>
            <FiVideo aria-hidden="true" size={16} />
            <span>Paste meeting URL or start recording</span>
          </button>
        </section>

        <section>
          <h2>Record upcoming meetings</h2>
          <p>Connect your calendar to get automatic notes.</p>
          <div className="calendar-actions">
            <button type="button">
              <FiCalendar aria-hidden="true" size={16} />
              <span>Google</span>
            </button>
            <button type="button">
              <FiCalendar aria-hidden="true" size={16} />
              <span>Outlook</span>
            </button>
          </div>
        </section>

        <section>
          <h2>Upcoming</h2>
          <div className="side-panel-meetings__list">
            {upcomingMeetings.map((meeting) => (
              <article key={meeting.id} className="side-panel-meeting-card">
                <strong>{meeting.title}</strong>
                <span>{meeting.time}</span>
                <small>{meeting.platform}</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="side-panel-share" aria-label="Share">
      <section>
        <h2>Share this workspace</h2>
        <p>Invite teammates or send a read-only link to the current Buddy space.</p>
      </section>

      <div className="side-panel-share__actions">
        <button type="button" onClick={copyShareLink}>
          {copied ? <FiCheck aria-hidden="true" size={16} /> : <FiLink aria-hidden="true" size={16} />}
          <span>{copied ? 'Link copied' : 'Copy share link'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = `mailto:?subject=${encodeURIComponent('Buddy workspace')}&body=${encodeURIComponent(
              'Join this Buddy workspace: https://buddy.app/share/workspace-home',
            )}`;
          }}
        >
          <FiMail aria-hidden="true" size={16} />
          <span>Share by email</span>
        </button>
        <button type="button">
          <FiDownload aria-hidden="true" size={16} />
          <span>Export summary</span>
        </button>
        <button type="button">
          <FiCopy aria-hidden="true" size={16} />
          <span>Copy invite text</span>
        </button>
      </div>

      <label className="side-panel-share__note">
        Message
        <textarea
          value={shareNote}
          onChange={(event) => setShareNote(event.target.value)}
          placeholder="Add a short note for people you invite..."
          maxLength={280}
        />
        <span>{shareNote.trim().length}/280</span>
      </label>

      <button className="settings-primary-button side-panel-share__submit" type="button">
        <FiShare2 aria-hidden="true" size={15} />
        Send invite
      </button>
    </div>
  );
};

export type { SidePanelTab };
