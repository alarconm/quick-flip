import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createPortalSession, getSubscriptionStatus } from '../api/membership';
import type { SubscriptionStatus } from '../api/membership';

export default function Dashboard() {
  const { member, logout, refreshMember } = useAuth();
  const [searchParams] = useSearchParams();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const isWelcome = searchParams.get('welcome') === '1';

  useEffect(() => {
    // Refresh member data on mount (in case we just came from Stripe checkout)
    refreshMember();

    // Get subscription status
    getSubscriptionStatus()
      .then(setSubscriptionStatus)
      .catch(console.error);
  }, []);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const session = await createPortalSession(`${window.location.origin}/dashboard`);
      window.location.href = session.url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-500">Quick Flip</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{member.name || member.email}</span>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        {isWelcome && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h2 className="text-green-800 font-semibold">🎉 Welcome to Quick Flip!</h2>
            <p className="text-green-700">Your membership is now active. Start trading in your cards to earn bonuses!</p>
          </div>
        )}

        {/* Pending Payment Warning */}
        {member.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="text-yellow-800 font-semibold">⚠️ Complete Your Signup</h2>
            <p className="text-yellow-700">Please complete payment to activate your membership benefits.</p>
            <Link to="/signup" className="btn btn-primary mt-2">
              Complete Signup
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Member Card */}
          <div className="card p-6">
            <h3 className="text-sm text-gray-500 mb-1">Member Number</h3>
            <p className="text-2xl font-bold">{member.member_number}</p>
          </div>

          {/* Tier Card */}
          <div className="card p-6">
            <h3 className="text-sm text-gray-500 mb-1">Membership Tier</h3>
            <p className="text-2xl font-bold text-orange-500">
              {member.tier?.name || 'No Plan'}
            </p>
            {member.tier && (
              <p className="text-sm text-gray-600">
                {Math.round(member.tier.bonus_rate * 100)}% Quick Flip Bonus
              </p>
            )}
          </div>

          {/* Store Credit */}
          <div className="card p-6">
            <h3 className="text-sm text-gray-500 mb-1">Store Credit Balance</h3>
            <p className="text-2xl font-bold text-green-600">$0.00</p>
            <p className="text-sm text-gray-500">Visit store to use credit</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bonus Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Flip Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Bonus Earned</span>
                <span className="font-semibold text-green-600">
                  ${member.stats?.total_bonus_earned?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Trade-Ins</span>
                <span className="font-semibold">{member.stats?.total_trade_ins || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Trade Value</span>
                <span className="font-semibold">
                  ${member.stats?.total_trade_value?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Subscription Management */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Subscription</h3>
            {subscriptionStatus ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-semibold ${subscriptionStatus.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {subscriptionStatus.status.charAt(0).toUpperCase() + subscriptionStatus.status.slice(1)}
                  </span>
                </div>
                {subscriptionStatus.current_period_end && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Billing Date</span>
                    <span className="font-semibold">
                      {new Date(subscriptionStatus.current_period_end).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {subscriptionStatus.cancel_at_period_end && (
                  <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm">
                    Your subscription will end on{' '}
                    {new Date(subscriptionStatus.current_period_end).toLocaleDateString()}
                  </div>
                )}
                <button
                  onClick={handleManageBilling}
                  disabled={loading}
                  className="btn btn-secondary w-full"
                >
                  {loading ? 'Loading...' : 'Manage Subscription'}
                </button>
              </div>
            ) : (
              <p className="text-gray-600">No active subscription</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Recent Bonus Activity</h3>
          <div className="text-center py-8 text-gray-500">
            <p>No bonus activity yet.</p>
            <p className="text-sm">Trade in some cards to earn Quick Flip bonuses!</p>
          </div>
        </div>
      </main>
    </div>
  );
}
