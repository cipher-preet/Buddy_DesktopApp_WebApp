import { useState, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  FiBell,
  FiCalendar,
  FiCheckSquare,
  FiChevronDown,
  FiChevronsRight,
  FiDownload,
  FiGift,
  FiList,
  FiMic,
  FiSearch,
  FiUploadCloud,
  FiVideo,
} from 'react-icons/fi';
import { RiRobot2Line } from 'react-icons/ri';

export type NavigationItem = {
  label: string;
  icon: IconType;
  isActive?: boolean;
  onSelect?: () => void;
};

type AppLayoutProps = {
  children: ReactNode;
  navigationItems: NavigationItem[];
  viewMode?: 'default' | 'chat';
};

export const AppLayout = ({ children, navigationItems, viewMode = 'default' }: AppLayoutProps) => {
  const [isMeetingPanelCollapsed, setIsMeetingPanelCollapsed] = useState(false);
  const isChatView = viewMode === 'chat';

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="sidebar-topbar">
          <span className="app-logo" aria-label="Personal Buddy">
            <span />
            <span />
            <span />
            <span />
          </span>
          <button className="icon-button" type="button" aria-label="Notifications">
            <FiBell aria-hidden="true" size={20} />
          </button>
        </div>

        <button className="account-card" type="button">
          <span className="avatar">P</span>
          <span className="account-card__text">
            <strong>Preet Kumar</strong>
            <small>ps1535146@gmail.com</small>
          </span>
          <FiChevronDown aria-hidden="true" size={18} />
        </button>

        <button className="upgrade-card" type="button">
          <FiGift aria-hidden="true" size={20} />
          <span>Get Pro For Free</span>
        </button>

        <nav className="nav-list">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="nav-list__item"
                data-active={item.isActive ? 'true' : undefined}
                key={item.label}
                type="button"
                onClick={item.onSelect}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="app-sidebar__footer">
          <div className="download-card">
            <strong>Get the desktop app</strong>
            <p>Local, reliable, bot-free recording</p>
            <a href="#download">
              <span>Download</span>
              <FiDownload aria-hidden="true" size={15} />
            </a>
          </div>

          <div className="plan-card">
            <div className="plan-card__row">
              <strong>Basic</strong>
              <span />
            </div>
            <p><strong>1 of 300</strong> monthly mins used</p>
            <button type="button">Get Otter Pro</button>
          </div>
        </div>
      </aside>

      <div className="app-main" data-view-mode={viewMode}>
        {!isChatView ? (
          <header className="app-header">
            <label className="search-field">
              <FiSearch aria-hidden="true" size={21} />
              <input placeholder="Ask or search" aria-label="Ask or search" />
              <kbd>CtrlK</kbd>
            </label>

            <div className="header-actions">
              <button className="icon-button icon-button--soft" type="button" aria-label="Start video">
                <FiVideo aria-hidden="true" size={20} />
              </button>
              <button className="toolbar-button" type="button">
                <FiUploadCloud aria-hidden="true" size={20} />
                <span>Import</span>
              </button>
              <button className="toolbar-button toolbar-button--primary" type="button">
                <FiMic aria-hidden="true" size={20} />
                <span>Record</span>
              </button>
            </div>
          </header>
        ) : null}

        <div
          className="workspace-layout"
          data-panel-collapsed={isMeetingPanelCollapsed ? 'true' : undefined}
          data-view-mode={viewMode}
        >
          <main className="app-content" data-view-mode={viewMode}>
            {children}
          </main>

          {!isChatView ? (
            <aside
              className="meeting-panel"
              aria-hidden={isMeetingPanelCollapsed}
              aria-label="Meeting tools"
            >
            <div className="meeting-tabs">
              <button type="button">AI Chat</button>
              <button className="is-active" type="button">Meetings</button>
              <button type="button">Action Items</button>
              <button
                className="meeting-tabs__collapse"
                type="button"
                aria-label="Collapse panel"
                onClick={() => setIsMeetingPanelCollapsed(true)}
              >
                <FiChevronsRight aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="meeting-panel__content">
              <section>
                <h2>Record a live meeting</h2>
                <p>Works with Zoom, Google Meet, or Microsoft Teams</p>
                <button className="meeting-url-button" type="button">
                  <FiVideo aria-hidden="true" size={18} />
                  <span>Paste meeting URL to add Otter</span>
                </button>
              </section>

              <section>
                <h2>Record upcoming meetings</h2>
                <p>Connect your calendar to get automatic notes.</p>
                <div className="calendar-actions">
                  <button type="button">
                    <FiCalendar aria-hidden="true" size={18} />
                    <span>Google</span>
                  </button>
                  <button type="button">
                    <FiCalendar aria-hidden="true" size={18} />
                    <span>Outlook</span>
                  </button>
                </div>
              </section>
            </div>
            </aside>
          ) : null}

          {!isChatView ? (
            <div
              className="collapsed-panel-rail"
              aria-hidden={!isMeetingPanelCollapsed}
              data-visible={isMeetingPanelCollapsed ? 'true' : undefined}
            >
              <button
                type="button"
                aria-label="Open AI chat panel"
                onClick={() => setIsMeetingPanelCollapsed(false)}
              >
                <RiRobot2Line aria-hidden="true" size={18} />
              </button>
              <button
                type="button"
                aria-label="Open meetings panel"
                onClick={() => setIsMeetingPanelCollapsed(false)}
              >
                <FiList aria-hidden="true" size={18} />
              </button>
              <button
                type="button"
                aria-label="Open action items panel"
                onClick={() => setIsMeetingPanelCollapsed(false)}
              >
                <FiCheckSquare aria-hidden="true" size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
