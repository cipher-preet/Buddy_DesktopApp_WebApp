import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  FiAlertCircle,
  FiArrowUp,
  FiChevronDown,
  FiCopy,
  FiEdit2,
  FiFolder,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { ChatMarkdown } from '@/features/ai-chat/ChatMarkdown';
import type { ChatThreadMessage } from '@/features/ai-chat/chatTypes';
import {
  formatHistoryMeta,
  getChatErrorMessage,
  groupChatSessions,
  titleFromQuestion,
} from '@/features/ai-chat/chatUtils';
import {
  useAskBuddyMutation,
  useCreateChatSessionMutation,
  useGetChatSessionsInfiniteQuery,
  useLazyGetChatSessionByIdQuery,
} from '@/services/chatApi';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';

type AiChatViewProps = {
  compact?: boolean;
};

const SESSIONS_PAGE_SIZE = 20;
const SUGGESTIONS = [
  'Summarize my day',
  'What tasks are still open?',
  'Tell me about my notes',
];

export const AiChatView = ({ compact = false }: AiChatViewProps) => {
  const { showToast } = useToast();
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const userName = useAppSelector((state) => state.auth.user?.name) || 'there';

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [contextQuery, setContextQuery] = useState('');
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const historyAnchorRef = useRef<HTMLDivElement>(null);
  const contextAnchorRef = useRef<HTMLDivElement>(null);
  const contextSearchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const sendingLockRef = useRef(false);

  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    isFetching: isSessionsFetching,
    isError: isSessionsError,
    error: sessionsError,
    refetch: refetchSessions,
    fetchNextPage: fetchNextSessionsPage,
    hasNextPage: hasMoreSessions,
    isFetchingNextPage: isFetchingMoreSessions,
  } = useGetChatSessionsInfiniteQuery(
    { userId: userId || '', limit: SESSIONS_PAGE_SIZE },
    { skip: !userId },
  );

  const {
    data: spacesData,
    isLoading: isSpacesLoading,
    isError: isSpacesError,
    refetch: refetchSpaces,
  } = useGetUserSpacesInfiniteQuery({ userId: userId || '', limit: 20 }, { skip: !userId });

  const [createChatSession] = useCreateChatSessionMutation();
  const [loadChatSession] = useLazyGetChatSessionByIdQuery();
  const [askBuddy] = useAskBuddyMutation();

  const sessions = useMemo(() => {
    const items = sessionsData?.pages.flatMap((page) => page.chats) ?? [];
    return [...items].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }, [sessionsData]);

  const historyGroups = useMemo(() => groupChatSessions(sessions), [sessions]);
  const spaces = useMemo(
    () => spacesData?.pages.flatMap((page) => page.spaces) ?? [],
    [spacesData],
  );

  const selectedSpaceId = selectedSpaceIds[selectedSpaceIds.length - 1] ?? null;
  const selectedSpaces = useMemo(
    () =>
      selectedSpaceIds
        .map((id) => spaces.find((space) => space.id === id))
        .filter((space): space is (typeof spaces)[number] => Boolean(space)),
    [selectedSpaceIds, spaces],
  );

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const headerTitle = useMemo(() => {
    if (!activeSessionId) {
      return 'New chat';
    }

    if (activeSession?.title && activeSession.title !== 'New chat') {
      return activeSession.title;
    }

    const firstUserMessage = messages.find((message) => message.role === 'user' && message.content.trim());
    return firstUserMessage ? titleFromQuestion(firstUserMessage.content) : 'New chat';
  }, [activeSession, activeSessionId, messages]);

  const sessionsErrorMessage = isSessionsError
    ? getChatErrorMessage(sessionsError, 'Unable to load chat history')
    : null;
  const showSessionsInitialLoading = Boolean(userId) && isSessionsLoading && sessions.length === 0;
  const showLanding = !isThreadLoading && !threadError && messages.length === 0 && !isSending;
  const canSend = Boolean(draft.trim()) && !isSending && !isThreadLoading;
  const lastAssistantIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') {
        return index;
      }
    }

    return -1;
  }, [messages]);

  useEffect(() => {
    if (!isHistoryOpen && !isContextOpen) {
      return undefined;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isHistoryOpen && !historyAnchorRef.current?.contains(target)) {
        setIsHistoryOpen(false);
      }
      if (isContextOpen && !contextAnchorRef.current?.contains(target)) {
        setIsContextOpen(false);
      }
    };

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHistoryOpen(false);
        setIsContextOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    if (isContextOpen) {
      window.setTimeout(() => contextSearchRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isContextOpen, isHistoryOpen]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending, isThreadLoading]);

  const normalizedQuery = contextQuery.trim().toLowerCase();
  const filteredSpaces = useMemo(
    () =>
      spaces.filter((space) =>
        normalizedQuery ? space.name.toLowerCase().includes(normalizedQuery) : true,
      ),
    [normalizedQuery, spaces],
  );

  const toggleSpaceContext = (id: string) => {
    setSelectedSpaceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const removeSpaceContext = (id: string) => {
    setSelectedSpaceIds((current) => current.filter((item) => item !== id));
  };

  const resetComposer = () => {
    setDraft('');
    setIsContextOpen(false);
    setIsHistoryOpen(false);
    setThreadError(null);
    setIsThreadLoading(false);
    setIsSending(false);
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    resetComposer();
    composerRef.current?.focus();
  };

  const handleSelectSession = async (sessionId: string) => {
    if (!userId) {
      showToast({
        message: 'Please sign in again',
        description: 'Your session is missing, so chat history cannot be opened.',
        type: 'error',
      });
      return;
    }

    setActiveSessionId(sessionId);
    setIsHistoryOpen(false);
    setIsContextOpen(false);
    setThreadError(null);
    setIsThreadLoading(true);

    try {
      const data = await loadChatSession({ userId, sessionId }).unwrap();
      setActiveSessionId(data.chat.id);
      setMessages(data.messages);
      if (data.chat.spaceId) {
        setSelectedSpaceIds((current) =>
          current.includes(data.chat.spaceId as string) ? current : [...current, data.chat.spaceId as string],
        );
      }
    } catch (error) {
      const message = getChatErrorMessage(error, 'Unable to load this chat');
      setThreadError(message);
      setMessages([]);
      showToast({ message: 'Unable to load chat', description: message, type: 'error' });
    } finally {
      setIsThreadLoading(false);
    }
  };

  const ensureActiveSession = async () => {
    if (!userId) {
      throw new Error('Please sign in again to continue.');
    }

    if (activeSessionId) {
      return activeSessionId;
    }

    const session = await createChatSession({
      userId,
      ...(selectedSpaceId ? { spaceId: selectedSpaceId } : {}),
    }).unwrap();
    setActiveSessionId(session.id);
    return session.id;
  };

  const handleSend = async (text?: string, options?: { appendUser?: boolean }) => {
    const trimmed = (text ?? draft).trim();
    if (!trimmed || sendingLockRef.current || isSending || isThreadLoading || !userId) {
      return;
    }

    sendingLockRef.current = true;
    setDraft('');
    setIsContextOpen(false);
    setIsHistoryOpen(false);
    setThreadError(null);

    if (options?.appendUser !== false) {
      const userMessage: ChatThreadMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      setMessages((current) => [...current, userMessage]);
    }
    setIsSending(true);

    let sessionId: string | null = activeSessionId;
    try {
      sessionId = await ensureActiveSession();
    } catch {
      sessionId = null;
    }

    try {
      const result = await askBuddy({
        userId,
        question: trimmed,
        ...(sessionId ? { chatId: sessionId } : {}),
        ...(selectedSpaceId ? { spaceId: selectedSpaceId } : {}),
      }).unwrap();

      if (result.chatId && result.chatId !== sessionId) {
        setActiveSessionId(result.chatId);
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.answer?.trim() || 'Buddy did not return a response.',
        },
      ]);
    } catch (error) {
      const message = getChatErrorMessage(error, 'Buddy could not answer that question');
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: message,
          isError: true,
        },
      ]);
      showToast({ message: 'Message failed', description: message, type: 'error' });
    } finally {
      sendingLockRef.current = false;
      setIsSending(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast({ message: 'Copied', type: 'success' });
    } catch {
      showToast({ message: 'Unable to copy', type: 'error' });
    }
  };

  const handleEdit = (content: string) => {
    setDraft(content);
    composerRef.current?.focus();
  };

  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user' && !message.isError);
    if (!lastUserMessage || isSending) {
      return;
    }

    let lastAssistantIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') {
        lastAssistantIndex = index;
        break;
      }
    }

    if (lastAssistantIndex >= 0) {
      setMessages(messages.slice(0, lastAssistantIndex));
    }

    void handleSend(lastUserMessage.content, { appendUser: false });
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <section
      className={`ai-chat-page${compact ? ' ai-chat-page--panel' : ''}`}
      aria-label="AI Chat"
    >
      <header className="ai-chat-header">
        <div className="ai-chat-history-anchor" ref={historyAnchorRef}>
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
            <span>{headerTitle}</span>
            <FiChevronDown aria-hidden="true" size={14} />
          </button>

          {isHistoryOpen ? (
            <div className="chat-history-popover" role="dialog" aria-label="Chat history">
              {showSessionsInitialLoading ? (
                <div className="ai-chat-inline-state" aria-busy="true">
                  <span className="home-spinner" />
                  <p>Loading chats…</p>
                </div>
              ) : null}

              {sessionsErrorMessage && sessions.length === 0 ? (
                <div className="ai-chat-inline-state ai-chat-inline-state--error" role="alert">
                  <FiAlertCircle aria-hidden="true" size={16} />
                  <p>{sessionsErrorMessage}</p>
                  <button className="home-retry-button" type="button" onClick={() => void refetchSessions()}>
                    <FiRefreshCw aria-hidden="true" size={14} />
                    Retry
                  </button>
                </div>
              ) : null}

              {!showSessionsInitialLoading && !sessionsErrorMessage && sessions.length === 0 ? (
                <div className="ai-chat-inline-state">
                  <p>No chats yet</p>
                  <span>Start a conversation and it will show up here.</span>
                </div>
              ) : null}

              {historyGroups.map((group) => (
                <section key={group.label}>
                  <h2>{group.label}</h2>
                  {group.sessions.map((session) => (
                    <button
                      className={`chat-history-item${session.id === activeSessionId ? ' is-active' : ''}`}
                      type="button"
                      key={session.id}
                      onClick={() => void handleSelectSession(session.id)}
                    >
                      <strong>{session.title}</strong>
                      <span>{formatHistoryMeta(session.updatedAt)}</span>
                    </button>
                  ))}
                </section>
              ))}

              {hasMoreSessions ? (
                <button
                  className="home-load-more"
                  type="button"
                  disabled={isFetchingMoreSessions}
                  onClick={() => void fetchNextSessionsPage()}
                >
                  {isFetchingMoreSessions ? 'Loading…' : 'Load more'}
                </button>
              ) : null}

              {isSessionsFetching && !isSessionsLoading && !isFetchingMoreSessions ? (
                <p className="home-sync-hint">Refreshing…</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <button className="ai-chat-new" type="button" onClick={handleNewChat} disabled={isSending}>
          <FiEdit2 aria-hidden="true" size={16} />
          <span>New</span>
        </button>
      </header>

      <div className="ai-chat-scroll">
        {isThreadLoading ? (
          <div className="ai-chat-inline-state ai-chat-inline-state--page" aria-busy="true">
            <span className="home-spinner" />
            <p>Loading conversation…</p>
          </div>
        ) : null}

        {threadError && !isThreadLoading ? (
          <div className="ai-chat-inline-state ai-chat-inline-state--page ai-chat-inline-state--error" role="alert">
            <FiAlertCircle aria-hidden="true" size={16} />
            <p>{threadError}</p>
            {activeSessionId ? (
              <button
                className="home-retry-button"
                type="button"
                onClick={() => void handleSelectSession(activeSessionId)}
              >
                <FiRefreshCw aria-hidden="true" size={14} />
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        {showLanding ? (
          <div className="ai-chat-empty">
            <span className="ai-chat-empty__icon">
              <RiRobot2Line aria-hidden="true" size={22} />
            </span>
            <h2>Hi {userName}</h2>
            <p>Ask anything about your conversations, notes, and tasks.</p>
            <div className="ai-chat-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => void handleSend(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!isThreadLoading && !threadError && messages.length > 0 ? (
          <div className="ai-chat-thread">
            {messages.map((message, index) => {
              const isLastAssistant = message.role === 'assistant' && index === lastAssistantIndex;

              if (message.role === 'user') {
                return (
                  <article className="chat-turn chat-turn--user" key={message.id}>
                    <div className="chat-bubble">{message.content}</div>
                    <div className="chat-message-actions" aria-label="Message actions">
                      <button type="button" aria-label="Copy message" onClick={() => void handleCopy(message.content)}>
                        <FiCopy aria-hidden="true" size={15} />
                      </button>
                      <button type="button" aria-label="Edit message" onClick={() => handleEdit(message.content)}>
                        <FiEdit2 aria-hidden="true" size={15} />
                      </button>
                    </div>
                  </article>
                );
              }

              return (
                <article className="chat-turn chat-turn--assistant" key={message.id}>
                  {message.isError ? (
                    <div className="assistant-message assistant-message--error">
                      <p>{message.content}</p>
                    </div>
                  ) : (
                    <ChatMarkdown content={message.content} />
                  )}
                  <div className="assistant-actions" aria-label="Assistant response actions">
                    <button type="button" aria-label="Copy response" onClick={() => void handleCopy(message.content)}>
                      <FiCopy aria-hidden="true" size={15} />
                    </button>
                    {isLastAssistant && !message.isError ? (
                      <button
                        type="button"
                        aria-label="Regenerate response"
                        disabled={isSending}
                        onClick={handleRegenerate}
                      >
                        <FiRefreshCw aria-hidden="true" size={15} />
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {isSending ? (
              <article className="chat-turn chat-turn--assistant" aria-live="polite">
                <div className="ai-typing" aria-label="Buddy is thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ) : null}

            <div ref={threadEndRef} />
          </div>
        ) : null}
      </div>

      <form
        className="ai-composer"
        aria-label="Ask AI Chat"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <div className="ai-composer__box">
          {selectedSpaces.length > 0 ? (
            <div className="ai-context-chips" aria-label="Selected context">
              {selectedSpaces.map((space) => (
                <span key={space.id} className="ai-context-chip">
                  <span className="ai-context-chip__label">@{space.name}</span>
                  <button
                    type="button"
                    className="ai-context-chip__remove"
                    aria-label={`Remove ${space.name} context`}
                    onClick={() => removeSpaceContext(space.id)}
                  >
                    <FiX aria-hidden="true" size={11} />
                  </button>
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
                    placeholder="Search spaces"
                    aria-label="Search context"
                  />
                </label>

                <div className="add-context-popover__body">
                  {isSpacesLoading ? (
                    <div className="ai-chat-inline-state" aria-busy="true">
                      <span className="home-spinner" />
                      <p>Loading spaces…</p>
                    </div>
                  ) : null}

                  {isSpacesError && !isSpacesLoading ? (
                    <div className="ai-chat-inline-state ai-chat-inline-state--error" role="alert">
                      <FiAlertCircle aria-hidden="true" size={16} />
                      <p>Unable to load spaces</p>
                      <button className="home-retry-button" type="button" onClick={() => void refetchSpaces()}>
                        <FiRefreshCw aria-hidden="true" size={14} />
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!isSpacesLoading && !isSpacesError && filteredSpaces.length > 0 ? (
                    <section className="add-context-section">
                      <h2>Spaces</h2>
                      {filteredSpaces.map((space) => (
                        <button
                          key={space.id}
                          type="button"
                          className={`add-context-item${selectedSpaceIds.includes(space.id) ? ' is-selected' : ''}`}
                          onClick={() => toggleSpaceContext(space.id)}
                        >
                          <FiFolder aria-hidden="true" size={15} />
                          <strong>{space.name}</strong>
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {!isSpacesLoading && !isSpacesError && filteredSpaces.length === 0 ? (
                    <div className="add-context-empty">
                      <p>No matches</p>
                      <span>
                        {spaces.length === 0
                          ? 'Create a space on Home to use it as chat context.'
                          : 'Try another search term.'}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <textarea
            ref={composerRef}
            placeholder="Ask anything about your conversations"
            rows={compact ? 2 : 2}
            value={draft}
            disabled={isSending || isThreadLoading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <div className="ai-composer__footer">
            <button type="button" disabled>
              Advanced
            </button>
            <button
              className={`send-button${canSend ? ' is-ready' : ''}`}
              type="submit"
              aria-label="Send message"
              disabled={!canSend}
            >
              {isSending ? <span className="home-spinner" /> : <FiArrowUp aria-hidden="true" size={18} />}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
