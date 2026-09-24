import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiMic,
  FiRefreshCw,
  FiShield,
  FiStar,
  FiTarget,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { plansApi, type PlanCode, type PlanLimits } from '@/services/plansApi';
import {
  useActivateFreePlanMutation,
  useCreatePaymentOrderMutation,
  useGetPlansQuery,
  useLazyGetPaymentStatusQuery,
  useVerifyPaymentMutation,
} from '@/services/plansApi';
import { RazorpayCheckoutError, openRazorpayCheckout } from './razorpayCheckout';

import {
  billingOptions,
  buildCompareRows,
  buildPlanFaqs,
  getApiErrorMessage,
  getPlanCtaLabel,
  getQuarterlyHint,
  resolveDesktopPlans,
  type BillingCycle,
  type CompareIcon,
  type DesktopPlan,
  type PlanId,
} from './planCatalog';

type PlanDetailsModalProps = {
  currentPlanId?: PlanId;
  usage?: PlanLimits | null;
  onClose: () => void;
};

const planIcons: Record<PlanId, typeof FiStar> = {
  free: FiZap,
  pro: FiStar,
  business: FiUsers,
};

const compareIcons: Record<CompareIcon, typeof FiStar> = {
  spaces: FiFolder,
  recording: FiMic,
  languages: FiGlobe,
  briefing: FiFileText,
  goals: FiTarget,
  team: FiUsers,
};

const formatUsageValue = (value?: number | null) => {
  if (value === undefined || value === null) {
    return '—';
  }

  if (value < 0) {
    return 'Unlimited';
  }

  return String(value);
};

type CheckoutPhase = 'idle' | 'creating' | 'paying' | 'verifying' | 'activating';

const checkoutLabels: Record<Exclude<CheckoutPhase, 'idle' | 'paying'>, string> = {
  creating: 'Starting secure checkout…',
  verifying: 'Confirming payment…',
  activating: 'Updating your plan…',
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isRetryableVerificationError = (message: string) =>
  /timed out|webhook|not successful|unable to confirm|network|failed to fetch|razorpay status/i.test(
    message,
  );

const formatRecordingUsage = (usage?: PlanLimits | null) => {
  if (!usage) {
    return '—';
  }

  if (typeof usage.recordingHours === 'number') {
    if (usage.recordingHours < 0) {
      return 'Unlimited';
    }
    return `${usage.recordingHours} hrs`;
  }

  if (typeof usage.recordingMs === 'number') {
    const hours = Math.round((usage.recordingMs / 3_600_000) * 10) / 10;
    return `${hours} hrs`;
  }

  return '—';
};

export const PlanDetailsModal = ({
  currentPlanId = 'free',
  usage = null,
  onClose,
}: PlanDetailsModalProps) => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const authUser = useAppSelector((state) => state.auth.user);
  const userId = authUser?.userId || '';

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(
    currentPlanId === 'free' ? 'pro' : currentPlanId,
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [actionError, setActionError] = useState('');
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>('idle');

  const {
    data: plansData,
    isLoading: isPlansLoading,
    isError: isPlansError,
    error: plansError,
    refetch: refetchPlans,
  } = useGetPlansQuery();

  const [activateFreePlan, { isLoading: isActivatingFree }] = useActivateFreePlanMutation();
  const [createPaymentOrder] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [fetchPaymentStatus] = useLazyGetPaymentStatusQuery();

  const desktopPlans = useMemo(
    () => resolveDesktopPlans(plansData?.plans ?? null),
    [plansData?.plans],
  );

  const compareRows = useMemo(() => buildCompareRows(desktopPlans), [desktopPlans]);
  const planFaqs = useMemo(() => buildPlanFaqs(desktopPlans), [desktopPlans]);

  useEffect(() => {
    if (!desktopPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(desktopPlans[0]?.id ?? 'free');
    }
  }, [desktopPlans, selectedPlanId]);

  const selectedPlan = useMemo(
    () => desktopPlans.find((plan) => plan.id === selectedPlanId) ?? desktopPlans[0],
    [desktopPlans, selectedPlanId],
  );

  const isCurrentSelected = selectedPlan?.id === currentPlanId;
  const quarterlyHint =
    selectedPlan && billingCycle === 'quarterly' ? getQuarterlyHint(selectedPlan) : null;
  const SelectedIcon = selectedPlan ? planIcons[selectedPlan.id] : FiStar;
  const isSubmitting = isActivatingFree || checkoutPhase !== 'idle';

  const waitForActivatedPlan = async (planCode: PlanCode) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const status = await dispatch(
        plansApi.endpoints.getPlanStatus.initiate({ userId }, { forceRefetch: true }),
      ).unwrap();
      const activeCode = status.plan?.code || status.subscription?.planCode;
      if (activeCode === planCode) {
        return true;
      }
      await sleep(1500 + attempt * 500);
    }

    return false;
  };

  const recoverPaidOrder = async (orderId: string, planCode: PlanCode) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const status = await fetchPaymentStatus({ userId, orderId }, true).unwrap();
        if (status.paid) {
          dispatch(plansApi.util.invalidateTags(['Plans']));
          return status.message || 'Payment confirmed and your plan is active.';
        }
      } catch {
        // Keep polling while Razorpay settles the test payment.
      }

      try {
        const planStatus = await dispatch(
          plansApi.endpoints.getPlanStatus.initiate({ userId }, { forceRefetch: true }),
        ).unwrap();
        const activeCode = planStatus.plan?.code || planStatus.subscription?.planCode;
        if (activeCode === planCode) {
          return 'Payment confirmed and your plan is active.';
        }
      } catch {
        // Ignore transient plan-status failures during recovery.
      }

      await sleep(1000 + attempt * 400);
    }

    return null;
  };

  const confirmVerifiedPlan = async (
    planCode: PlanCode,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) => {
    let lastError = 'Unable to confirm payment';

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const verification = await verifyPayment({
          userId,
          ...payload,
        }).unwrap();
        const activatedCode = verification.subscription?.planCode;
        if (activatedCode && activatedCode !== planCode) {
          throw new Error('Payment was confirmed for a different plan. Please contact support.');
        }
        return verification.message || 'Payment verified and plan upgraded.';
      } catch (error) {
        lastError = getApiErrorMessage(error, lastError);
        if (!isRetryableVerificationError(lastError) || attempt === 3) {
          break;
        }
        await sleep(1200 * (attempt + 1));
      }
    }

    setCheckoutPhase('activating');
    const activated = await waitForActivatedPlan(planCode);
    if (activated) {
      return 'Payment confirmed and your plan is active.';
    }

    throw new Error(
      `${lastError} If the amount was charged, your plan will update automatically once Razorpay confirms it. Please do not pay again.`,
    );
  };

  const handleContinue = async () => {
    if (!selectedPlan || isCurrentSelected || !userId || isSubmitting) {
      if (isCurrentSelected && checkoutPhase === 'idle') {
        onClose();
      }
      return;
    }

    setActionError('');

    try {
      if (selectedPlan.id === 'free') {
        await activateFreePlan({ userId }).unwrap();
        showToast({ message: 'Switched to Free plan', type: 'success' });
        onClose();
        return;
      }

      setCheckoutPhase('creating');
      const order = await createPaymentOrder({
        userId,
        planCode: selectedPlan.id,
        interval: billingCycle,
      }).unwrap();

      if (!order.requiresPayment) {
        showToast({
          message: order.message || 'Plan updated',
          type: 'success',
        });
        onClose();
        return;
      }

      if (!order.keyId || !order.orderId) {
        throw new Error('Secure checkout could not be started. Please try again.');
      }

      setCheckoutPhase('paying');
      let checkout;
      try {
        checkout = await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency || 'INR',
          description: `${selectedPlan.name} ${billingCycle} plan`,
          name: authUser?.name,
          email: authUser?.email,
          phone: authUser?.phone,
        });
      } catch (checkoutError) {
        if (
          checkoutError instanceof RazorpayCheckoutError &&
          (checkoutError.code === 'dismissed' || checkoutError.code === 'incomplete')
        ) {
          setCheckoutPhase('verifying');
          const recovered = await recoverPaidOrder(order.orderId, selectedPlan.id);
          if (recovered) {
            showToast({ message: recovered, type: 'success' });
            onClose();
            return;
          }

          if (checkoutError.code === 'dismissed') {
            showToast({
              message: 'Checkout closed',
              description: 'No charge was completed, and your plan is unchanged.',
              type: 'info',
            });
            return;
          }
        }

        throw checkoutError;
      }

      setCheckoutPhase('verifying');
      const message = await confirmVerifiedPlan(selectedPlan.id, checkout);
      showToast({ message, type: 'success' });
      onClose();
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Unable to update plan right now'));
    } finally {
      setCheckoutPhase('idle');
    }
  };

  const requestClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose();
  };

  const footerLabel =
    checkoutPhase === 'paying'
      ? 'Complete payment in the secure popup'
      : checkoutPhase !== 'idle'
        ? checkoutLabels[checkoutPhase]
        : isActivatingFree
          ? 'Please wait…'
          : selectedPlan
            ? getPlanCtaLabel(selectedPlan, isCurrentSelected)
            : 'Select a plan';

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={requestClose}>
      <div
        className="settings-modal settings-plan-modal"
        role="dialog"
        aria-label="Plan details"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-plan-modal__header">
          <div>
            <p>Upgrade</p>
            <h2>Get Premium!</h2>
            <span>Supercharge your productivity with Buddy.</span>
          </div>
          <button type="button" onClick={requestClose} aria-label="Close plan details" disabled={isSubmitting}>
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="settings-plan-modal__body">
          <div className="settings-plan-banner">
            <div>
              <small>CURRENT PLAN</small>
              <strong>
                {desktopPlans.find((plan) => plan.id === currentPlanId)?.name ?? 'Free'}
              </strong>
              <p>Active · Switch anytime. Your work stays with you.</p>
            </div>
            <div className="settings-plan-banner__stats">
              <span>
                <strong>{formatUsageValue(usage?.spaces)}</strong>
                Spaces
              </span>
              <span>
                <strong>{formatUsageValue(usage?.notes)}</strong>
                Notes
              </span>
              <span>
                <strong>{formatRecordingUsage(usage)}</strong>
                Recording
              </span>
            </div>
          </div>

          {isPlansLoading ? (
            <div className="settings-inline-state" aria-busy="true">
              <span className="home-spinner" />
              <p>Loading plans…</p>
            </div>
          ) : null}

          {isPlansError ? (
            <div className="settings-inline-state settings-inline-state--error" role="alert">
              <FiAlertCircle aria-hidden="true" size={16} />
              <p>{getApiErrorMessage(plansError, 'Unable to load plans')}</p>
              <button type="button" className="home-retry-button" onClick={() => void refetchPlans()}>
                <FiRefreshCw aria-hidden="true" size={13} />
                Retry
              </button>
            </div>
          ) : null}

          {!isPlansLoading && !isPlansError && selectedPlan ? (
            <>
              <div className="settings-plan-billing">
                <span>Billing cycle</span>
                <div className="settings-plan-billing__toggle" role="tablist" aria-label="Billing cycle">
                  {billingOptions.map((option) => {
                    const selected = option.id === billingCycle;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={selected ? 'is-selected' : undefined}
                        disabled={isSubmitting}
                        onClick={() => setBillingCycle(option.id)}
                      >
                        {option.label}
                        {option.id === 'quarterly' ? <em>Save more</em> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="settings-plan-cards">
                {desktopPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    billingCycle={billingCycle}
                    selected={plan.id === selectedPlanId}
                    isCurrent={plan.id === currentPlanId}
                    disabled={isSubmitting}
                    onSelect={() => setSelectedPlanId(plan.id)}
                  />
                ))}
              </div>

              <section className="settings-plan-detail-card" aria-label={`${selectedPlan.name} details`}>
                <div className="settings-plan-detail-card__top">
                  <span
                    className={`settings-plan-detail-card__icon settings-plan-detail-card__icon--${selectedPlan.variant}`}
                  >
                    <SelectedIcon aria-hidden="true" size={18} />
                  </span>
                  <div>
                    <h3>{selectedPlan.name}</h3>
                    <p>{selectedPlan.tagline}</p>
                  </div>
                  <div className="settings-plan-detail-card__price">
                    <strong>{selectedPlan.prices[billingCycle]}</strong>
                    <small>{selectedPlan.cadence[billingCycle]}</small>
                    {quarterlyHint ? <em>{quarterlyHint}</em> : null}
                  </div>
                </div>

                <div className="settings-plan-limits">
                  <span>
                    <FiUsers aria-hidden="true" size={14} />
                    {selectedPlan.limits.spaces} spaces
                  </span>
                  <span>
                    <FiClock aria-hidden="true" size={14} />
                    {selectedPlan.limits.recordingHours} recording
                  </span>
                  <span>
                    <FiZap aria-hidden="true" size={14} />
                    {selectedPlan.limits.notes} notes
                  </span>
                </div>

                <div className="settings-plan-features">
                  <h4>Included</h4>
                  <ul>
                    {selectedPlan.features.map((feature) => (
                      <li key={feature}>
                        <FiCheck aria-hidden="true" size={14} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="settings-plan-languages">
                  <div>
                    <small>Languages included</small>
                    <strong>{selectedPlan.languages.length} languages available on this plan</strong>
                  </div>
                  <p>
                    <FiGlobe aria-hidden="true" size={14} />
                    {selectedPlan.languages.join(' · ')}
                  </p>
                </div>
              </section>

              <section className="settings-plan-compare" aria-label="Plan benefits comparison">
                <div className="settings-plan-compare__heading">
                  <h3>Benefits</h3>
                  <div className="settings-plan-compare__plan-heads">
                    {desktopPlans.map((plan) => (
                      <span
                        key={plan.id}
                        className={plan.id === selectedPlanId ? 'is-selected' : undefined}
                      >
                        {plan.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="settings-plan-compare__table">
                  {compareRows.map((row) => (
                    <div className="settings-plan-compare__row" key={row.id}>
                      <div className="settings-plan-compare__benefit">
                        <span className="settings-plan-compare__icon" aria-hidden="true">
                          {(() => {
                            const Icon = compareIcons[row.icon];
                            return <Icon size={16} />;
                          })()}
                        </span>
                        <div>
                          <strong>{row.label}</strong>
                          <p>{row.description}</p>
                        </div>
                      </div>
                      <div className="settings-plan-compare__values">
                        {desktopPlans.map((plan) => (
                          <CompareValue
                            key={`${row.id}-${plan.id}`}
                            value={row.values[plan.id]}
                            accent={plan.id !== 'free'}
                            selected={plan.id === selectedPlanId}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="settings-plan-faq" aria-label="Plan FAQ">
                <h3>Frequently asked</h3>
                <p>Billing, languages, and switching plans — covered.</p>
                <div className="settings-plan-faq__list">
                  {planFaqs.map((faq, index) => {
                    const isOpen = openFaqIndex === index;

                    return (
                      <div className={`settings-plan-faq__item${isOpen ? ' is-open' : ''}`} key={faq.q}>
                        <button type="button" onClick={() => setOpenFaqIndex(isOpen ? null : index)}>
                          <span>{faq.q}</span>
                          <strong aria-hidden="true">{isOpen ? '−' : '+'}</strong>
                        </button>
                        {isOpen ? <p>{faq.a}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <p className="settings-plan-legal">
                <FiShield aria-hidden="true" size={14} />
                Payments are secured. Change or cancel anytime.
              </p>
            </>
          ) : null}

          {actionError ? <p className="settings-form-error">{actionError}</p> : null}
        </div>

        <footer className="settings-plan-modal__footer">
          <button
            className="settings-primary-button"
            type="button"
            disabled={!selectedPlan || isCurrentSelected || isSubmitting || isPlansLoading || isPlansError}
            onClick={() => void handleContinue()}
          >
            {isSubmitting && checkoutPhase !== 'paying' ? (
              <span className="settings-button-spinner" aria-hidden="true" />
            ) : null}
            {footerLabel}
          </button>
        </footer>
      </div>
    </div>
  );
};

type PlanCardProps = {
  plan: DesktopPlan;
  billingCycle: BillingCycle;
  selected: boolean;
  isCurrent: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

const CompareValue = ({
  value,
  accent = false,
  selected = false,
}: {
  value?: string;
  accent?: boolean;
  selected?: boolean;
}) => {
  if (!value || value === '—') {
    return (
      <span className={`settings-plan-compare__value${selected ? ' is-selected' : ''}`}>
        <em aria-hidden="true">—</em>
      </span>
    );
  }

  if (value === 'Yes' || value === 'Unlimited') {
    return (
      <span
        className={`settings-plan-compare__value settings-plan-compare__value--check${
          accent ? ' is-accent' : ''
        }${selected ? ' is-selected' : ''}`}
      >
        <span className="settings-plan-compare__check" aria-label={value}>
          <FiCheck aria-hidden="true" size={12} />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`settings-plan-compare__value${accent ? ' is-accent' : ''}${
        selected ? ' is-selected' : ''
      }`}
    >
      {value}
    </span>
  );
};

const PlanCard = ({ plan, billingCycle, selected, isCurrent, disabled = false, onSelect }: PlanCardProps) => {
  const Icon = planIcons[plan.id];
  const hint = billingCycle === 'quarterly' ? getQuarterlyHint(plan) : null;

  return (
    <button
      type="button"
      className={`settings-plan-card settings-plan-card--${plan.variant}${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      {plan.badge ? <span className="settings-plan-card__badge">{plan.badge}</span> : null}
      <span className="settings-plan-card__icon">
        {isCurrent ? <FiCheck aria-hidden="true" size={14} /> : <Icon aria-hidden="true" size={14} />}
      </span>
      <strong>{plan.name}</strong>
      <b>{plan.prices[billingCycle]}</b>
      <small>{plan.cadence[billingCycle]}</small>
      {hint ? <em>{hint}</em> : <em className="is-empty">&nbsp;</em>}
      {isCurrent ? <span className="settings-plan-card__current">Current</span> : null}
    </button>
  );
};
