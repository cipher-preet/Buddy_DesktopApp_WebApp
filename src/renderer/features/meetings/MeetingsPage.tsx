import { useMemo, useState } from 'react';
import {
  FiCalendar,
  FiClock,
  FiFilter,
  FiGrid,
  FiList,
  FiMic,
  FiMoreVertical,
  FiPlus,
  FiTag,
  FiUsers,
  FiVideo,
  FiX,
} from 'react-icons/fi';

import { MeetingDetailView } from './MeetingDetailView';
import { MEETINGS } from './meetingsData';
import type { MeetingRecord, MeetingScope } from './meetingsTypes';

type ViewMode = 'grid' | 'list';

const SCOPE_TABS: Array<{ id: MeetingScope; label: string }> = [
  { id: 'all', label: 'All Meetings' },
  { id: 'mine', label: 'My Meetings' },
  { id: 'shared', label: 'Shared with me' },
];

const MeetingThumbnail = ({ meeting }: { meeting: MeetingRecord }) => (
  <div className={`meeting-card__thumb meeting-card__thumb--${meeting.thumbnailTone}`}>
    <img src={meeting.coverImage} alt="" className="meeting-card__image" />
    <div className="meeting-card__controls" aria-hidden="true">
      <span className="is-video">
        <FiVideo size={12} />
      </span>
      <span className="is-mic">
        <FiMic size={12} />
      </span>
      <span className="is-end" />
    </div>
  </div>
);

export const MeetingsPage = () => {
  const [scope, setScope] = useState<MeetingScope>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  const selectedMeeting = useMemo(
    () => MEETINGS.find((meeting) => meeting.id === selectedId) ?? null,
    [selectedId],
  );

  const myMeetingsCount = useMemo(
    () => MEETINGS.filter((meeting) => meeting.scope === 'mine').length,
    [],
  );

  const filteredMeetings = useMemo(() => {
    return MEETINGS.filter((meeting) => {
      if (scope === 'mine' && meeting.scope !== 'mine') return false;
      if (scope === 'shared' && meeting.scope !== 'shared') return false;
      if (ownerFilter && meeting.owner !== ownerFilter) return false;
      if (tagFilter && !meeting.tags.includes(tagFilter as MeetingRecord['tags'][number])) {
        return false;
      }
      return true;
    });
  }, [ownerFilter, scope, tagFilter]);

  if (selectedMeeting) {
    return <MeetingDetailView meeting={selectedMeeting} onBack={() => setSelectedId(null)} />;
  }

  return (
    <section className="meetings-page" aria-label="Meetings">
      <header className="meetings-page__header">
        <div className="meetings-page__title">
          <span className="meetings-page__icon" aria-hidden="true">
            <FiVideo size={18} />
          </span>
          <div>
            <h1>Meetings</h1>
            <p>Recordings, summaries, and shared sessions</p>
          </div>
        </div>
        <div className="meetings-page__header-actions">
          <button type="button" className="meetings-page__add">
            <FiPlus aria-hidden="true" size={16} />
            Add
          </button>
          <button type="button" className="meetings-page__more" aria-label="More meeting actions">
            <FiMoreVertical size={18} />
          </button>
        </div>
      </header>

      <div className="meetings-page__tabs" role="tablist" aria-label="Meeting scope">
        {SCOPE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={scope === tab.id}
            className={`meetings-page__tab${scope === tab.id ? ' is-active' : ''}`}
            onClick={() => setScope(tab.id)}
          >
            {tab.label}
            {tab.id === 'mine' ? <span>{myMeetingsCount}</span> : null}
          </button>
        ))}
      </div>

      <div className="meetings-page__filters">
        <div className="meetings-filters">
          {dateFilter ? (
            <div className="meetings-filter-chip">
              <FiCalendar aria-hidden="true" size={14} />
              <span>
                Date is <strong>{dateFilter}</strong>
              </span>
              <button
                type="button"
                className="meetings-filter-chip__clear"
                aria-label="Clear date filter"
                onClick={() => setDateFilter(null)}
              >
                <FiX size={13} />
              </button>
            </div>
          ) : (
            <button type="button" className="meetings-filter-chip is-empty" onClick={() => setDateFilter('After May 1')}>
              <FiCalendar aria-hidden="true" size={14} />
              Date
            </button>
          )}

          {ownerFilter ? (
            <div className="meetings-filter-chip">
              <FiUsers aria-hidden="true" size={14} />
              <span>
                Owner is <strong>{ownerFilter}</strong>
              </span>
              <button
                type="button"
                className="meetings-filter-chip__clear"
                aria-label="Clear owner filter"
                onClick={() => setOwnerFilter(null)}
              >
                <FiX size={13} />
              </button>
            </div>
          ) : (
            <button type="button" className="meetings-filter-chip is-empty" onClick={() => setOwnerFilter('Arafat')}>
              <FiUsers aria-hidden="true" size={14} />
              Owner
            </button>
          )}

          {tagFilter ? (
            <div className="meetings-filter-chip">
              <FiTag aria-hidden="true" size={14} />
              <span>
                Tags <strong className="is-accent">{tagFilter}</strong>
              </span>
              <button
                type="button"
                className="meetings-filter-chip__clear"
                aria-label="Clear tag filter"
                onClick={() => setTagFilter(null)}
              >
                <FiX size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="meetings-filter-chip is-empty"
              onClick={() => setTagFilter('General meeting')}
            >
              <FiTag aria-hidden="true" size={14} />
              Tags
            </button>
          )}

          <button type="button" className="meetings-filter-chip is-empty">
            <FiFilter aria-hidden="true" size={14} />
            Participants
          </button>
        </div>

        <div className="meetings-view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={viewMode === 'grid' ? 'is-active' : undefined}
            aria-pressed={viewMode === 'grid'}
            aria-label="Grid view"
            onClick={() => setViewMode('grid')}
          >
            <FiGrid size={16} />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'is-active' : undefined}
            aria-pressed={viewMode === 'list'}
            aria-label="List view"
            onClick={() => setViewMode('list')}
          >
            <FiList size={16} />
          </button>
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="meetings-empty">
          <FiVideo aria-hidden="true" size={28} />
          <h2>No meetings match these filters</h2>
          <p>Clear a filter or switch tabs to see more recordings.</p>
        </div>
      ) : (
        <div className={`meetings-grid${viewMode === 'list' ? ' is-list' : ''}`}>
          {filteredMeetings.map((meeting) => (
            <button
              key={meeting.id}
              type="button"
              className="meeting-card"
              onClick={() => setSelectedId(meeting.id)}
            >
              <MeetingThumbnail meeting={meeting} />
              <div className="meeting-card__body">
                <h2>{meeting.title}</h2>
                <div className="meeting-card__meta">
                  <span>
                    <FiCalendar aria-hidden="true" size={13} />
                    {meeting.dateLabel}
                  </span>
                  <span>
                    <FiClock aria-hidden="true" size={13} />
                    {meeting.startLabel}
                  </span>
                  <span>
                    <FiClock aria-hidden="true" size={13} />
                    {meeting.endLabel}
                  </span>
                  <span>
                    <FiUsers aria-hidden="true" size={13} />
                    {meeting.participantCount}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
