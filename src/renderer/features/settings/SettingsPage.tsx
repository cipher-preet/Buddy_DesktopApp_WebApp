import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckSquare,
  FiChevronDown,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiHelpCircle,
  FiLogOut,
  FiMail,
  FiMessageSquare,
  FiRefreshCw,
  FiSend,
  FiTag,
  FiTrash2,
  FiX,
} from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { setUnauthenticated, updateAuthUser } from '@/features/auth/authSlice';
import {
  api,
  useDeleteAccountMutation,
  useLogoutMutation,
  useRaiseSupportTicketMutation,
  useSubmitFeedbackMutation,
  useUpdateProfileMutation,
} from '@/services/api';
import { useGetProfileSummaryQuery } from '@/services/homeApi';
import { useGetPlanStatusQuery } from '@/services/plansApi';

import { PlanDetailsModal } from './PlanDetailsModal';
import { getApiErrorMessage, type PlanId } from './planCatalog';

type SettingsPageProps = {
  focusSection?: 'plans' | null;
  onFocusHandled?: () => void;
  onNavigateHome?: (section?: 'notes' | 'tasks' | 'spaces') => void;
  onSignedOut?: () => void;
};

type AccountAction = 'plan' | 'feedback' | 'support';
type FeedbackStep = 'details' | 'success';
type SupportStep = 'hub' | 'ticket' | 'success';

type OptionItem = {
  id: string;
  label: string;
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

const workspaceItems: {
  title: string;
  subtitle: string;
  icon: typeof FiFileText;
  section: 'notes' | 'tasks' | 'spaces';
}[] = [
  {
    title: 'Notes',
    subtitle: 'Open and manage your notes',
    icon: FiFileText,
    section: 'notes',
  },
  {
    title: 'Tasks',
    subtitle: 'Track what needs to get done',
    icon: FiCheckSquare,
    section: 'tasks',
  },
  {
    title: 'Spaces',
    subtitle: 'Jump back to your workspaces',
    icon: FiFolder,
    section: 'spaces',
  },
];

export const SettingsPage = ({
  focusSection = null,
  onFocusHandled,
  onNavigateHome,
  onSignedOut,
}: SettingsPageProps) => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const authUser = useAppSelector((state) => state.auth.user);
  const userId = authUser?.userId || '';

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [profileError, setProfileError] = useState('');
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
    name: authUser?.name || 'Buddy User',
    email: authUser?.email || '',
    phone: authUser?.phone ? String(authUser.phone) : '',
  });
  const [draftProfile, setDraftProfile] = useState(profile);

  const {
    data: profileSummary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetProfileSummaryQuery({ userId }, { skip: !userId });

  const {
    data: planStatus,
    isLoading: isPlanStatusLoading,
    isError: isPlanStatusError,
    error: planStatusError,
    refetch: refetchPlanStatus,
  } = useGetPlanStatusQuery({ userId }, { skip: !userId });

  const [updateProfile, { isLoading: isSavingProfile }] = useUpdateProfileMutation();
  const [submitFeedback, { isLoading: isSubmittingFeedback }] = useSubmitFeedbackMutation();
  const [raiseSupportTicket, { isLoading: isRaisingTicket }] = useRaiseSupportTicketMutation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  const selectedFeedbackTopic = useMemo(
    () => feedbackTopics.find((topic) => topic.id === feedbackTopicId) ?? feedbackTopics[0],
    [feedbackTopicId],
  );
  const selectedSupportCategory = useMemo(
    () => supportCategories.find((category) => category.id === supportCategoryId) ?? supportCategories[0],
    [supportCategoryId],
  );

  const currentPlanId = (planStatus?.plan?.code || planStatus?.subscription?.planCode || 'free') as PlanId;
  const currentPlanName = planStatus?.plan?.name || 'Free';
  const notesCount = profileSummary?.notesCount ?? 0;
  const tasksCount = profileSummary?.tasksCount ?? 0;
  const spacesCount = profileSummary?.spacesCount ?? 0;
  const emailLocked = Boolean(authUser?.email);
  const phoneLocked = Boolean(authUser?.phone);

  const canSubmitFeedback = feedbackMessage.trim().length >= 8 && !isSubmittingFeedback;
  const canSubmitTicket =
    supportSubject.trim().length >= 4 && supportMessage.trim().length >= 12 && !isRaisingTicket;
  const canSaveProfile = draftProfile.name.trim().length >= 2 && !isSavingProfile;

  useEffect(() => {
    if (focusSection !== 'plans') {
      return;
    }

    setIsPlanOpen(true);
    onFocusHandled?.();
  }, [focusSection, onFocusHandled]);

  useEffect(() => {
    const nextProfile = {
      name: authUser?.name || 'Buddy User',
      email: authUser?.email || '',
      phone: authUser?.phone ? String(authUser.phone) : '',
    };
    setProfile(nextProfile);
    if (!isEditOpen) {
      setDraftProfile(nextProfile);
    }
  }, [authUser?.email, authUser?.name, authUser?.phone, isEditOpen]);

  const clearLocalSession = () => {
    dispatch(setUnauthenticated());
    dispatch(api.util.resetApiState());
    onSignedOut?.();
  };

  const handleLogout = async () => {
    setSessionError('');
    try {
      await logout().unwrap();
    } catch {
      // Always clear local session even if cookie logout fails.
    } finally {
      setIsLogoutOpen(false);
      clearLocalSession();
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE' || isDeletingAccount) {
      return;
    }

    setSessionError('');
    try {
      await deleteAccount({ confirmation: 'DELETE' }).unwrap();
      setIsDeleteOpen(false);
      clearLocalSession();
    } catch (error) {
      setSessionError(getApiErrorMessage(error, 'Unable to delete account right now'));
    }
  };

  const openEditProfile = () => {
    setProfileError('');
    setDraftProfile(profile);
    setIsEditOpen(true);
  };

  const saveProfile = async () => {
    if (!canSaveProfile) {
      return;
    }

    setProfileError('');
    const payload: { name?: string; email?: string; phone?: string } = {
      name: draftProfile.name.trim(),
    };

    if (!emailLocked && draftProfile.email.trim()) {
      payload.email = draftProfile.email.trim();
    }

    if (!phoneLocked && draftProfile.phone.trim()) {
      payload.phone = draftProfile.phone.trim();
    }

    try {
      const updated = await updateProfile(payload).unwrap();
      dispatch(
        updateAuthUser({
          name: updated.name ?? payload.name,
          email: updated.email ?? authUser?.email,
          phone: updated.phone ?? authUser?.phone,
          avatar: updated.avatar ?? authUser?.avatar,
        }),
      );
      setIsEditOpen(false);
      showToast({ message: 'Profile updated', type: 'success' });
    } catch (error) {
      setProfileError(getApiErrorMessage(error, 'Unable to save profile. Please try again.'));
    }
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
    if (action === 'plan') {
      setIsPlanOpen(true);
      return;
    }

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
      setFeedbackError(getApiErrorMessage(error, 'Unable to send feedback. Please try again.'));
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
      setSupportError(getApiErrorMessage(error, 'Unable to raise ticket. Please try again.'));
    }
  };

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
      value: isPlanStatusLoading ? '…' : currentPlanName,
      icon: FiCreditCard,
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
            <p>{profile.email || 'No email added'}</p>
            <small>{profile.phone || 'No phone added'}</small>
            <strong>
              {isPlanStatusLoading ? 'Loading plan…' : `${currentPlanName} plan`}
            </strong>

            {isSummaryLoading ? (
              <div className="settings-inline-state" aria-busy="true">
                <span className="home-spinner" />
                <p>Loading stats…</p>
              </div>
            ) : null}

            {isSummaryError ? (
              <div className="settings-inline-state settings-inline-state--error" role="alert">
                <FiAlertCircle aria-hidden="true" size={15} />
                <p>{getApiErrorMessage(summaryError, 'Unable to load profile stats')}</p>
                <button type="button" className="home-retry-button" onClick={() => void refetchSummary()}>
                  <FiRefreshCw aria-hidden="true" size={13} />
                  Retry
                </button>
              </div>
            ) : null}

            {!isSummaryLoading && !isSummaryError ? (
              <div className="profile-stats">
                <span>
                  <strong>{notesCount}</strong>
                  Notes
                </span>
                <span>
                  <strong>{tasksCount}</strong>
                  Tasks
                </span>
                <span>
                  <strong>{spacesCount}</strong>
                  Spaces
                </span>
              </div>
            ) : null}

            {isPlanStatusError ? (
              <div className="settings-inline-state settings-inline-state--error" role="alert">
                <FiAlertCircle aria-hidden="true" size={15} />
                <p>{getApiErrorMessage(planStatusError, 'Unable to load plan')}</p>
                <button type="button" className="home-retry-button" onClick={() => void refetchPlanStatus()}>
                  <FiRefreshCw aria-hidden="true" size={13} />
                  Retry
                </button>
              </div>
            ) : null}
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
                      onClick={() => onNavigateHome?.(item.section)}
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

      {isPlanOpen ? (
        <PlanDetailsModal
          currentPlanId={currentPlanId}
          usage={planStatus?.usage}
          onClose={() => setIsPlanOpen(false)}
        />
      ) : null}

      {isEditOpen ? (
        <div className="settings-modal-backdrop" role="presentation">
          <div className="settings-modal" role="dialog" aria-label="Edit profile">
            <header>
              <div>
                <h2>Edit Profile</h2>
                <p>Keep your Buddy profile up to date.</p>
              </div>
              <button type="button" onClick={() => setIsEditOpen(false)} aria-label="Close" disabled={isSavingProfile}>
                ×
              </button>
            </header>
            <label>
              Name
              <input
                value={draftProfile.name}
                onChange={(event) => setDraftProfile({ ...draftProfile, name: event.target.value })}
                disabled={isSavingProfile}
              />
            </label>
            <label>
              Email
              <input
                value={draftProfile.email}
                onChange={(event) => setDraftProfile({ ...draftProfile, email: event.target.value })}
                disabled={isSavingProfile || emailLocked}
              />
              {emailLocked ? <small className="settings-field-hint">Email is already linked to this account.</small> : null}
            </label>
            <label>
              Mobile number
              <input
                value={draftProfile.phone}
                onChange={(event) => setDraftProfile({ ...draftProfile, phone: event.target.value })}
                disabled={isSavingProfile || phoneLocked}
              />
              {phoneLocked ? <small className="settings-field-hint">Phone is already linked to this account.</small> : null}
            </label>
            {profileError ? <p className="settings-form-error">{profileError}</p> : null}
            <button
              className="settings-primary-button"
              type="button"
              onClick={() => void saveProfile()}
              disabled={!canSaveProfile}
            >
              {isSavingProfile ? 'Saving…' : 'Save Changes'}
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
                    <h2>Send feedback</h2>
                    <p>Tell us what is working well and what we should improve.</p>
                  </div>
                  <button type="button" onClick={closeFeedback} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>

                <label htmlFor="feedback-topic">
                  Topic
                  <CustomDropdown
                    id="feedback-topic"
                    label="Feedback topic"
                    options={feedbackTopics}
                    value={feedbackTopicId}
                    isOpen={isFeedbackTopicOpen}
                    onOpenChange={setIsFeedbackTopicOpen}
                    onChange={setFeedbackTopicId}
                  />
                </label>

                <label htmlFor="feedback-message">
                  Message
                  <textarea
                    id="feedback-message"
                    value={feedbackMessage}
                    onChange={(event) => setFeedbackMessage(event.target.value)}
                    placeholder="Share details, steps to reproduce, or ideas…"
                    rows={5}
                  />
                </label>

                {feedbackError ? <p className="settings-form-error">{feedbackError}</p> : null}

                <button
                  className="settings-primary-button"
                  type="button"
                  disabled={!canSubmitFeedback}
                  onClick={() => void sendFeedback()}
                >
                  <FiSend aria-hidden="true" size={15} />
                  {isSubmittingFeedback ? 'Sending…' : 'Send feedback'}
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
                    <p>Email us directly or raise a ticket for the Buddy team.</p>
                  </div>
                  <button type="button" onClick={closeSupport} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>

                <button className="settings-support-option" type="button" onClick={openSupportEmail}>
                  <span className="settings-row__icon">
                    <FiMail aria-hidden="true" size={18} />
                  </span>
                  <span>
                    <strong>Email support</strong>
                    <small>{supportEmail}</small>
                  </span>
                  <FiArrowRight aria-hidden="true" size={16} />
                </button>

                <button
                  className="settings-support-option"
                  type="button"
                  onClick={() => {
                    resetSupportTicket();
                    setSupportStep('ticket');
                  }}
                >
                  <span className="settings-row__icon">
                    <FiTag aria-hidden="true" size={18} />
                  </span>
                  <span>
                    <strong>Raise a ticket</strong>
                    <small>Trackable request for the Buddy team</small>
                  </span>
                  <FiArrowRight aria-hidden="true" size={16} />
                </button>
              </>
            ) : null}

            {supportStep === 'ticket' ? (
              <>
                <header>
                  <div>
                    <h2>Raise a ticket</h2>
                    <p>Share the issue and we will follow up as soon as we can.</p>
                  </div>
                  <button type="button" onClick={closeSupport} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>

                <label htmlFor="support-category">
                  Category
                  <CustomDropdown
                    id="support-category"
                    label="Support category"
                    options={supportCategories}
                    value={supportCategoryId}
                    isOpen={isSupportCategoryOpen}
                    onOpenChange={setIsSupportCategoryOpen}
                    onChange={setSupportCategoryId}
                  />
                </label>

                <label htmlFor="support-subject">
                  Subject
                  <input
                    id="support-subject"
                    value={supportSubject}
                    onChange={(event) => setSupportSubject(event.target.value)}
                    placeholder="Short summary of the issue"
                  />
                </label>

                <label htmlFor="support-message">
                  Details
                  <textarea
                    id="support-message"
                    value={supportMessage}
                    onChange={(event) => setSupportMessage(event.target.value)}
                    placeholder="What happened, and what should happen instead?"
                    rows={5}
                  />
                </label>

                {supportError ? <p className="settings-form-error">{supportError}</p> : null}

                <div className="settings-modal-actions">
                  <button
                    className="settings-secondary-button"
                    type="button"
                    onClick={() => {
                      setSupportStep('hub');
                      resetSupportTicket();
                    }}
                  >
                    Back
                  </button>
                  <button
                    className="settings-primary-button"
                    type="button"
                    disabled={!canSubmitTicket}
                    onClick={() => void submitTicket()}
                  >
                    {isRaisingTicket ? 'Submitting…' : 'Submit ticket'}
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
                    <h2>Ticket submitted</h2>
                    <p>
                      Your request is in. Reference ID: <strong>{ticketId}</strong>
                    </p>
                  </div>
                  <button type="button" onClick={closeSupport} aria-label="Close">
                    <FiX aria-hidden="true" size={18} />
                  </button>
                </header>
                <button className="settings-primary-button" type="button" onClick={closeSupport}>
                  Done
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLogoutOpen ? (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!isLoggingOut) {
              setIsLogoutOpen(false);
              setSessionError('');
            }
          }}
        >
          <div
            className="settings-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-confirm-dialog__icon" aria-hidden="true">
              <FiLogOut size={22} />
            </div>
            <div className="settings-confirm-dialog__content">
              <h2 id="logout-confirm-title">Log out of Buddy?</h2>
              <p>You can sign back in anytime with the same account. Your spaces and data stay safe.</p>
            </div>
            {sessionError ? <p className="settings-form-error">{sessionError}</p> : null}
            <div className="settings-confirm-dialog__actions">
              <button
                className="settings-secondary-button"
                type="button"
                onClick={() => {
                  setIsLogoutOpen(false);
                  setSessionError('');
                }}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                className="settings-primary-button"
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!isDeletingAccount) {
              setIsDeleteOpen(false);
              setDeleteText('');
              setSessionError('');
            }
          }}
        >
          <div
            className="settings-confirm-dialog settings-confirm-dialog--danger"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-confirm-dialog__icon settings-confirm-dialog__icon--danger" aria-hidden="true">
              <FiTrash2 size={22} />
            </div>
            <div className="settings-confirm-dialog__content">
              <h2 id="delete-confirm-title">Delete your account?</h2>
              <p>
                This permanently removes your spaces, notes, tasks, and recordings. This action cannot be undone.
              </p>
            </div>
            <div className="settings-confirm-dialog__warning">
              <strong>Before you continue</strong>
              <span>Type <em>DELETE</em> below to confirm you understand this is permanent.</span>
            </div>
            <label className="settings-confirm-dialog__field" htmlFor="delete-confirm">
              Confirmation
              <input
                id="delete-confirm"
                value={deleteText}
                autoComplete="off"
                spellCheck={false}
                placeholder="Type DELETE"
                onChange={(event) => setDeleteText(event.target.value)}
                disabled={isDeletingAccount}
              />
            </label>
            {sessionError ? <p className="settings-form-error">{sessionError}</p> : null}
            <div className="settings-confirm-dialog__actions">
              <button
                className="settings-secondary-button"
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeleteText('');
                  setSessionError('');
                }}
              >
                Cancel
              </button>
              <button
                className="settings-primary-button settings-primary-button--danger"
                type="button"
                disabled={deleteText !== 'DELETE' || isDeletingAccount}
                onClick={() => void handleDeleteAccount()}
              >
                {isDeletingAccount ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
