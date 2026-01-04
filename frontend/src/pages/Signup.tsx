import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTiers, createCheckout } from '../api/membership';
import type { Tier } from '../api/auth';

export default function Signup() {
  const { signup, isAuthenticated, member } = useAuth();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<'account' | 'tier'>('account');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Account form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    // Load tiers
    getTiers().then((response) => {
      setTiers(response.tiers);
      // Pre-select tier from URL if provided
      const tierParam = searchParams.get('tier');
      if (tierParam) {
        setSelectedTier(parseInt(tierParam));
        if (isAuthenticated) {
          setStep('tier');
        }
      }
    });
  }, [searchParams, isAuthenticated]);

  // If already logged in and has tier selected, go to payment
  useEffect(() => {
    if (isAuthenticated && member && selectedTier) {
      handlePayment();
    }
  }, [isAuthenticated, member, selectedTier]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await signup({ email, password, name: name || undefined });
      setStep('tier');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedTier) {
      setError('Please select a membership tier');
      return;
    }

    setLoading(true);
    try {
      const session = await createCheckout(
        selectedTier,
        `${window.location.origin}/dashboard?welcome=1`,
        `${window.location.origin}/signup`
      );
      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment setup failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-orange-500">
            Quick Flip
          </Link>
          <h1 className="text-3xl font-bold mt-4">Create Your Account</h1>
          <p className="text-gray-600">Join Quick Flip and start earning more from your trade-ins</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center ${step === 'account' ? 'text-orange-500' : 'text-green-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'account' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
              {step === 'tier' ? '✓' : '1'}
            </div>
            <span className="ml-2 font-medium">Account</span>
          </div>
          <div className="w-12 h-1 bg-gray-200 mx-4">
            <div className={`h-full ${step === 'tier' ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
          </div>
          <div className={`flex items-center ${step === 'tier' ? 'text-orange-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'tier' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="ml-2 font-medium">Choose Plan</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 max-w-md mx-auto">
            {error}
          </div>
        )}

        {/* Step 1: Account Creation */}
        {step === 'account' && (
          <div className="card max-w-md mx-auto p-8">
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full mt-6"
              >
                {loading ? 'Creating Account...' : 'Continue to Plan Selection'}
              </button>
            </form>

            <p className="text-center mt-6 text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-orange-500 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Step 2: Tier Selection */}
        {step === 'tier' && (
          <div>
            <div className="grid md:grid-cols-3 gap-6">
              {tiers.map((tier, index) => (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`tier-card ${selectedTier === tier.id ? 'selected' : ''} ${index === 1 ? 'relative' : ''}`}
                >
                  {index === 1 && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-sm px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <h4 className="text-xl font-bold mb-2">{tier.name}</h4>
                  <p className="text-3xl font-bold text-orange-500 mb-4">
                    ${tier.monthly_price}
                    <span className="text-sm text-gray-500 font-normal">/mo</span>
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>{Math.round(tier.bonus_rate * 100)}% Quick Flip Bonus</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>{tier.quick_flip_days}-day bonus window</span>
                    </li>
                    {tier.benefits?.discount_percent != null && (
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>{Number(tier.benefits.discount_percent)}% store discount</span>
                      </li>
                    )}
                  </ul>
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${selectedTier === tier.id ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}></div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={handlePayment}
                disabled={!selectedTier || loading}
                className="btn btn-primary px-12 py-3 text-lg"
              >
                {loading ? 'Setting up payment...' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
