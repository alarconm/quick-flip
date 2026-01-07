import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOnboardingStatus,
  checkStoreCredit,
  getOnboardingTemplates,
  applyTemplate,
  completeOnboarding,
  skipOnboarding,
  type OnboardingStatus,
  type StoreCreditCheck,
  type TierTemplate,
} from '../api';

// Icons
const Icons = {
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Loader: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  ExternalLink: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Rocket: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
};

// Step indicator component
function StepIndicator({ step, current, status }: { step: number; current: number; status: string }) {
  const isComplete = status === 'complete';
  const isCurrent = step === current;

  return (
    <div className={`onboarding-step-indicator ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
      {isComplete ? (
        <Icons.Check />
      ) : (
        <span>{step}</span>
      )}
    </div>
  );
}

// Template card component
function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TierTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`onboarding-template-card ${selected ? 'selected' : ''}`}
    >
      <div className="template-header">
        <h4>{template.name}</h4>
        <span className="tier-count">{template.tier_count} tiers</span>
      </div>
      <p className="template-description">{template.description}</p>
      <div className="template-tiers">
        {template.tiers.map((tier, idx) => (
          <div key={idx} className="template-tier-preview" style={{ borderColor: tier.color }}>
            <span className="tier-icon">{tier.icon}</span>
            <span className="tier-name">{tier.name}</span>
            <span className="tier-rate">{tier.trade_in_rate}%</span>
          </div>
        ))}
      </div>
      {selected && (
        <div className="selected-badge">
          <Icons.Check /> Selected
        </div>
      )}
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [storeCreditCheck, setStoreCreditCheck] = useState<StoreCreditCheck | null>(null);
  const [templates, setTemplates] = useState<TierTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingStoreCredit, setCheckingStoreCredit] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    Promise.all([
      getOnboardingStatus(),
      getOnboardingTemplates(),
    ])
      .then(([statusRes, templatesRes]) => {
        setStatus(statusRes);
        setTemplates(templatesRes.templates);

        // If already complete, redirect to dashboard
        if (statusRes.setup_complete) {
          navigate('/');
        }
      })
      .catch((err) => {
        console.error('Failed to load onboarding:', err);
        setError('Failed to load onboarding status');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Check store credit status
  const handleCheckStoreCredit = async () => {
    setCheckingStoreCredit(true);
    setError(null);
    try {
      const result = await checkStoreCredit();
      setStoreCreditCheck(result);

      // Update status if store credit is now enabled
      if (result.enabled) {
        const newStatus = await getOnboardingStatus();
        setStatus(newStatus);
      }
    } catch (err) {
      console.error('Failed to check store credit:', err);
      setError('Failed to check store credit status');
    } finally {
      setCheckingStoreCredit(false);
    }
  };

  // Apply selected template
  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setApplying(true);
    setError(null);
    try {
      await applyTemplate(selectedTemplate);
      const newStatus = await getOnboardingStatus();
      setStatus(newStatus);
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  // Complete setup
  const handleComplete = async () => {
    setApplying(true);
    try {
      await completeOnboarding();
      navigate('/');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError('Failed to complete setup');
    } finally {
      setApplying(false);
    }
  };

  // Skip onboarding
  const handleSkip = async () => {
    try {
      await skipOnboarding();
      navigate('/');
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-loading">
        <Icons.Loader />
        <p>Loading setup wizard...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="onboarding-error">
        <Icons.AlertCircle />
        <p>Failed to load onboarding status</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      {/* Header */}
      <div className="onboarding-header">
        <div className="header-icon">
          <Icons.Rocket />
        </div>
        <h1>Welcome to TradeUp!</h1>
        <p>Let's get your loyalty program set up in just a few steps.</p>
      </div>

      {/* Progress bar */}
      <div className="onboarding-progress">
        {status.steps.map((step, idx) => (
          <div key={step.id} className="progress-step">
            <StepIndicator
              step={step.id}
              current={status.current_step}
              status={step.status}
            />
            <div className="step-content">
              <span className="step-name">{step.name}</span>
              <span className="step-desc">{step.description}</span>
            </div>
            {idx < status.steps.length - 1 && (
              <div className={`step-connector ${step.status === 'complete' ? 'complete' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="onboarding-error-banner">
          <Icons.AlertCircle />
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Current step content */}
      <div className="onboarding-step-content">
        {/* Step 2: Store Credit Check */}
        {status.current_step === 2 && (
          <div className="step-panel store-credit-check">
            <h2>Enable Shopify Store Credit</h2>
            <p>
              TradeUp uses Shopify's native store credit feature to reward your customers.
              This needs to be enabled in your Shopify settings.
            </p>

            {!storeCreditCheck ? (
              <button
                className="btn-primary"
                onClick={handleCheckStoreCredit}
                disabled={checkingStoreCredit}
              >
                {checkingStoreCredit ? (
                  <>
                    <Icons.Loader /> Checking...
                  </>
                ) : (
                  <>Check Store Credit Status</>
                )}
              </button>
            ) : storeCreditCheck.enabled ? (
              <div className="status-success">
                <Icons.Check />
                <div>
                  <strong>Store credit is enabled!</strong>
                  <p>{storeCreditCheck.message}</p>
                </div>
              </div>
            ) : (
              <div className="status-warning">
                <Icons.AlertCircle />
                <div>
                  <strong>Store credit needs to be enabled</strong>
                  <p>{storeCreditCheck.message}</p>
                  {storeCreditCheck.instructions && (
                    <ol className="instructions-list">
                      {storeCreditCheck.instructions.map((instruction, idx) => (
                        <li key={idx}>{instruction}</li>
                      ))}
                    </ol>
                  )}
                  {storeCreditCheck.settings_url && (
                    <a
                      href={storeCreditCheck.settings_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      Open Shopify Settings <Icons.ExternalLink />
                    </a>
                  )}
                  <button
                    className="btn-primary"
                    onClick={handleCheckStoreCredit}
                    disabled={checkingStoreCredit}
                  >
                    {checkingStoreCredit ? (
                      <>
                        <Icons.Loader /> Checking...
                      </>
                    ) : (
                      <>Check Again</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Choose Template */}
        {status.current_step === 3 && (
          <div className="step-panel template-selection">
            <h2>Choose Your Tier Structure</h2>
            <p>
              Select a pre-built template that matches your business type.
              You can customize these later in Settings.
            </p>

            <div className="templates-grid">
              {templates.map((template) => (
                <TemplateCard
                  key={template.key}
                  template={template}
                  selected={selectedTemplate === template.key}
                  onSelect={() => setSelectedTemplate(template.key)}
                />
              ))}
            </div>

            <div className="template-actions">
              <button
                className="btn-primary"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || applying}
              >
                {applying ? (
                  <>
                    <Icons.Loader /> Applying...
                  </>
                ) : (
                  <>
                    Apply Template <Icons.ChevronRight />
                  </>
                )}
              </button>
              <button className="btn-text" onClick={() => navigate('/settings/tiers')}>
                Or create custom tiers
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Ready to Go */}
        {status.current_step === 4 && (
          <div className="step-panel ready-to-go">
            <div className="celebration-icon">
              <Icons.Rocket />
            </div>
            <h2>You're All Set!</h2>
            <p>
              Your loyalty program is ready to start accepting members.
              Customers will automatically be enrolled when they make a purchase.
            </p>

            <div className="summary-cards">
              <div className="summary-card">
                <span className="label">Tiers Created</span>
                <span className="value">{status.steps[2].status === 'complete' ? '3' : '0'}</span>
              </div>
              <div className="summary-card">
                <span className="label">Store Credit</span>
                <span className="value">Enabled</span>
              </div>
              <div className="summary-card">
                <span className="label">Auto-Enrollment</span>
                <span className="value">On</span>
              </div>
            </div>

            <button className="btn-primary btn-large" onClick={handleComplete} disabled={applying}>
              {applying ? (
                <>
                  <Icons.Loader /> Finishing...
                </>
              ) : (
                <>
                  Go to Dashboard <Icons.ChevronRight />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Skip link */}
      <div className="onboarding-footer">
        <button className="btn-text" onClick={handleSkip}>
          Skip setup and configure manually
        </button>
      </div>

      {/* Styles */}
      <style>{`
        .onboarding-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        .onboarding-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .header-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .onboarding-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px;
          color: var(--text-primary);
        }

        .onboarding-header p {
          font-size: 16px;
          color: var(--text-secondary);
          margin: 0;
        }

        .onboarding-progress {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-bottom: 48px;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }

        .onboarding-step-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-card);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.3s ease;
        }

        .onboarding-step-indicator.complete {
          background: var(--success);
          border-color: var(--success);
          color: white;
        }

        .onboarding-step-indicator.current {
          border-color: var(--brand);
          color: var(--brand);
          box-shadow: 0 0 0 4px rgba(232, 93, 39, 0.2);
        }

        .step-content {
          text-align: center;
          margin-top: 12px;
        }

        .step-name {
          display: block;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .step-desc {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .step-connector {
          position: absolute;
          top: 20px;
          left: calc(50% + 24px);
          width: calc(100% - 48px);
          height: 2px;
          background: var(--border);
        }

        .step-connector.complete {
          background: var(--success);
        }

        .step-panel {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px;
        }

        .step-panel h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px;
          color: var(--text-primary);
        }

        .step-panel > p {
          color: var(--text-secondary);
          margin: 0 0 24px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: var(--brand);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--brand-dark);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary.btn-large {
          padding: 16px 32px;
          font-size: 16px;
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: transparent;
          color: var(--brand);
          border: 1px solid var(--brand);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          margin-right: 12px;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: rgba(232, 93, 39, 0.1);
        }

        .btn-text {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
          font-size: 14px;
        }

        .btn-text:hover {
          color: var(--text-primary);
        }

        .status-success,
        .status-warning {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .status-success {
          background: rgba(0, 214, 143, 0.1);
          border: 1px solid rgba(0, 214, 143, 0.3);
        }

        .status-success svg {
          color: var(--success);
          flex-shrink: 0;
        }

        .status-warning {
          background: rgba(255, 181, 71, 0.1);
          border: 1px solid rgba(255, 181, 71, 0.3);
        }

        .status-warning svg {
          color: var(--warning);
          flex-shrink: 0;
        }

        .status-success strong,
        .status-warning strong {
          display: block;
          margin-bottom: 4px;
          color: var(--text-primary);
        }

        .status-success p,
        .status-warning p {
          margin: 0 0 12px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .instructions-list {
          margin: 0 0 16px;
          padding-left: 20px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .instructions-list li {
          margin-bottom: 8px;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .onboarding-template-card {
          background: var(--bg-input);
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .onboarding-template-card:hover {
          border-color: var(--brand);
        }

        .onboarding-template-card.selected {
          border-color: var(--brand);
          background: rgba(232, 93, 39, 0.05);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .template-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .tier-count {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-card);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .template-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 16px;
        }

        .template-tiers {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .template-tier-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-card);
          border-radius: 8px;
          border-left: 3px solid;
        }

        .tier-icon {
          font-size: 16px;
        }

        .tier-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .tier-rate {
          font-size: 13px;
          font-weight: 600;
          color: var(--brand);
        }

        .selected-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--brand);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .selected-badge svg {
          width: 14px;
          height: 14px;
        }

        .template-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ready-to-go {
          text-align: center;
        }

        .celebration-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .summary-cards {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin: 32px 0;
        }

        .summary-card {
          background: var(--bg-input);
          border-radius: 12px;
          padding: 20px 32px;
          text-align: center;
        }

        .summary-card .label {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .summary-card .value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .onboarding-footer {
          text-align: center;
          margin-top: 32px;
        }

        .onboarding-loading,
        .onboarding-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 400px;
          color: var(--text-secondary);
        }

        .onboarding-error svg {
          color: var(--danger);
        }

        .onboarding-error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 71, 87, 0.1);
          border: 1px solid rgba(255, 71, 87, 0.3);
          border-radius: 8px;
          margin-bottom: 24px;
          color: var(--danger);
        }

        .onboarding-error-banner span {
          flex: 1;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 600px) {
          .onboarding-progress {
            flex-direction: column;
            gap: 16px;
          }

          .progress-step {
            flex-direction: row;
            gap: 16px;
          }

          .step-content {
            text-align: left;
            margin-top: 0;
          }

          .step-connector {
            display: none;
          }

          .templates-grid {
            grid-template-columns: 1fr;
          }

          .summary-cards {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
