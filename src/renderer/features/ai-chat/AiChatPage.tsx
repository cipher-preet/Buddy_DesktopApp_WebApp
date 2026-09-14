import { useState } from 'react';
import {
  FiArrowUp,
  FiChevronDown,
  FiCopy,
  FiEdit2,
  FiPaperclip,
  FiRefreshCw,
  FiThumbsDown,
  FiThumbsUp,
  FiTrash2,
} from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

export const AiChatPage = () => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <section className="ai-chat-page" aria-label="AI Chat">
      <header className="ai-chat-header">
        <div className="ai-chat-history-anchor">
          <button
            className="ai-chat-title"
            type="button"
            aria-expanded={isHistoryOpen}
            aria-haspopup="dialog"
            onClick={() => setIsHistoryOpen((isOpen) => !isOpen)}
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
                From the transcript, this note appears to be about an app idea connected to a
                company called “Surecon” or something similar. The note captures early thinking
                about how that app could help organize architecture-level services and daily
                operations.
              </p>

              <ul>
                <li>
                  It describes a company that builds <strong>architecture-level services</strong>,
                  such as buildings, portals, and related operational systems.
                </li>
                <li>
                  You are brainstorming an app to <strong>manage Surecon-related operations</strong>
                  in one place, including notes, tasks, and follow-up work.
                </li>
              </ul>
            </div>
          </article>
        </div>
      </div>

      <form className="ai-composer" aria-label="Ask AI Chat">
        <div className="ai-composer__box">
          <button className="add-context-button" type="button">
            <FiPaperclip aria-hidden="true" size={14} />
            <span>Add context</span>
          </button>
          <textarea placeholder="Ask anything about your conversations" rows={2} />
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
