/**
 * AdminDashboard - Premium Light Mode
 * World-class Shopify App Store design
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  UserPlus,
  DollarSign,
  Calendar,
  Sparkles,
  Star,
  Award,
  ChevronRight,
  MoreHorizontal,
  Clock,
} from 'lucide-react';
import { getDashboardStats, getMembers, type DashboardStats, type Member } from '../api/adminApi';

// Design tokens
const colors = {
  bgPage: '#f6f6f7',
  bgSurface: '#ffffff',
  bgSurfaceHover: '#f9fafb',
  bgSubdued: '#fafbfb',
  text: '#202223',
  textSecondary: '#6d7175',
  textSubdued: '#8c9196',
  border: '#e1e3e5',
  primary: '#5c6ac4',
  primaryLight: '#f4f5fa',
  success: '#008060',
  successLight: '#e3f1ed',
  warning: '#b98900',
  warningLight: '#fef9e7',
  interactive: '#2c6ecb',
};

const shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
  cardHover: '0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.12)',
};

// Responsive hook
function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 640) setBreakpoint('mobile');
      else if (window.innerWidth < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return breakpoint;
}

// Stat Card Component
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  change,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  change?: number;
}) {
  const isPositive = change && change > 0;

  return (
    <div
      style={{
        backgroundColor: colors.bgSurface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        padding: 20,
        boxShadow: shadows.card,
        transition: 'box-shadow 200ms ease, transform 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = shadows.cardHover;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = shadows.card;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={iconColor} strokeWidth={2} />
        </div>
        {change !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 20,
              backgroundColor: isPositive ? colors.successLight : colors.bgSubdued,
              color: isPositive ? colors.success : colors.textSecondary,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <TrendingUp size={14} />
            {isPositive ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: colors.text,
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 4,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// Member Row Component
function MemberRow({ member }: { member: Member }) {
  const tierColors: Record<string, { bg: string; color: string }> = {
    bronze: { bg: '#fdf4e8', color: '#8b5a2b' },
    silver: { bg: '#f3f4f6', color: '#6b7280' },
    gold: { bg: '#fef9e7', color: '#b8860b' },
    platinum: { bg: '#f1f5f9', color: '#64748b' },
  };
  const tierName = member.tier?.name?.toLowerCase() || 'silver';
  const tier = tierColors[tierName] || tierColors.silver;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: `1px solid ${colors.border}`,
        gap: 12,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primaryLight,
          color: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {(member.name?.[0] || member.email?.[0] || 'M').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: colors.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {member.name || 'Member'}
        </div>
        <div
          style={{
            fontSize: 12,
            color: colors.textSubdued,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {member.member_number} · {member.email}
        </div>
      </div>
      <div
        style={{
          padding: '4px 10px',
          borderRadius: 20,
          backgroundColor: tier.bg,
          color: tier.color,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'capitalize',
          flexShrink: 0,
        }}
      >
        {member.tier?.name || 'Silver'}
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({
  icon: Icon,
  iconBg,
  iconColor,
  text,
  time,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  text: string;
  time: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 0',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={iconColor} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.4 }}>{text}</div>
        <div style={{ fontSize: 12, color: colors.textSubdued, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} />
          {time}
        </div>
      </div>
    </div>
  );
}

// Quick Action Card
function QuickActionCard({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        padding: 16,
        backgroundColor: colors.bgSurface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        textDecoration: 'none',
        transition: 'all 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.primary;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${colors.primary}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: colors.primaryLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Icon size={20} color={colors.primary} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: colors.textSecondary }}>
        {description}
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const breakpoint = useResponsive();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, membersRes] = await Promise.all([
          getDashboardStats(),
          getMembers({ limit: 5 }),
        ]);
        setStats(statsRes);
        setMembers(membersRes.members || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Responsive grid columns
  const statsGridColumns = breakpoint === 'desktop' ? 4 : breakpoint === 'tablet' ? 2 : 1;
  const quickActionsColumns = breakpoint === 'desktop' ? 4 : breakpoint === 'tablet' ? 2 : 1;
  const contentColumns = breakpoint === 'mobile' ? 1 : 2;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: breakpoint === 'mobile' ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: breakpoint === 'mobile' ? 'column' : 'row',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, margin: 0, letterSpacing: '-0.5px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: '4px 0 0 0' }}>
            Welcome back! Here's what's happening with your loyalty program.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to="/admin/events/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              backgroundColor: colors.bgSurface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 150ms ease',
            }}
          >
            <Calendar size={16} />
            New Event
          </Link>
          <Link
            to="/admin/members/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              backgroundColor: colors.primary,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 150ms ease',
            }}
          >
            <UserPlus size={16} />
            New Member
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${statsGridColumns}, 1fr)`,
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          icon={Users}
          iconBg={colors.primaryLight}
          iconColor={colors.primary}
          label="Total Members"
          value={loading ? '—' : stats?.total_members || 0}
          change={12}
        />
        <StatCard
          icon={TrendingUp}
          iconBg={colors.successLight}
          iconColor={colors.success}
          label="Active Members"
          value={loading ? '—' : stats?.active_members || 0}
        />
        <StatCard
          icon={UserPlus}
          iconBg="#e8f4fd"
          iconColor={colors.interactive}
          label="New This Month"
          value={loading ? '—' : stats?.members_this_month || 0}
        />
        <StatCard
          icon={DollarSign}
          iconBg={colors.warningLight}
          iconColor={colors.warning}
          label="Credit This Month"
          value={loading ? '—' : `$${(stats?.total_credited_this_month || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        />
      </div>

      {/* Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${contentColumns}, 1fr)`,
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Recent Members */}
        <div
          style={{
            backgroundColor: colors.bgSurface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.card,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>
              Recent Members
            </h2>
            <Link
              to="/admin/members"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                color: colors.interactive,
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              View all
              <ChevronRight size={16} />
            </Link>
          </div>
          <div style={{ padding: '8px 20px 16px' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: colors.textSubdued }}>Loading...</div>
            ) : members.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: colors.textSubdued }}>No members yet</div>
            ) : (
              members.map((member) => <MemberRow key={member.id} member={member} />)
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          style={{
            backgroundColor: colors.bgSurface,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.card,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>
              Recent Activity
            </h2>
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: colors.textSubdued,
              }}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div style={{ padding: '8px 20px 16px' }}>
            <ActivityItem
              icon={UserPlus}
              iconBg={colors.primaryLight}
              iconColor={colors.primary}
              text="Michael joined as Silver member"
              time="2 min ago"
            />
            <ActivityItem
              icon={Sparkles}
              iconBg={colors.successLight}
              iconColor={colors.success}
              text="Trade Night credited $487.20 to 32 customers"
              time="1 hour ago"
            />
            <ActivityItem
              icon={Star}
              iconBg={colors.warningLight}
              iconColor={colors.warning}
              text="Sarah upgraded to Gold"
              time="3 hours ago"
            />
            <ActivityItem
              icon={UserPlus}
              iconBg={colors.primaryLight}
              iconColor={colors.primary}
              text="John joined as Silver member"
              time="5 hours ago"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: '0 0 16px 0' }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${quickActionsColumns}, 1fr)`,
            gap: 16,
          }}
        >
          <QuickActionCard
            icon={UserPlus}
            title="Register Member"
            description="Sign up a new TradeUp member"
            to="/admin/members/new"
          />
          <QuickActionCard
            icon={Sparkles}
            title="Credit Event"
            description="Run a store credit promotion"
            to="/admin/events/new"
          />
          <QuickActionCard
            icon={Users}
            title="Manage Members"
            description="View and edit member accounts"
            to="/admin/members"
          />
          <QuickActionCard
            icon={Award}
            title="Tier Settings"
            description="Configure membership tiers"
            to="/admin/settings"
          />
        </div>
      </div>

      {/* Membership Tiers Summary */}
      <div
        style={{
          backgroundColor: colors.bgSurface,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.card,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: '0 0 16px 0' }}>
          Membership Tiers
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: breakpoint === 'mobile' ? '1fr' : 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {[
            { name: 'Bronze', rate: '50%', color: '#8b5a2b', bg: '#fdf4e8' },
            { name: 'Silver', rate: '60%', color: '#6b7280', bg: '#f3f4f6' },
            { name: 'Gold', rate: '70%', color: '#b8860b', bg: '#fef9e7' },
          ].map((tier) => (
            <div
              key={tier.name}
              style={{
                padding: 16,
                borderRadius: 10,
                backgroundColor: tier.bg,
                border: `1px solid ${tier.bg}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: tier.color }}>{tier.name}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: tier.color }}>{tier.rate} bonus</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
