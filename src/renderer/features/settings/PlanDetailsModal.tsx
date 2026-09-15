import { useMemo, useState } from 'react';
import {
  FiCheck,
  FiClock,
  FiGlobe,
  FiShield,
  FiStar,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

import {
  billingOptions,
  compareRows,
  getPlanCtaLabel,
  getQuarterlyHint,
  planFaqs,
  plans,
  type BillingCycle,
  type DesktopPlan,
  type PlanId,
} from './planCatalog';

type PlanDetailsModalProps = {
  currentPlanId?: PlanId;
  onClose: () => void;
};

const planIcons: Record<PlanId, typeof FiStar> = {
  free: FiZap,
  pro: FiStar,
  business: FiUsers,
};

export const PlanDetailsModal = ({ currentPlanId = 'free', onClose }: PlanDetailsModalProps) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(
    currentPlanId === 'free' ? 'pro' : currentPlanId,
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[1],
    [selectedPlanId],
  );

  const isCurrentSelected = selectedPlan.id === currentPlanId;
  const quarterlyHint =
    billingCycle === 'quarterly' ? getQuarterlyHint(selectedPlan) : null;
  const SelectedIcon = planIcons[selectedPlan.id];

  const handleContinue = () => {
    onClose();
  };

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
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
          <button type="button" onClick={onClose} aria-label="Close plan details">
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="settings-plan-modal__body">
          <div className="settings-plan-banner">
            <div>
              <small>CURRENT PLAN</small>
              <strong>{plans.find((plan) => plan.id === currentPlanId)?.name ?? 'Free'}</strong>
              <p>Active · Switch anytime. Your work stays with you.</p>
            </div>
            <div className="settings-plan-banner__stats">
              <span>
                <strong>10</strong>
                Spaces
              </span>
              <span>
                <strong>18</strong>
                Notes
              </span>
              <span>
                <strong>2 hrs</strong>
                Recording
              </span>
            </div>
          </div>

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
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                selected={plan.id === selectedPlanId}
                isCurrent={plan.id === currentPlanId}
                onSelect={() => setSelectedPlanId(plan.id)}
              />
            ))}
          </div>

          <section className="settings-plan-detail-card" aria-label={`${selectedPlan.name} details`}>
            <div className="settings-plan-detail-card__top">
              <span className={`settings-plan-detail-card__icon settings-plan-detail-card__icon--${selectedPlan.variant}`}>
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
            <h3>Benefits</h3>
            <div className="settings-plan-compare__table">
              <div className="settings-plan-compare__row settings-plan-compare__row--head">
                <span>Feature</span>
                <span>Free</span>
                <span>Pro</span>
                <span>Business</span>
              </div>
              {compareRows.map((row) => (
                <div className="settings-plan-compare__row" key={row.label}>
                  <span>{row.label}</span>
                  <span>{row.free}</span>
                  <span>{row.pro}</span>
                  <span>{row.business}</span>
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
        </div>

        <footer className="settings-plan-modal__footer">
          <button
            className="settings-primary-button"
            type="button"
            disabled={isCurrentSelected}
            onClick={handleContinue}
          >
            {getPlanCtaLabel(selectedPlan, isCurrentSelected)}
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
  onSelect: () => void;
};

const PlanCard = ({ plan, billingCycle, selected, isCurrent, onSelect }: PlanCardProps) => {
  const Icon = planIcons[plan.id];
  const hint = billingCycle === 'quarterly' ? getQuarterlyHint(plan) : null;

  return (
    <button
      type="button"
      className={`settings-plan-card settings-plan-card--${plan.variant}${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
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
