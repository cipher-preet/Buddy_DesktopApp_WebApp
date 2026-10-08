import { useState } from 'react';
import {
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiFileText,
  FiFlag,
  FiList,
  FiTarget,
  FiUsers,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

import { DocumentTemplateDetail } from './DocumentTemplateDetail';
import { documentTemplates, type DocumentTemplate } from './documentTemplates';

import './document-it.css';

type DocumentItPageProps = {
  embedded?: boolean;
  spaceName?: string;
};

export const templateIcons: Record<string, IconType> = {
  'meeting-recap': FiClipboard,
  'meeting-prep': FiList,
  'weekly-task-planner': FiCheckSquare,
  'weekly-review': FiCalendar,
  'one-on-one-prep': FiUsers,
  'project-status': FiFlag,
  'client-meeting-recap': FiFileText,
  'daily-work-plan': FiTarget,
  'decision-log': FiClipboard,
  'action-item-tracker': FiCheckSquare,
};

const TemplateCard = ({
  template,
  onSelect,
}: {
  template: DocumentTemplate;
  onSelect: (template: DocumentTemplate) => void;
}) => {
  const Icon = templateIcons[template.id] ?? FiFileText;

  return (
    <button
      type="button"
      className="document-template-card"
      aria-label={`${template.title} template`}
      onClick={() => onSelect(template)}
    >
      <div className="document-template-card__preview">
        {template.isNew ? <span className="document-template-card__badge">New</span> : null}

        <span className="document-template-card__lead-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={1.6} />
        </span>
        <h3>{template.title}</h3>

        <div className="document-template-card__sample">
          {template.exampleSections.map((section, index) => (
            <div key={`${template.id}-${section.heading ?? index}`} className="document-template-card__section">
              {section.heading ? <h4>{section.heading}</h4> : null}
              {section.body ? <p>{section.body}</p> : null}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="document-template-card__meta">
        <span className="document-template-card__meta-icon" aria-hidden="true">
          <Icon size={13} strokeWidth={1.7} />
        </span>
        <strong>{template.title}</strong>
        <span className="document-template-card__price">Free</span>
      </div>
    </button>
  );
};

export const DocumentItPage = ({ embedded = false, spaceName }: DocumentItPageProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  if (selectedTemplate) {
    const Icon = templateIcons[selectedTemplate.id] ?? FiFileText;
    return (
      <section
        className={`document-it-page document-it-page--detail${embedded ? ' document-it-page--embedded' : ''}`}
        aria-label="Document template detail"
      >
        <DocumentTemplateDetail
          template={selectedTemplate}
          Icon={Icon}
          onBack={() => setSelectedTemplate(null)}
        />
      </section>
    );
  }

  return (
    <section
      className={`document-it-page${embedded ? ' document-it-page--embedded' : ''}`}
      aria-label="Document it"
    >
      {!embedded ? (
        <header className="document-it-hero">
          <h1>{spaceName ? `Templates for ${spaceName}` : 'Document it'}</h1>
        </header>
      ) : null}

      <div className="document-templates">
        <div className="document-templates__header">
          <h2>
            <FiFileText aria-hidden="true" size={15} strokeWidth={1.7} />
            Popular templates
          </h2>
          <button type="button">Browse all</button>
        </div>

        <div className="document-templates__grid">
          {documentTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} onSelect={setSelectedTemplate} />
          ))}
        </div>
      </div>
    </section>
  );
};
