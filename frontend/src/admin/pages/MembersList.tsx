import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMembers, getTiers, type Member, type Tier } from '../api/adminApi';
import { debounce } from '../utils/debounce';

// Icons
const Icons = {
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Filter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  MoreVertical: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
};

// Tier badge component
function TierBadge({ tier }: { tier: string }) {
  const tierClass = tier?.toLowerCase() || 'none';
  if (!tier || tier === 'None') {
    return <span className="text-sm text-white/30">—</span>;
  }
  return <span className={`admin-tier-badge ${tierClass}`}>{tier}</span>;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`admin-status-badge ${status}`}>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background:
            status === 'active'
              ? '#10b981'
              : status === 'pending'
              ? '#f59e0b'
              : '#ef4444',
        }}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function MembersList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [tierFilter, setTierFilter] = useState(searchParams.get('tier') || '');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMembers({
        page,
        limit,
        search: search || undefined,
        status: statusFilter || undefined,
        tier_id: tierFilter ? parseInt(tierFilter, 10) : undefined,
      });
      setMembers(result.members);
      setTotal(result.total);
      setPages(result.pages);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tierFilter]);

  // Fetch tiers once
  useEffect(() => {
    getTiers()
      .then((res) => setTiers(res.tiers))
      .catch(console.error);
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      setSearchParams(params);
    }, 300),
    [searchParams]
  );

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
    if (key === 'status') setStatusFilter(value);
    if (key === 'tier') setTierFilter(value);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTierFilter('');
    setSearchParams({});
  };

  // Fetch on param changes
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const hasFilters = search || statusFilter || tierFilter;

  return (
    <div className="space-y-6 admin-fade-in">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-page-title">Members</h1>
          <p className="text-white/50 mt-1">
            {total} total member{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/admin/members/new" className="admin-btn admin-btn-primary">
          <Icons.Plus />
          New Member
        </Link>
      </div>

      {/* Filters */}
      <div className="admin-glass admin-glass-glow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="admin-search flex-1">
            <span className="admin-search-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, or member number..."
              value={search}
              onChange={handleSearchChange}
              className="admin-input pl-12"
            />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="admin-input appearance-none pr-10 cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
              <Icons.ChevronDown />
            </span>
          </div>

          {/* Tier Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={tierFilter}
              onChange={(e) => handleFilterChange('tier', e.target.value)}
              className="admin-input appearance-none pr-10 cursor-pointer"
            >
              <option value="">All Tiers</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
              <Icons.ChevronDown />
            </span>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button onClick={clearFilters} className="admin-btn admin-btn-ghost">
              <Icons.X />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="admin-glass admin-glass-glow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Member #</th>
                <th>Tier</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Trade-ins</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="admin-skeleton w-10 h-10 rounded-full" />
                        <div>
                          <div className="admin-skeleton h-4 w-32 mb-2" />
                          <div className="admin-skeleton h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td><div className="admin-skeleton h-4 w-16" /></td>
                    <td><div className="admin-skeleton h-6 w-16 rounded-full" /></td>
                    <td><div className="admin-skeleton h-6 w-16 rounded" /></td>
                    <td><div className="admin-skeleton h-4 w-20" /></td>
                    <td><div className="admin-skeleton h-4 w-8" /></td>
                    <td></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-white/30">
                      {hasFilters ? 'No members match your filters' : 'No members yet'}
                    </div>
                    {!hasFilters && (
                      <Link
                        to="/admin/members/new"
                        className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mt-2"
                      >
                        <Icons.Plus />
                        Add your first member
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                members.map((member, idx) => (
                  <tr
                    key={member.id}
                    className="admin-slide-in cursor-pointer"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <td>
                      <Link
                        to={`/admin/members/${member.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-600/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-400 font-semibold text-sm">
                            {(member.name || member.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium hover:text-orange-400 transition-colors">
                            {member.name || '(No name)'}
                          </p>
                          <p className="text-sm text-white/40">{member.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <code className="text-sm bg-white/5 px-2 py-1 rounded">
                        {member.member_number}
                      </code>
                    </td>
                    <td>
                      <TierBadge tier={member.tier?.name || 'None'} />
                    </td>
                    <td>
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="text-white/60 text-sm">
                      {new Date(member.membership_start_date).toLocaleDateString()}
                    </td>
                    <td className="text-white/60">
                      {member.total_trade_ins}
                    </td>
                    <td>
                      <button className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        <Icons.MoreVertical />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/5">
            <p className="text-sm text-white/40">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="admin-btn admin-btn-ghost admin-btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icons.ChevronLeft />
              </button>
              <span className="text-sm text-white/60 min-w-[80px] text-center">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pages}
                className="admin-btn admin-btn-ghost admin-btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icons.ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
