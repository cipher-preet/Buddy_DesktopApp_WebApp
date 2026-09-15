import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowUp,
  FiChevronDown,
  FiCopy,
  FiEdit2,
  FiFolder,
  FiHash,
  FiRefreshCw,
  FiSearch,
  FiThumbsDown,
  FiThumbsUp,
  FiTrash2,
} from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

type AiChatViewProps = {
  compact?: boolean;
};

type ContextItem = {
  id: string;
  title: string;
  subtitle?: string;
};

const CONTEXT_CHANNELS: ContextItem[] = [{ id: 'channel-general', title: 'General' }];

const CONTEXT_CONVERSATIONS: ContextItem[] = [
  {
    id: 'conv-1',
    title: 'Data Analyst and Operations Roles',
    subtitle: 'Today, Sep 15 11:48 AM',
  },
  {
    id: 'conv-2',
    title: 'Note',
    subtitle: 'Sep 13 06:11 PM',
  },
  {
    id: 'conv-3',
    title: 'Greeting',
    subtitle: 'Today, Sep 15 10:02 AM',
  },
];

const CONTEXT_SPACES: ContextItem[] = [
  { id: 'space-product', title: 'Product' },
  { id: 'space-engineering', title: 'Engineering' },
  { id: 'space-onboarding', title: 'Onboarding' },
  { id: 'space-marketing', title: 'Marketing' },
  { id: 'space-finance', title: 'Finance' },
];

export const AiChatView = ({ compact = false }: AiChatViewProps) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [contextQuery, setContextQuery] = useState('');
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const contextAnchorRef = useRef<HTMLDivElement>(null);
  const contextSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isContextOpen) {
      return undefined;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!contextAnchorRef.current?.contains(event.target as Node)) {
        setIsContextOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsContextOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => contextSearchRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isContextOpen]);

  const normalizedQuery = contextQuery.trim().toLowerCase();

  const filteredChannels = useMemo(
    () =>
      CONTEXT_CHANNELS.filter((item) =>
        normalizedQuery ? item.title.toLowerCase().includes(normalizedQuery) : true,
      ),
    [normalizedQuery],
  );

  const filteredConversations = useMemo(
    () =>
      CONTEXT_CONVERSATIONS.filter((item) =>
        normalizedQuery
          ? item.title.toLowerCase().includes(normalizedQuery) ||
            (item.subtitle?.toLowerCase().includes(normalizedQuery) ?? false)
          : true,
      ),
    [normalizedQuery],
  );

  const filteredSpaces = useMemo(
    () =>
      CONTEXT_SPACES.filter((item) =>
        normalizedQuery ? item.title.toLowerCase().includes(normalizedQuery) : true,
      ),
    [normalizedQuery],
  );

  const toggleContextItem = (id: string) => {
    setSelectedContextIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const selectedLabels = useMemo(() => {
    const catalog = [...CONTEXT_CHANNELS, ...CONTEXT_CONVERSATIONS, ...CONTEXT_SPACES];
    return selectedContextIds
      .map((id) => catalog.find((item) => item.id === id)?.title)
      .filter((title): title is string => Boolean(title));
  }, [selectedContextIds]);

  return (
    <section
      className={`ai-chat-page${compact ? ' ai-chat-page--panel' : ''}`}
      aria-label="AI Chat"
    >
      <header className="ai-chat-header">
        <div className="ai-chat-history-anchor">
          <button
            className="ai-chat-title"
            type="button"
            aria-expanded={isHistoryOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setIsHistoryOpen((isOpen) => !isOpen);
              setIsContextOpen(false);
            }}
          >
            <RiRobot2Line aria-hidden="true" size={18} />
            <span>Greeting</span>
            <FiChevronDown aria-hidden="true" size={14} />
          </button>

          {isHistoryOpen ? (
            <div className="chat-history-popover" role="dialog" aria-label="Chat history">
              <section>
                <h2>Today</h2>
                <button className="chat-history-item is-active" type="button">
                  <strong>Greeting</strong>
                  <span>8m ago</span>
                </button>
              </section>

              <section>
                <h2>Past week</h2>
                <button className="chat-history-item" type="button">
                  <strong>Decisions Made</strong>
                  <span>1d ago</span>
                </button>
                <button className="chat-history-item" type="button">
                  <strong>Review Follow-up Tasks</strong>
                  <span>5d ago</span>
                </button>
              </section>

              <section>
                <h2>Older</h2>
                <button className="chat-history-item" type="button">
                  <strong>Learn about AI Chat</strong>
                  <span>Sep 4</span>
                </button>
              </section>
            </div>
          ) : null}
        </div>
        <button className="ai-chat-new" type="button">
          <FiEdit2 aria-hidden="true" size={16} />
          <span>New</span>
        </button>
      </header>

      <div className="ai-chat-scroll">
        <div className="ai-chat-thread">
          <article className="chat-turn chat-turn--user">
            <div className="chat-bubble">hi</div>
            <div className="chat-message-actions" aria-label="Message actions">
              <button type="button" aria-label="Copy message">
                <FiCopy aria-hidden="true" size={15} />
              </button>
              <button type="button" aria-label="Edit message">
                <FiEdit2 aria-hidden="true" size={15} />
              </button>
              <button type="button" aria-label="Delete message">
                <FiTrash2 aria-hidden="true" size={15} />
              </button>
            </div>
          </article>

          <article className="chat-turn chat-turn--assistant">
            <button className="thinking-toggle" type="button">
              <span>Show thinking</span>
              <FiChevronDown aria-hidden="true" size={14} />
            </button>
            <div className="assistant-message">
              <p>Hi Preet! How can I help you today?</p>
            </div>
            <div className="assistant-actions" aria-label="Assistant response actions">
              <button type="button" aria-label="Copy response">
                <FiCopy aria-hidden="true" size={15} />
              </button>
              <button type="button" aria-label="Good response">
                <FiThumbsUp aria-hidden="true" size={15} />
              </button>
              <button type="button" aria-label="Bad response">
                <FiThumbsDown aria-hidden="true" size={15} />
              </button>
              <button type="button" aria-label="Regenerate response">
                <FiRefreshCw aria-hidden="true" size={15} />
              </button>
            </div>
          </article>

          <article className="chat-turn chat-turn--user">
            <div className="chat-bubble">tell me about my notes</div>
            <div className="chat-message-actions" aria-label="Message actions">
              <button type="button" aria-label="Copy message">
                <FiCopy aria-hidden="true" size={15} />
              </button>
              <button type="button" aria-label="Edit message">
                <FiEdit2 aria-hidden="true" size={15} />
              </button>
              <button type="button" aria-label="Delete message">
                <FiTrash2 aria-hidden="true" size={15} />
              </button>
            </div>
          </article>

          <article className="chat-turn chat-turn--assistant">
            <button className="thinking-toggle" type="button">
              <span>Show thinking</span>
              <FiChevronDown aria-hidden="true" size={14} />
            </button>
            <div className="assistant-message assistant-message--rich">
              <p>Here is what I found about your notes:</p>

              <h2>Your Existing Note</h2>
              <p>
                You currently have <strong>one recording titled “Note”</strong> from 2026-09-13.
              </p>

              <h3>What this note is about</h3>
              <p>
                From the transcript, this note appears to be about an app idea connected to a company
                called “Surecon” or something similar. The note captures early thinking about how that
                app could help organize architecture-level services and daily operations.
              </p>

              <ul>
                <li>
                  It describes a company that builds <strong>architecture-level services</strong>, such
                  as buildings, portals, and related operational systems.
                </li>
                <li>
                  You are brainstorming an app to <strong>manage Surecon-related operations</strong> in
                  one place, including notes, tasks, and follow-up work.
                </li>
              </ul>
            </div>
          </article>
        </div>
      </div>

      <form
        className="ai-composer"
        aria-label="Ask AI Chat"
        onSubmit={(event) => {
          event.preventDefault();
          setDraft('');
        }}
      >
        <div className="ai-composer__box">
          {selectedLabels.length > 0 ? (
            <div className="ai-context-chips" aria-label="Selected context">
              {selectedLabels.map((label) => (
                <span key={label} className="ai-context-chip">
                  @{label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="add-context-anchor" ref={contextAnchorRef}>
            <button
              className={`add-context-button${isContextOpen ? ' is-open' : ''}`}
              type="button"
              aria-expanded={isContextOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setIsContextOpen((open) => !open);
                setIsHistoryOpen(false);
              }}
            >
              <span className="add-context-button__at" aria-hidden="true">
                @
              </span>
              <span>Add context</span>
            </button>

            {isContextOpen ? (
              <div className="add-context-popover" role="dialog" aria-label="Add context">
                <label className="add-context-search">
                  <FiSearch aria-hidden="true" size={16} />
                  <input
                    ref={contextSearchRef}
                    value={contextQuery}
                    onChange={(event) => setContextQuery(event.target.value)}
                    placeholder="Search"
                    aria-label="Search context"
                  />
                </label>

                <div className="add-context-popover__body">
                  {filteredChannels.length > 0 ? (
                    <section className="add-context-section">
                      <h2>Channels</h2>
                      {filteredChannels.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`add-context-item${selectedContextIds.includes(item.id) ? ' is-selected' : ''}`}
                          onClick={() => toggleContextItem(item.id)}
                        >
                          <FiHash aria-hidden="true" size={15} />
                          <strong>{item.title}</strong>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {filteredConversations.length > 0 ? (
                    <section className="add-context-section">
                      <h2>Conversations</h2>
                      {filteredConversations.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`add-context-item add-context-item--stack${selectedContextIds.includes(item.id) ? ' is-selected' : ''}`}
                          onClick={() => toggleContextItem(item.id)}
                        >
                          <span className="add-context-item__text">
                            <strong>{item.title}</strong>
                            {item.subtitle ? <small>{item.subtitle}</small> : null}
                          </span>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {filteredSpaces.length > 0 ? (
                    <section className="add-context-section">
                      <h2>Spaces</h2>
                      {filteredSpaces.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`add-context-item${selectedContextIds.includes(item.id) ? ' is-selected' : ''}`}
                          onClick={() => toggleContextItem(item.id)}
                        >
                          <FiFolder aria-hidden="true" size={15} />
                          <strong>{item.title}</strong>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {filteredChannels.length === 0 &&
                  filteredConversations.length === 0 &&
                  filteredSpaces.length === 0 ? (
                    <div className="add-context-empty">
                      <p>No matches</p>
                      <span>Try another search term.</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <textarea
            placeholder="Ask anything about your conversations"
            rows={compact ? 2 : 2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="ai-composer__footer">
            <button type="button">Advanced</button>
            <button className="send-button" type="submit" aria-label="Send message">
              <FiArrowUp aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
