import { useState } from 'react';
import { FiDownload, FiPlus } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

import { GetAgentModal } from './GetAgentModal';
import { FEATURED_AGENTS } from './marketplaceData';

import './marketplace.css';

const authorTone = (name: string) => {
  const tones = ['blue', 'red', 'navy', 'teal', 'orange', 'purple', 'green'] as const;
  const total = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
};

export const MarketplacePage = () => {
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAgent = FEATURED_AGENTS.find((agent) => agent.id === selectedId) ?? null;

  return (
    <section className="marketplace-page" aria-label="Marketplace">
      <div className="marketplace-inner">
        <header className="marketplace-head">
          <h1>
            <HiSparkles size={16} aria-hidden="true" />
            Featured agents
          </h1>
        </header>

        <ul className="marketplace-list">
          {FEATURED_AGENTS.map((agent) => {
            const Icon = agent.icon;
            const isAdded = Boolean(added[agent.id]);
            return (
              <li key={agent.id}>
                <article className="marketplace-row">
                  <span className={`marketplace-mark marketplace-mark--${agent.tone}`} aria-hidden="true">
                    <span>
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                  </span>

                  <div className="marketplace-copy">
                    <h2>{agent.title}</h2>
                    <p>{agent.description}</p>
                    <div className="marketplace-meta">
                      <span className={`marketplace-avatar marketplace-avatar--${authorTone(agent.author)}`}>
                        {agent.author.slice(0, 1)}
                      </span>
                      <span>{agent.author}</span>
                      <FiDownload size={12} aria-hidden="true" />
                      <span>{agent.installs}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`marketplace-get${isAdded ? ' is-added' : ''}`}
                    onClick={() => setSelectedId(agent.id)}
                  >
                    <FiPlus size={15} aria-hidden="true" />
                    {isAdded ? 'Added' : 'Get agent'}
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedAgent ? (
        <GetAgentModal
          agentName={selectedAgent.title}
          onClose={() => setSelectedId(null)}
          onStartTrial={() => {
            setAdded((current) => ({ ...current, [selectedAgent.id]: true }));
            setSelectedId(null);
          }}
        />
      ) : null}
    </section>
  );
};
