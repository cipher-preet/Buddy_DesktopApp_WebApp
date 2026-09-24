import { FiChevronRight, FiCloud, FiMessageSquare } from 'react-icons/fi';
import { SiDropbox, SiGooglecalendar, SiHubspot, SiZoom } from 'react-icons/si';
import { TbBrandOffice } from 'react-icons/tb';

const integrations = [
  {
    name: 'Microsoft Outlook Calendar',
    description: 'Connect Microsoft Outlook Calendar so Buddy can join and record your meetings.',
    icon: TbBrandOffice,
    tone: 'outlook',
  },
  {
    name: 'Zoom',
    description: 'Automatically capture and summarize your Zoom meetings with live transcripts and notes.',
    icon: SiZoom,
    tone: 'zoom',
  },
  {
    name: 'Slack',
    description: 'Automatically share meeting summaries and live notes directly into Slack.',
    icon: FiMessageSquare,
    tone: 'slack',
  },
  {
    name: 'Dropbox',
    description: 'Automatically transcribe Dropbox audio and video and save back to Dropbox.',
    icon: SiDropbox,
    tone: 'dropbox',
  },
  {
    name: 'Salesforce',
    description: 'Enrich Salesforce with your meeting notes automatically.',
    icon: FiCloud,
    tone: 'salesforce',
    badge: 'Pro',
  },
  {
    name: 'HubSpot',
    description: 'Sync meeting notes to HubSpot to improve follow-ups and pipeline visibility.',
    icon: SiHubspot,
    tone: 'hubspot',
    badge: 'Pro',
  },
];

export const IntegrationsPage = () => {
  return (
    <section className="integrations-page" aria-label="Integrations">
      <div className="integrations-inner">
        <h1>My Integrations</h1>

        <button className="connected-integration" type="button">
          <span className="integration-icon integration-icon--google">
            <SiGooglecalendar aria-hidden="true" size={18} />
          </span>
          <span>
            <strong>Google Calendar</strong>
            <small>Connected</small>
          </span>
          <FiChevronRight aria-hidden="true" size={18} />
        </button>

        <h2>Discover</h2>

        <div className="integration-grid">
          {integrations.map((integration) => {
            const Icon = integration.icon;

            return (
              <article className="integration-card" key={integration.name}>
                <div className="integration-card__top">
                  <span className={`integration-icon integration-icon--${integration.tone}`}>
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <span className="integration-card__soon">Coming soon</span>
                </div>
                <h3>
                  {integration.name}
                  {integration.badge ? <span>{integration.badge}</span> : null}
                </h3>
                <p>{integration.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
