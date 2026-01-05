import { useState, useEffect } from 'react'
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getTradeInCategories,
  type Promotion,
  type PromotionType,
  type PromotionChannel,
  type TradeInCategory
} from '../api'

const PROMO_TYPE_LABELS: Record<PromotionType, string> = {
  trade_in_bonus: 'Trade-In Bonus',
  purchase_cashback: 'Purchase Cashback',
  flat_bonus: 'Flat Bonus',
  multiplier: 'Credit Multiplier',
}

const CHANNEL_LABELS: Record<PromotionChannel, string> = {
  all: 'All Channels',
  in_store: 'In-Store Only',
  online: 'Online Only',
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [categories, setCategories] = useState<TradeInCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [filter, setFilter] = useState<'all' | 'active'>('all')

  const [form, setForm] = useState({
    name: '',
    description: '',
    code: '',
    promo_type: 'trade_in_bonus' as PromotionType,
    bonus_percent: 10,
    bonus_flat: 0,
    multiplier: 1,
    starts_at: '',
    ends_at: '',
    daily_start_time: '',
    daily_end_time: '',
    active_days: [] as number[],
    channel: 'all' as PromotionChannel,
    category_ids: [] as number[],
    tier_restriction: [] as string[],
    min_items: 0,
    min_value: 0,
    stackable: true,
    priority: 0,
    max_uses: undefined as number | undefined,
    max_uses_per_member: undefined as number | undefined,
    active: true,
  })

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [promoData, catData] = await Promise.all([
        getPromotions({ active_only: filter === 'active' }),
        getTradeInCategories(true),
      ])
      setPromotions(promoData.promotions)
      setCategories(catData.categories)
    } catch (err) {
      setError('Failed to load promotions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openNewModal = () => {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    setForm({
      name: '',
      description: '',
      code: '',
      promo_type: 'trade_in_bonus',
      bonus_percent: 10,
      bonus_flat: 0,
      multiplier: 1,
      starts_at: now.toISOString().slice(0, 16),
      ends_at: nextWeek.toISOString().slice(0, 16),
      daily_start_time: '',
      daily_end_time: '',
      active_days: [],
      channel: 'all',
      category_ids: [],
      tier_restriction: [],
      min_items: 0,
      min_value: 0,
      stackable: true,
      priority: 0,
      max_uses: undefined,
      max_uses_per_member: undefined,
      active: true,
    })
    setEditingPromo(null)
    setShowModal(true)
  }

  const openEditModal = (promo: Promotion) => {
    setForm({
      name: promo.name,
      description: promo.description || '',
      code: promo.code || '',
      promo_type: promo.promo_type,
      bonus_percent: promo.bonus_percent,
      bonus_flat: promo.bonus_flat,
      multiplier: promo.multiplier,
      starts_at: promo.starts_at?.slice(0, 16) || '',
      ends_at: promo.ends_at?.slice(0, 16) || '',
      daily_start_time: promo.daily_start_time || '',
      daily_end_time: promo.daily_end_time || '',
      active_days: promo.active_days ? promo.active_days.split(',').map(Number) : [],
      channel: promo.channel,
      category_ids: promo.category_ids || [],
      tier_restriction: promo.tier_restriction || [],
      min_items: promo.min_items,
      min_value: promo.min_value,
      stackable: promo.stackable,
      priority: promo.priority,
      max_uses: promo.max_uses || undefined,
      max_uses_per_member: promo.max_uses_per_member || undefined,
      active: promo.active,
    })
    setEditingPromo(promo)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...form,
        active_days: form.active_days.length > 0 ? form.active_days.join(',') : null,
        category_ids: form.category_ids.length > 0 ? form.category_ids : null,
        tier_restriction: form.tier_restriction.length > 0 ? form.tier_restriction : null,
        max_uses: form.max_uses || null,
        max_uses_per_member: form.max_uses_per_member || null,
      }

      if (editingPromo) {
        await updatePromotion(editingPromo.id, data)
      } else {
        await createPromotion(data)
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      setError('Failed to save promotion')
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this promotion?')) return
    try {
      await deletePromotion(id)
      loadData()
    } catch (err) {
      setError('Failed to delete promotion')
      console.error(err)
    }
  }

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      active_days: f.active_days.includes(day)
        ? f.active_days.filter(d => d !== day)
        : [...f.active_days, day].sort()
    }))
  }

  const toggleTier = (tier: string) => {
    setForm(f => ({
      ...f,
      tier_restriction: f.tier_restriction.includes(tier)
        ? f.tier_restriction.filter(t => t !== tier)
        : [...f.tier_restriction, tier]
    }))
  }

  const toggleCategory = (id: number) => {
    setForm(f => ({
      ...f,
      category_ids: f.category_ids.includes(id)
        ? f.category_ids.filter(c => c !== id)
        : [...f.category_ids, id]
    }))
  }

  const formatDateRange = (promo: Promotion) => {
    const start = new Date(promo.starts_at).toLocaleDateString()
    const end = new Date(promo.ends_at).toLocaleDateString()
    return `${start} - ${end}`
  }

  const getStatusBadge = (promo: Promotion) => {
    if (!promo.active) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">Disabled</span>
    }
    if (promo.is_active_now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">Active Now</span>
    }
    const now = new Date()
    if (new Date(promo.starts_at) > now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">Scheduled</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400">Ended</span>
  }

  if (loading && promotions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotions</h1>
          <p className="text-gray-400 mt-1">Manage store credit events and bonuses</p>
        </div>
        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Promotion
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-slate-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Promotions
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Active Now
        </button>
      </div>

      {/* Promotions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map(promo => (
          <div
            key={promo.id}
            className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{promo.name}</h3>
                <p className="text-sm text-gray-400">{PROMO_TYPE_LABELS[promo.promo_type]}</p>
              </div>
              {getStatusBadge(promo)}
            </div>

            {promo.description && (
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{promo.description}</p>
            )}

            <div className="space-y-2 text-sm">
              {/* Value */}
              <div className="flex items-center gap-2 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                {promo.promo_type === 'flat_bonus' ? (
                  <span>${promo.bonus_flat} flat bonus</span>
                ) : promo.promo_type === 'multiplier' ? (
                  <span>{promo.multiplier}x multiplier</span>
                ) : (
                  <span>+{promo.bonus_percent}% bonus</span>
                )}
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDateRange(promo)}</span>
              </div>

              {/* Time Window */}
              {promo.daily_start_time && promo.daily_end_time && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{promo.daily_start_time} - {promo.daily_end_time}</span>
                </div>
              )}

              {/* Channel */}
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>{CHANNEL_LABELS[promo.channel]}</span>
              </div>

              {/* Usage */}
              {promo.max_uses && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>{promo.current_uses} / {promo.max_uses} uses</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
              <button
                onClick={() => openEditModal(promo)}
                className="flex-1 px-3 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(promo.id)}
                className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {promotions.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <p>No promotions found</p>
            <button onClick={openNewModal} className="mt-2 text-emerald-400 hover:text-emerald-300">
              Create your first promotion
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingPromo ? 'Edit Promotion' : 'New Promotion'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Holiday Weekend Bonus"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows={2}
                    placeholder="Get extra store credit during the holiday weekend!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Promo Code (optional)</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white uppercase"
                    placeholder="HOLIDAY2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Promotion Type *</label>
                  <select
                    value={form.promo_type}
                    onChange={e => setForm(f => ({ ...f, promo_type: e.target.value as PromotionType }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    {Object.entries(PROMO_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Value Section */}
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <h3 className="font-medium text-white mb-3">Bonus Value</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {form.promo_type !== 'multiplier' && form.promo_type !== 'flat_bonus' && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Bonus Percent (%)</label>
                      <input
                        type="number"
                        value={form.bonus_percent}
                        onChange={e => setForm(f => ({ ...f, bonus_percent: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        min="0"
                        max="100"
                        step="0.5"
                      />
                    </div>
                  )}
                  {form.promo_type === 'flat_bonus' && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Flat Bonus ($)</label>
                      <input
                        type="number"
                        value={form.bonus_flat}
                        onChange={e => setForm(f => ({ ...f, bonus_flat: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
                  {form.promo_type === 'multiplier' && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Multiplier (e.g. 2x)</label>
                      <input
                        type="number"
                        value={form.multiplier}
                        onChange={e => setForm(f => ({ ...f, multiplier: parseFloat(e.target.value) || 1 }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        min="1"
                        max="10"
                        step="0.1"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Date/Time Section */}
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <h3 className="font-medium text-white mb-3">Schedule</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Starts At *</label>
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Ends At *</label>
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-600">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Daily Time Window (optional)</h4>
                  <p className="text-xs text-gray-500 mb-2">Only active during these hours each day</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={form.daily_start_time}
                        onChange={e => setForm(f => ({ ...f, daily_start_time: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">End Time</label>
                      <input
                        type="time"
                        value={form.daily_end_time}
                        onChange={e => setForm(f => ({ ...f, daily_end_time: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-600">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Active Days (optional)</h4>
                  <p className="text-xs text-gray-500 mb-2">Only active on selected days (leave empty for all days)</p>
                  <div className="flex flex-wrap gap-2">
                    {DAY_NAMES.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          form.active_days.includes(i)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Restrictions Section */}
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <h3 className="font-medium text-white mb-3">Restrictions</h3>

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Channel</label>
                    <select
                      value={form.channel}
                      onChange={e => setForm(f => ({ ...f, channel: e.target.value as PromotionChannel }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Minimum Value ($)</label>
                    <input
                      type="number"
                      value={form.min_value}
                      onChange={e => setForm(f => ({ ...f, min_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Member Tiers (optional)</h4>
                  <p className="text-xs text-gray-500 mb-2">Leave empty for all tiers</p>
                  <div className="flex flex-wrap gap-2">
                    {['SILVER', 'GOLD', 'PLATINUM'].map(tier => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => toggleTier(tier)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          form.tier_restriction.includes(tier)
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {form.promo_type === 'trade_in_bonus' && categories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Categories (optional)</h4>
                    <p className="text-xs text-gray-500 mb-2">Leave empty for all categories</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            form.category_ids.includes(cat.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Limits Section */}
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <h3 className="font-medium text-white mb-3">Limits</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Max Total Uses</label>
                    <input
                      type="number"
                      value={form.max_uses || ''}
                      onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Max Per Member</label>
                    <input
                      type="number"
                      value={form.max_uses_per_member || ''}
                      onChange={e => setForm(f => ({ ...f, max_uses_per_member: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Priority</label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher = applied first</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.stackable}
                      onChange={e => setForm(f => ({ ...f, stackable: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-600"
                    />
                    <span className="text-sm text-gray-300">Stackable (can combine with other promos)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-600"
                    />
                    <span className="text-sm text-gray-300">Active</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  {editingPromo ? 'Save Changes' : 'Create Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
