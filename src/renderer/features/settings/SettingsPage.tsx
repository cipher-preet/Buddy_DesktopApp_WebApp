import { useMemo, useState } from 'react';
import {
  FiArrowRight,
  FiCheckSquare,
  FiChevronDown,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiHelpCircle,
  FiLogOut,
  FiMail,
  FiMessageSquare,
  FiSend,
  FiShield,
  FiStar,
  FiTag,
  FiTrash2,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

import { useRaiseSupportTicketMutation, useSubmitFeedbackMutation } from '@/services/api';

type SettingsPageProps = {
  onNavigateHome?: () => void;
};

type AccountAction = 'plan' | 'feedback' | 'support';
type FeedbackStep = 'details' | 'success';
type SupportStep = 'hub' | 'ticket' | 'success';
type BillingCycle = 'monthly' | 'quarterly';
type PlanId = 'free' | 'pro' | 'business';

type OptionItem = {
  id: string;
  label: string;
};

type DesktopPlan = {
  id: PlanId;
  name: string;
  tagline: string;
  badge?: string;
  prices: Record<BillingCycle, string>;
  cadence: Record<BillingCycle, string>;
  limits: {
    spaces: string;
    notes: string;
    tasks: string;
    recordingHours: string;
  };
  features: string[];
  languages: string[];
};

type CustomDropdownProps = {
  id: string;
  label: string;
  options: OptionItem[];
  value: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
};

const feedbackTopics: OptionItem[] = [
  { id: 'app_bug', label: 'Something is wrong with the app' },
  { id: 'reminder_issue', label: 'Issue with reminders or alerts' },
  { id: 'ai_issue', label: 'Buddy AI is not working right' },
  { id: 'billing', label: 'Billing or plan question' },
  { id: 'other', label: 'Other feedback' },
];

const supportCategories: OptionItem[] = [
  { id: 'account', label: 'Account or login issue' },
  { id: 'billing', label: 'Billing or subscription' },
  { id: 'technical', label: 'App bug or crash' },
  { id: 'reminder', label: 'Reminders or calling' },
  { id: 'other', label: 'Something else' },
];

const supportEmail = 'ps1535146@gmail.com';

const billingOptions: { id: BillingCycle; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
];

const plans: DesktopPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start organizing spaces, notes, and personal tasks.',
    prices: {
      monthly: '₹0',
      quarterly: '₹0',
    },
    cadence: {
      monthly: 'forever',
      quarterly: 'forever',
    },
    limits: {
      spaces: '3',
      notes: '25',
      tasks: '50',
      recordingHours: '2 hrs',
    },
    features: ['Personal spaces', 'Basic notes and tasks', 'Limited meeting recording', 'Buddy AI chat preview'],
    languages: ['English', 'Hindi'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'More recording, daily summaries, and smarter planning.',
    badge: 'Popular',
    prices: {
      monthly: '₹299',
      quarterly: '₹799',
    },
    cadence: {
      monthly: 'per month',
      quarterly: 'per quarter',
    },
    limits: {
      spaces: '25',
      notes: 'Unlimited',
      tasks: 'Unlimited',
      recordingHours: '40 hrs',
    },
    features: ['Daily briefing from your work', 'Goal monitor for spaces', 'Advanced AI chat with notes', 'Priority support'],
    languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Team-ready workflows, shared spaces, and full language access.',
    badge: 'Best value',
    prices: {
      monthly: '₹799',
      quarterly: '₹1,999',
    },
    cadence: {
      monthly: 'per month',
      quarterly: 'per quarter',
    },
    limits: {
      spaces: 'Unlimited',
      notes: 'Unlimited',
      tasks: 'Unlimited',
      recordingHours: 'Unlimited',
    },
    features: ['Team access and shared spaces', 'Unlimited recording', 'Business language pack', 'Admin-ready support'],
    languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'],
  },
];

const compareRows = [
  { label: 'Spaces', free: '3', pro: '25', business: 'Unlimited' },
  { label: 'Recording', free: '2 hrs', pro: '40 hrs', business: 'Unlimited' },
  { label: 'Languages', free: '2', pro: '6', business: '11' },
  { label: 'Daily briefing', free: '-', pro: 'Yes', business: 'Yes' },
  { label: 'Goal monitor', free: '-', pro: 'Yes', business: 'Yes' },
  { label: 'Team access', free: '-', pro: '-', business: 'Yes' },
];

const CustomDropdown = ({ id, label, options, value, isOpen, onOpenChange, onChange }: CustomDropdownProps) => {
  const selectedOption = options.find((option) => option.id === value) ?? options[0];

  return (
    <div className="settings-custom-dropdown">
      <button
        id={id}
        className={`settings-dropdown-trigger${isOpen ? ' is-open' : ''}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span>{selectedOption.label}</span>
        <FiChevronDown aria-hidden="true" size={16} />
      </button>
      {isOpen ? (
        <div className="settings-dropdown-menu" role="listbox" aria-labelledby={id}>
          {options.map((option) => {
            const selected = option.id === value;

            return (
              <button
                className={`settings-dropdown-option${selected ? ' is-selected' : ''}`}
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.id);
                  onOpenChange(false);
                }}
              >
                <span>{option.label}</span>
                {selected ? <FiCheckSquare aria-hidden="true" size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const workspaceItems = [
  {
    title: 'Notes',
    subtitle: 'Open and manage your notes',
    icon: FiFileText,
  },
  {
    title: 'Tasks',
    subtitle: 'Track what needs to get done',
    icon: FiCheckSquare,
  },
  {
    title: 'Spaces',
    subtitle: 'Jump back to your workspaces',
    icon: FiFolder,
  },
];

const accountItems: {
  title: string;
  subtitle: string;
  value?: string;
  icon: typeof FiFileText;
  action: AccountAction;
}[] = [
  {
    title: 'Plan',
    subtitle: 'View and manage subscription',
    value: 'Free',
    icon: FiFileText,
    action: 'plan',
  },
  {
    title: 'Feedback',
    subtitle: 'Tell us how we can improve Buddy',
    icon: FiMessageSquare,
    action: 'feedback',
  },
  {
    title: 'Help & Support',
    subtitle: 'Email us or raise a support ticket',
    icon: FiHelpCircle,
    action: 'support',
  },
];

export const SettingsPage = ({ onNavigateHome }: SettingsPageProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>('details');
  const [isFeedbackTopicOpen, setIsFeedbackTopicOpen] = useState(false);
  const [feedbackTopicId, setFeedbackTopicId] = useState(feedbackTopics[0].id);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [supportStep, setSupportStep] = useState<SupportStep>('hub');
  const [isSupportCategoryOpen, setIsSupportCategoryOpen] = useState(false);
  const [supportCategoryId, setSupportCategoryId] = useState(supportCategories[0].id);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportError, setSupportError] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [profile, setProfile] = useState({
    name: 'Preet Kumar',
    email: 'ps1535146@gmail.com',
    phone: '+91 98765 43210',
  });
  const [draftProfile, setDraftProfile] = useState(profile);
  const [submitFeedback, { isLoading: isSubmittingFeedback }] = useSubmitFeedbackMutation();
  const [raiseSupportTicket, { isLoading: isRaisingTicket }] = useRaiseSupportTicketMutation();

  const selectedFeedbackTopic = useMemo(
    () => feedbackTopics.find((topic) => topic.id === feedbackTopicId) ?? feedbackTopics[0],
    [feedbackTopicId],
  );
  const selectedSupportCategory = useMemo(
    () => supportCategories.find((category) => category.id === supportCategoryId) ?? supportCategories[0],
    [supportCategoryId],
  );

  const canSubmitFeedback = feedbackMessage.trim().length >= 8 && !isSubmittingFeedback;
  const canSubmitTicket =
    supportSubject.trim().length >= 4 && supportMessage.trim().length >= 12 && !isRaisingTicket;

  const openEditProfile = () => {
    setDraftProfile(profile);
    setIsEditOpen(true);
  };

  const saveProfile = () => {
    setProfile(draftProfile);
    setIsEditOpen(false);
  };

  const resetFeedback = () => {
    setFeedbackStep('details');
    setIsFeedbackTopicOpen(false);
    setFeedbackTopicId(feedbackTopics[0].id);
    setFeedbackMessage('');
    setFeedbackError('');
  };

  const closeFeedback = () => {
    setIsFeedbackOpen(false);
    resetFeedback();
  };

  const resetSupportTicket = () => {
    setIsSupportCategoryOpen(false);
    setSupportCategoryId(supportCategories[0].id);
    setSupportSubject('');
    setSupportMessage('');
    setSupportError('');
    setTicketId('');
  };

  const closeSupport = () => {
    setIsSupportOpen(false);
    setSupportStep('hub');
    resetSupportTicket();
  };

  const handleAccountAction = (action: AccountAction) => {
    if (action === 'feedback') {
      resetFeedback();
      setIsFeedbackOpen(true);
      return;
    }

    if (action === 'support') {
      setSupportStep('hub');
      resetSupportTicket();
      setIsSupportOpen(true);
    }
  };

  const sendFeedback = async () => {
    if (!canSubmitFeedback) {
      return;
    }

    try {
      setFeedbackError('');
      await submitFeedback({
        topicId: selectedFeedbackTopic.id,
        topicLabel: selectedFeedbackTopic.label,
        message: feedbackMessage.trim(),
      }).unwrap();
      setFeedbackStep('success');
    } catch (error) {
      const apiMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string; data?: { message?: string } })?.message ||
            (error.data as { data?: { message?: string } })?.data?.message
          : '';
      setFeedbackError(apiMessage || 'Unable to send feedback. Please try again.');
    }
  };

  const openSupportEmail = () => {
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent('Buddy Support Request')}`;
  };

  const submitTicket = async () => {
    if (!canSubmitTicket) {
      return;
    }

    try {
      setSupportError('');
      const response = await raiseSupportTicket({
        categoryId: selectedSupportCategory.id,
        categoryLabel: selectedSupportCategory.label,
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
      }).unwrap();

      setTicketId(response.data?.ticketId ?? 'BUDDY-' + new Date().getTime().toString().slice(-6));
      setSupportStep('success');
    } catch (error) {
      const apiMessage =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string; data?: { message?: string } })?.message ||
            (error.data as { data?: { message?: string } })?.data?.message
          : '';
      setSupportError(apiMessage || 'Unable to raise ticket. Please try again.');
    }
  };

  return (
    <section className="settings-page" aria-label="Settings">
      <div className="settings-inner">
        <header className="settings-header">
          <div>
            <p>Account</p>
            <h1>Settings</h1>
          </div>
        </header>

        <div className="settings-layout">
          <aside className="profile-summary-card">
            <button className="profile-avatar" type="button" onClick={openEditProfile}>
              <span>{profile.name.charAt(0).toUpperCase()}</span>
              <span className="profile-avatar__edit">
                <FiEdit2 aria-hidden="true" size={13} />
              </span>
            </button>
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
            <small>{profile.phone}</small>
            <strong>Free plan</strong>

            <div className="profile-stats">
              <span>
                <strong>18</strong>
                Notes
              </span>
              <span>
                <strong>20</strong>
                Tasks
              </span>
              <span>
                <strong>10</strong>
                Spaces
              </span>
            </div>
          </aside>

          <div className="settings-sections">
            <section className="settings-section-card">
              <h2>Workspace</h2>
              <div className="settings-list">
                {workspaceItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      className="settings-row"
                      key={item.title}
                      type="button"
                      onClick={item.title === 'Spaces' ? onNavigateHome : undefined}
                    >
                      <span className="settings-row__icon">
                        <Icon aria-hidden="true" size={18} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                      <span className="settings-row__chevron">›</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="settings-section-card">
              <h2>Account</h2>
              <div className="settings-list">
                {accountItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      className="settings-row"
                      key={item.title}
                      type="button"
                      onClick={() => handleAccountAction(item.action)}
                    >
                      <span className="settings-row__icon">
                        <Icon aria-hidden="true" size={18} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                      </span>
                      <span className="settings-row__trailing">
                        {item.value ? <strong>{item.value}</strong> : null}
                        <span>›</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="settings-section-card">
              <h2>Session</h2>
              <div className="settings-list">
                <button className="settings-row settings-row--danger" type="button" onClick={() => setIsLogoutOpen(true)}>
                  <span className="settings-row__icon">
                    <FiLogOut aria-hidden="true" size={18} />
                  </span>
                  <span>
                    <strong>Logout</strong>
                    <small>Sign out of your account</small>
                  </span>
                  <span className="settings-row__chevron">›</span>
                </button>
                <button className="settings-row settings-row--danger" type="button" onClick={() => setIsDeleteOpen(true)}>
                  <span className="settings-row__icon">
                    <FiTrash2 aria-hidden="true" size={18} />
                  </span>
                  <span>
                    <strong>Delete Account</strong>
                    <small>Permanently erase your account and data</small>
                  </span>
                  <span className="settings-row__chevron">›</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {isEditOpen ? (
        <div className="settings-modal-backdrop" role="presentation">
          <div className="settings-modal" role="dialog" aria-label="Edit profile">
            <header>
              <div>
                <h2>Edit Profile</h2>
                <p>Keep your Buddy profile up to date.</p>
              </div>
              <button type="button" onClick={() => setIsEditOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <label>
              Name
              <input
                value={draftProfile.name}
                onChange={(event) => setDraftProfile({ ...draftProfile, name: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                value={draftProfile.email}
                onChange={(event) => setDraftProfile({ ...draftProfile, email: event.target.value })}
              />
            </label>
            <label>
              Mobile number
              <input
                value={draftProfile.phone}
                onChange={(event) => setDraftProfile({ ...draftProfile, phone: event.target.value })}
              />
            </label>
            <button className="settings-primary-button" type="button" onClick={saveProfile}>
              Save Changes
            </button>
          </div>
        </div>
      ) : null}

      {isFeedbackOpen ? (
        <div className="settings-modal-backdrop" role="presentation">
          <div className="settings-modal settings-action-modal" role="dialog" aria-label="Send feedback">
            {feedbackStep === 'success' ? (
              <>
                <div className="settings-success-hero">
                  <FiCheckSquare aria-hidden="true" size={24} />
                </div>
                <header>
                  <div>
                    <h2>Thank you for the feedback</h2>
                    <p>Your note has been sent to the Buddy team. We use this to improve the product experience.</p>
                  </div>
                  <button type="button" onClick={closeFeedback} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>
                <button className="settings-primary-button" type="button" onClick={closeFeedback}>
                  Done
                </button>
              </>
            ) : (
              <>
                <header>
                  <div>
                    <h2>Help us improve</h2>
                    <p>Select a topic and share a few details about your experience.</p>
                  </div>
                  <button type="button" onClick={closeFeedback} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>
                <label>
                  Topic
                  <CustomDropdown
                    id="feedback-topic"
                    label="Select feedback topic"
                    options={feedbackTopics}
                    value={feedbackTopicId}
                    isOpen={isFeedbackTopicOpen}
                    onOpenChange={setIsFeedbackTopicOpen}
                    onChange={setFeedbackTopicId}
                  />
                </label>
                <label>
                  Details
                  <textarea
                    value={feedbackMessage}
                    onChange={(event) => setFeedbackMessage(event.target.value)}
                    placeholder="Share what happened, what felt confusing, or what would make Buddy better."
                    maxLength={1200}
                  />
                </label>
                <div className="settings-form-footer">
                  <span>{feedbackMessage.trim().length}/1200</span>
                  <span>Minimum 8 characters</span>
                </div>
                {feedbackError ? <p className="settings-form-error">{feedbackError}</p> : null}
                <button
                  className="settings-primary-button"
                  type="button"
                  disabled={!canSubmitFeedback}
                  onClick={sendFeedback}
                >
                  <FiSend aria-hidden="true" size={15} />
                  {isSubmittingFeedback ? 'Sending...' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isSupportOpen ? (
        <div className="settings-modal-backdrop" role="presentation">
          <div className="settings-modal settings-action-modal" role="dialog" aria-label="Help and support">
            {supportStep === 'hub' ? (
              <>
                <header>
                  <div>
                    <h2>Help & Support</h2>
                    <p>Reach the Buddy team by email, or raise a tracked support ticket.</p>
                  </div>
                  <button type="button" onClick={closeSupport} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>
                <div className="settings-response-chip">
                  <span />
                  We typically reply within 24 hours
                </div>
                <button className="settings-support-option" type="button" onClick={openSupportEmail}>
                  <span className="settings-row__icon">
                    <FiMail aria-hidden="true" size={18} />
                  </span>
                  <span>
                    <strong>Email us</strong>
                    <small>{supportEmail}</small>
                  </span>
                  <FiArrowRight aria-hidden="true" size={17} />
                </button>
                <button className="settings-support-option" type="button" onClick={() => setSupportStep('ticket')}>
                  <span className="settings-row__icon">
                    <FiTag aria-hidden="true" size={18} />
                  </span>
                  <span>
                    <strong>Raise a ticket</strong>
                    <small>Tracked support for account, billing, bugs, and app issues</small>
                  </span>
                  <FiArrowRight aria-hidden="true" size={17} />
                </button>
                <p className="settings-help-note">
                  Include your account email and what you were doing when the issue happened. It helps us resolve things
                  faster.
                </p>
              </>
            ) : null}

            {supportStep === 'ticket' ? (
              <>
                <header>
                  <div>
                    <h2>Raise a ticket</h2>
                    <p>Choose a category and share enough detail for our team to investigate.</p>
                  </div>
                  <button type="button" onClick={closeSupport} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>
                <label>
                  Category
                  <CustomDropdown
                    id="support-category"
                    label="Select support category"
                    options={supportCategories}
                    value={supportCategoryId}
                    isOpen={isSupportCategoryOpen}
                    onOpenChange={setIsSupportCategoryOpen}
                    onChange={setSupportCategoryId}
                  />
                </label>
                <label>
                  Subject
                  <input
                    value={supportSubject}
                    onChange={(event) => setSupportSubject(event.target.value)}
                    placeholder="Short summary of the issue"
                    maxLength={120}
                  />
                </label>
                <label>
                  Details
                  <textarea
                    value={supportMessage}
                    onChange={(event) => setSupportMessage(event.target.value)}
                    placeholder="What happened, and what did you expect instead?"
                    maxLength={2000}
                  />
                </label>
                <div className="settings-form-footer">
                  <span>{supportMessage.trim().length}/2000</span>
                  <span>Minimum 12 characters</span>
                </div>
                {supportError ? <p className="settings-form-error">{supportError}</p> : null}
                <div className="settings-modal-actions">
                  <button className="settings-secondary-button" type="button" onClick={() => setSupportStep('hub')}>
                    Back
                  </button>
                  <button
                    className="settings-primary-button"
                    type="button"
                    disabled={!canSubmitTicket}
                    onClick={submitTicket}
                  >
                    <FiSend aria-hidden="true" size={15} />
                    {isRaisingTicket ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </>
            ) : null}

            {supportStep === 'success' ? (
              <>
                <div className="settings-success-hero">
                  <FiCheckSquare aria-hidden="true" size={24} />
                </div>
                <header>
                  <div>
                    <h2>Ticket raised</h2>
                    <p>Thanks for reaching out. Our support team will review your request and get back to you soon.</p>
                  </div>
                  <button type="button" onClick={closeSupport} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>
                <div className="settings-ticket-badge">
                  <span>Ticket ID</span>
                  <strong>{ticketId}</strong>
                </div>
                <button className="settings-primary-button" type="button" onClick={closeSupport}>
                  Done
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLogoutOpen ? (
        <div className="settings-modal-backdrop" role="presentation">
          <div className="settings-confirm-modal" role="dialog" aria-label="Logout">
            <h2>Logout</h2>
            <p>Are you sure you want to sign out of Buddy?</p>
            <div>
              <button type="button" onClick={() => setIsLogoutOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={() => setIsLogoutOpen(false)}>
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
        <div className="settings-modal-backdrop" role="presentation">
          <div className="settings-modal settings-delete-modal" role="dialog" aria-label="Delete account">
            <header>
              <div>
                <h2>Delete Account</h2>
                <p>This action cannot be undone.</p>
              </div>
              <button type="button" onClick={() => setIsDeleteOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="settings-warning-box">
              This will erase your account, spaces, notes, and tasks from our servers.
            </div>
            <label>
              Type DELETE to confirm
              <input value={deleteText} onChange={(event) => setDeleteText(event.target.value.toUpperCase())} />
            </label>
            <button
              className="settings-danger-button"
              type="button"
              disabled={deleteText !== 'DELETE'}
              onClick={() => setIsDeleteOpen(false)}
            >
              Delete my account
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
