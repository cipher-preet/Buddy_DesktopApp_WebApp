import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiFolder,
  FiSearch,
  FiShare2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';

import type { DocumentTemplate } from './documentTemplates';

type DocumentTemplateDetailProps = {
  template: DocumentTemplate;
  Icon: IconType;
  onBack: () => void;
};

export const DocumentTemplateDetail = ({ template, Icon, onBack }: DocumentTemplateDetailProps) => {
  const { showToast } = useToast();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.userId || '';
  const displayName = user?.name || user?.email || 'KukuNotes';
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [spaceQuery, setSpaceQuery] = useState('');
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [confirmedSpaces, setConfirmedSpaces] = useState<Array<{ id: string; name: string }>>([]);
  const [pickerStyle, setPickerStyle] = useState<CSSProperties>({});

  const {
    data: spacesData,
    isLoading: isSpacesLoading,
    isError: isSpacesError,
    refetch: refetchSpaces,
  } = useGetUserSpacesInfiniteQuery({ userId, limit: 40 }, { skip: !userId || !isPickerOpen });

  const spaces = useMemo(
    () => spacesData?.pages.flatMap((page) => page.spaces) ?? [],
    [spacesData],
  );

  const filteredSpaces = useMemo(() => {
    const query = spaceQuery.trim().toLowerCase();
    if (!query) {
      return spaces;
    }
    return spaces.filter(
      (space) =>
        space.name.toLowerCase().includes(query) ||
        space.description.toLowerCase().includes(query),
    );
  }, [spaceQuery, spaces]);

  const hasConfirmedSpaces = confirmedSpaces.length > 0;

  const updatePickerPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.min(280, window.innerWidth - 24);
    const gap = 8;
    const maxMenuHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(160, openUpward ? spaceAbove : spaceBelow);
    const menuHeight = Math.min(maxMenuHeight, availableHeight);

    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - menuWidth - 12);
    }

    setPickerStyle({
      position: 'fixed',
      left,
      width: menuWidth,
      maxHeight: menuHeight,
      top: openUpward ? undefined : rect.bottom + gap,
      bottom: openUpward ? window.innerHeight - rect.top + gap : undefined,
      zIndex: 1200,
    });
  };

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    updatePickerPosition();

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsPickerOpen(false);
        setSpaceQuery('');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickerOpen(false);
        setSpaceQuery('');
      }
    };

    const handleReposition = () => updatePickerPosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isPickerOpen, confirmedSpaces.length]);

  const togglePicker = () => {
    if (isPickerOpen) {
      setIsPickerOpen(false);
      setSpaceQuery('');
      return;
    }
    setSelectedSpaceIds(confirmedSpaces.map((space) => space.id));
    setSpaceQuery('');
    // Position first so the menu is fully visible even when selected chips push the button down.
    requestAnimationFrame(() => {
      updatePickerPosition();
      setIsPickerOpen(true);
    });
  };

  const toggleSpace = (spaceId: string) => {
    setSelectedSpaceIds((current) =>
      current.includes(spaceId)
        ? current.filter((id) => id !== spaceId)
        : [...current, spaceId],
    );
  };

  const handleConfirmSpaces = () => {
    if (selectedSpaceIds.length === 0) {
      showToast({ message: 'Select at least one space.', type: 'error' });
      return;
    }
    const next = selectedSpaceIds.map((id) => {
      const match = spaces.find((space) => space.id === id);
      const existing = confirmedSpaces.find((space) => space.id === id);
      return { id, name: match?.name ?? existing?.name ?? 'Selected space' };
    });
    setConfirmedSpaces(next);
    setIsPickerOpen(false);
    setSpaceQuery('');
  };

  const removeConfirmedSpace = (spaceId: string) => {
    setConfirmedSpaces((current) => current.filter((space) => space.id !== spaceId));
    setSelectedSpaceIds((current) => current.filter((id) => id !== spaceId));
  };

  const handleDocumentIt = () => {
    if (confirmedSpaces.length === 0) {
      showToast({ message: 'Select at least one space first.', type: 'error' });
      return;
    }
    const names = confirmedSpaces.map((space) => space.name).join(', ');
    showToast({
      message: `Document it is ready for ${confirmedSpaces.length} space${confirmedSpaces.length === 1 ? '' : 's'}: ${names}. Generation comes next.`,
      type: 'success',
    });
  };

  return (
    <div className="document-detail">
      <button type="button" className="document-detail__back" onClick={onBack}>
        <FiArrowLeft aria-hidden="true" size={16} />
        Back to templates
      </button>

      <div className="document-detail__layout">
        <aside className="document-detail__aside">
          <div className="document-detail__author">
            <span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
            <strong>{displayName}</strong>
          </div>

          <h1>{template.title}</h1>
          <p>{template.tagline}</p>

          <div className="document-detail__actions">
            {hasConfirmedSpaces ? (
              <div className="document-detail__selected-list">
                {confirmedSpaces.map((space) => (
                  <span key={space.id} className="document-detail__tag">
                    {space.name}
                    <button
                      type="button"
                      className="document-detail__tag-remove"
                      aria-label={`Remove ${space.name}`}
                      onClick={() => removeConfirmedSpace(space.id)}
                    >
                      <FiX aria-hidden="true" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="document-detail__action-row">
              {hasConfirmedSpaces ? (
                <button
                  type="button"
                  className="document-detail__primary document-detail__primary--brand"
                  onClick={handleDocumentIt}
                >
                  <FiZap aria-hidden="true" size={16} />
                  Document it
                </button>
              ) : null}

              <div className="document-space-picker-anchor" ref={pickerRef}>
                <button
                  ref={triggerRef}
                  type="button"
                  className={`document-detail__primary${hasConfirmedSpaces ? ' document-detail__primary--ghost' : ''}${isPickerOpen ? ' is-open' : ''}`}
                  aria-expanded={isPickerOpen}
                  aria-haspopup="dialog"
                  onClick={togglePicker}
                >
                  <FiFolder aria-hidden="true" size={16} />
                  {hasConfirmedSpaces ? 'Change spaces' : 'Select Space'}
                  <FiChevronDown
                    aria-hidden="true"
                    size={14}
                    className={`document-space-picker-chevron${isPickerOpen ? ' is-open' : ''}`}
                  />
                </button>

                {isPickerOpen ? (
                  <div
                    className="document-space-picker"
                    role="dialog"
                    aria-label="Select spaces"
                    style={pickerStyle}
                  >
                    <label className="document-space-picker__search">
                      <FiSearch aria-hidden="true" size={14} />
                      <input
                        type="search"
                        value={spaceQuery}
                        onChange={(event) => setSpaceQuery(event.target.value)}
                        placeholder="Search spaces"
                        autoFocus
                      />
                    </label>

                    <div className="document-space-picker__body">
                      {!userId ? (
                        <div className="document-space-picker__empty">
                          <p>Sign in to load spaces</p>
                        </div>
                      ) : null}

                      {userId && isSpacesLoading ? (
                        <div className="document-space-picker__empty" aria-busy="true">
                          <span className="home-spinner" />
                          <p>Loading spaces…</p>
                        </div>
                      ) : null}

                      {userId && isSpacesError && !isSpacesLoading ? (
                        <div className="document-space-picker__empty" role="alert">
                          <p>Unable to load spaces</p>
                          <button
                            type="button"
                            className="home-retry-button"
                            onClick={() => void refetchSpaces()}
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}

                      {userId && !isSpacesLoading && !isSpacesError && filteredSpaces.length === 0 ? (
                        <div className="document-space-picker__empty">
                          <p>No spaces found</p>
                          <span>
                            {spaces.length === 0
                              ? 'Create a space on Home first.'
                              : 'Try another search term.'}
                          </span>
                        </div>
                      ) : null}

                      {userId && !isSpacesLoading && !isSpacesError && filteredSpaces.length > 0 ? (
                        <ul className="document-space-picker__list">
                          {filteredSpaces.map((space) => {
                            const selected = selectedSpaceIds.includes(space.id);
                            return (
                              <li key={space.id}>
                                <button
                                  type="button"
                                  className={`document-space-picker__item${selected ? ' is-selected' : ''}`}
                                  onClick={() => toggleSpace(space.id)}
                                  aria-pressed={selected}
                                >
                                  <span className="document-space-picker__check" aria-hidden="true">
                                    {selected ? <FiCheck size={12} /> : null}
                                  </span>
                                  <span className="document-space-picker__item-copy">
                                    <strong>{space.name}</strong>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>

                    <div className="document-space-picker__footer">
                      <span>{selectedSpaceIds.length} selected</span>
                      <button
                        type="button"
                        className="document-space-picker__confirm"
                        disabled={selectedSpaceIds.length === 0}
                        onClick={handleConfirmSpaces}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <button type="button" className="document-detail__secondary">
                Preview
              </button>
              <button type="button" className="document-detail__icon-btn" aria-label="Share template">
                <FiShare2 aria-hidden="true" size={16} />
              </button>
            </div>
          </div>
        </aside>

        <div className="document-detail__stage">
          <article className="document-detail__card">
            <span className="document-detail__card-icon" aria-hidden="true">
              <Icon size={28} strokeWidth={1.5} />
            </span>
            <h2>{template.title}</h2>
            <p className="document-detail__card-copy">{template.description}</p>

            <ul className="document-detail__features">
              {template.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <section className="document-detail__block">
              <h3>What to Act On</h3>
              <p className="document-detail__hint">Define the exact scope:</p>
              <ul className="document-detail__scopes">
                {template.scopes.map((scope) => (
                  <li key={scope.label}>
                    <strong>{scope.label}</strong>
                    <span> — {scope.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="document-detail__footnote">Do not mix scopes.</p>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
};
