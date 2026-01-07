/**
 * New Trade-In Page - Create new trade-in batch
 * Features: Member search, category selection, item entry
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
  Package,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import {
  getMembers,
  createTradeInBatch,
  addTradeInItems,
  getTradeInCategories,
  type Member,
  type TradeInCategory,
} from '../api/adminApi'
import { useTheme } from '../../contexts/ThemeContext'
import { radius, typography, spacing, useResponsive } from '../styles/tokens'
import { debounce } from '../utils/debounce'

// Category icons map
const CATEGORY_ICONS: Record<string, string> = {
  sports: '🏈',
  pokemon: '⚡',
  magic: '🔮',
  riftbound: '🌀',
  tcg_other: '🎴',
  other: '📦',
}

interface TradeInItem {
  id: string
  product_title: string
  trade_value: string
  market_value: string
  notes: string
}

export default function NewTradeIn() {
  const navigate = useNavigate()
  const { colors, shadows } = useTheme()
  const breakpoint = useResponsive()
  const searchDropdownRef = useRef<HTMLDivElement>(null)

  // State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [memberConfirmed, setMemberConfirmed] = useState(false)

  // Category state
  const [categories, setCategories] = useState<TradeInCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('other')

  // Items state
  const [items, setItems] = useState<TradeInItem[]>([
    { id: '1', product_title: '', trade_value: '', market_value: '', notes: '' },
  ])

  // Notes
  const [batchNotes, setBatchNotes] = useState('')

  // Form state
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Fetch categories on mount
  useEffect(() => {
    getTradeInCategories()
      .then((res) => {
        setCategories(res.categories)
      })
      .catch(console.error)
  }, [])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced member search
  const searchMembersDebounced = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([])
        setShowSearchDropdown(false)
        return
      }

      setSearchLoading(true)

      try {
        const result = await getMembers({ search: query, limit: 10 })
        setSearchResults(result.members)
        setShowSearchDropdown(true)
      } catch (err) {
        console.error('Search failed:', err)
        setSearchResults([])
        setShowSearchDropdown(true)
      } finally {
        setSearchLoading(false)
      }
    }, 300),
    []
  )

  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setMemberConfirmed(false)
    setSelectedMember(null)
    searchMembersDebounced(value)
  }

  // Select member from search
  const selectMember = (member: Member) => {
    setSelectedMember(member)
    setSearchQuery(member.member_number)
    setMemberConfirmed(true)
    setShowSearchDropdown(false)
  }

  // Clear selected member
  const clearMember = () => {
    setSelectedMember(null)
    setMemberConfirmed(false)
    setSearchQuery('')
  }

  // Add new item row
  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), product_title: '', trade_value: '', market_value: '', notes: '' },
    ])
  }

  // Remove item row
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  // Update item field
  const updateItem = (id: string, field: keyof TradeInItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  // Calculate totals
  const totalTradeValue = items.reduce((sum, item) => {
    const val = parseFloat(item.trade_value) || 0
    return sum + val
  }, 0)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedMember) {
      setError('Please select a member')
      return
    }

    const validItems = items.filter((item) => item.trade_value && parseFloat(item.trade_value) > 0)
    if (validItems.length === 0) {
      setError('Please add at least one item with a trade value')
      return
    }

    setCreating(true)

    try {
      // Create the batch
      const batch = await createTradeInBatch({
        member_id: selectedMember.id,
        category: selectedCategory,
        notes: batchNotes || undefined,
      })

      // Add items to the batch
      await addTradeInItems(
        batch.id,
        validItems.map((item) => ({
          product_title: item.product_title || undefined,
          trade_value: parseFloat(item.trade_value),
          market_value: item.market_value ? parseFloat(item.market_value) : undefined,
          notes: item.notes || undefined,
        }))
      )

      navigate(`/admin/tradeins/${batch.id}?created=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade-in')
    } finally {
      setCreating(false)
    }
  }

  // Styles
  const containerStyle: React.CSSProperties = {
    maxWidth: '56rem',
    margin: '0 auto',
  }

  const headerStyle: React.CSSProperties = {
    marginBottom: spacing[6],
  }

  const backButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: colors.textSecondary,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginBottom: spacing[4],
    padding: 0,
    fontSize: typography.base,
    fontWeight: typography.medium,
    transition: 'color 150ms ease',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.text,
    margin: 0,
  }

  const subtitleStyle: React.CSSProperties = {
    color: colors.textSecondary,
    marginTop: spacing[1],
    fontSize: typography.base,
  }

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[5],
  }

  const cardStyle: React.CSSProperties = {
    padding: spacing[5],
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.card,
  }

  const stepHeaderStyle: React.CSSProperties = {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing[4],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  }

  const stepBadgeStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: colors.primarySubtle,
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  }

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
  }

  const inputIconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.textSubdued,
    pointerEvents: 'none',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px 10px 40px',
    backgroundColor: colors.bgSurface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: typography.base,
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  }

  const smallInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: colors.bgSurface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: typography.base,
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  }

  const categoryGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: breakpoint === 'mobile' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
    gap: spacing[3],
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
    marginBottom: spacing[2],
  }

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: breakpoint === 'mobile' ? 'column' : 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  }

  const primaryButtonStyle: React.CSSProperties = {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: '12px 20px',
    backgroundColor: colors.primary,
    color: colors.textOnPrimary,
    border: 'none',
    borderRadius: radius.md,
    fontSize: typography.base,
    fontWeight: typography.medium,
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  }

  const secondaryButtonStyle: React.CSSProperties = {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: '12px 20px',
    backgroundColor: colors.bgSurface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: typography.base,
    fontWeight: typography.medium,
    cursor: 'pointer',
    transition: 'background-color 150ms ease, border-color 150ms ease',
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing[1],
    backgroundColor: colors.bgSurface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    boxShadow: shadows.lg,
    zIndex: 50,
    maxHeight: 300,
    overflowY: 'auto',
  }

  const dropdownItemStyle: React.CSSProperties = {
    padding: spacing[3],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.borderSubdued}`,
    transition: 'background-color 150ms ease',
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <button
          onClick={() => navigate('/admin/tradeins')}
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSecondary)}
        >
          <ArrowLeft size={18} />
          Back to Trade-Ins
        </button>
        <h1 style={titleStyle}>New Trade-In</h1>
        <p style={subtitleStyle}>Create a new trade-in batch for a member</p>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        {/* Step 1: Select Member */}
        <div style={cardStyle}>
          <h2 style={stepHeaderStyle}>
            <span style={stepBadgeStyle}>1</span>
            Select Member
          </h2>

          <div style={inputWrapperStyle} ref={searchDropdownRef}>
            <span style={inputIconStyle}>
              {searchLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
            </span>
            <input
              type="text"
              placeholder="Search by member number, name, or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              disabled={memberConfirmed}
              style={{
                ...inputStyle,
                paddingRight: memberConfirmed ? 40 : 12,
                backgroundColor: memberConfirmed ? colors.bgSubdued : colors.bgSurface,
              }}
              autoFocus
              onFocus={(e) => {
                if (!memberConfirmed) {
                  e.target.style.borderColor = colors.primary
                  e.target.style.boxShadow = shadows.focus
                  if (searchResults.length > 0 || searchQuery.length >= 2) {
                    setShowSearchDropdown(true)
                  }
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border
                e.target.style.boxShadow = 'none'
              }}
            />
            {memberConfirmed && (
              <button
                type="button"
                onClick={clearMember}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.textSubdued,
                  padding: 0,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            )}

            {/* Search Dropdown */}
            {showSearchDropdown && !memberConfirmed && (
              <div style={dropdownStyle}>
                {searchLoading ? (
                  <div style={{ padding: spacing[4], textAlign: 'center', color: colors.textSecondary }}>
                    <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto', marginBottom: spacing[2] }} />
                    <p style={{ margin: 0, fontSize: typography.sm }}>Searching members...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => selectMember(member)}
                      style={dropdownItemStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.bgSurfaceHover
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: colors.primarySubtle,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <User size={16} style={{ color: colors.primary }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: typography.medium, color: colors.text, margin: 0, fontSize: typography.base }}>
                          {member.name || member.email}
                        </p>
                        <p style={{ color: colors.textSecondary, fontSize: typography.sm, margin: 0 }}>
                          {member.member_number} · {member.tier?.name || 'No tier'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <div style={{ padding: spacing[4], textAlign: 'center', color: colors.textSecondary }}>
                    <p style={{ margin: 0, fontSize: typography.sm }}>No members found</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Selected Member Card */}
          {memberConfirmed && selectedMember && (
            <div
              style={{
                marginTop: spacing[4],
                padding: spacing[4],
                borderRadius: radius.md,
                border: `1px solid rgba(0, 128, 96, 0.3)`,
                backgroundColor: colors.successLight,
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing[3],
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(0, 128, 96, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: colors.success,
                }}
              >
                <Check size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: typography.semibold, color: colors.success, margin: 0, fontSize: typography.base }}>
                  Member Selected
                </p>
                <p style={{ color: colors.text, marginTop: 2, fontSize: typography.base }}>
                  {selectedMember.name || selectedMember.email}
                </p>
                <p style={{ color: colors.textSecondary, marginTop: 2, fontSize: typography.sm }}>
                  {selectedMember.member_number} · {selectedMember.tier?.name || 'No tier'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Category */}
        <div style={cardStyle}>
          <h2 style={stepHeaderStyle}>
            <span style={stepBadgeStyle}>2</span>
            Category
          </h2>

          <div style={categoryGridStyle}>
            {(categories.length > 0 ? categories : [
              { id: 'sports', name: 'Sports', icon: '🏈' },
              { id: 'pokemon', name: 'Pokemon', icon: '⚡' },
              { id: 'magic', name: 'Magic', icon: '🔮' },
              { id: 'riftbound', name: 'Riftbound', icon: '🌀' },
              { id: 'tcg_other', name: 'TCG Other', icon: '🎴' },
              { id: 'other', name: 'Other', icon: '📦' },
            ]).map((cat) => {
              const isSelected = selectedCategory === (cat.id || cat.name?.toLowerCase())
              const catId = cat.id || cat.name?.toLowerCase() || 'other'
              const catIcon = cat.icon || CATEGORY_ICONS[catId] || '📦'

              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => setSelectedCategory(catId)}
                  style={{
                    padding: spacing[4],
                    borderRadius: radius.md,
                    border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                    background: isSelected ? colors.primarySubtle : colors.bgSurface,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = colors.primary
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = colors.border
                    }
                  }}
                >
                  <span style={{ fontSize: 24, display: 'block', marginBottom: spacing[2] }}>{catIcon}</span>
                  <span style={{ fontSize: typography.sm, fontWeight: typography.medium, color: colors.text }}>
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 3: Add Items */}
        <div style={cardStyle}>
          <h2 style={stepHeaderStyle}>
            <span style={stepBadgeStyle}>3</span>
            Items
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: spacing[4],
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bgSubdued,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing[3],
                  }}
                >
                  <span style={{ fontSize: typography.sm, fontWeight: typography.medium, color: colors.textSecondary }}>
                    Item {index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: colors.critical,
                        padding: 4,
                        display: 'flex',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: breakpoint === 'mobile' ? '1fr' : '2fr 1fr 1fr',
                    gap: spacing[3],
                  }}
                >
                  <div>
                    <label style={labelStyle}>Product Title</label>
                    <input
                      type="text"
                      placeholder="Card name, set, etc."
                      value={item.product_title}
                      onChange={(e) => updateItem(item.id, 'product_title', e.target.value)}
                      style={smallInputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = colors.primary
                        e.target.style.boxShadow = shadows.focus
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.border
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Trade Value *</label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: colors.textSubdued,
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={item.trade_value}
                        onChange={(e) => updateItem(item.id, 'trade_value', e.target.value)}
                        style={{ ...smallInputStyle, paddingLeft: 28 }}
                        onFocus={(e) => {
                          e.target.style.borderColor = colors.primary
                          e.target.style.boxShadow = shadows.focus
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = colors.border
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Market Value</label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: colors.textSubdued,
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={item.market_value}
                        onChange={(e) => updateItem(item.id, 'market_value', e.target.value)}
                        style={{ ...smallInputStyle, paddingLeft: 28 }}
                        onFocus={(e) => {
                          e.target.style.borderColor = colors.primary
                          e.target.style.boxShadow = shadows.focus
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = colors.border
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Item Button */}
            <button
              type="button"
              onClick={addItem}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing[2],
                padding: spacing[3],
                borderRadius: radius.md,
                border: `1px dashed ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.primary
                e.currentTarget.style.color = colors.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border
                e.currentTarget.style.color = colors.textSecondary
              }}
            >
              <Plus size={18} />
              Add Another Item
            </button>

            {/* Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing[4],
                borderRadius: radius.md,
                backgroundColor: colors.primarySubtle,
                border: `1px solid ${colors.primary}`,
              }}
            >
              <span style={{ fontSize: typography.base, fontWeight: typography.medium, color: colors.text }}>
                Total Trade Value
              </span>
              <span style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.primary }}>
                ${totalTradeValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Step 4: Notes */}
        <div style={cardStyle}>
          <h2 style={stepHeaderStyle}>
            <span style={stepBadgeStyle}>4</span>
            Notes (Optional)
          </h2>

          <textarea
            placeholder="Add any notes about this trade-in..."
            value={batchNotes}
            onChange={(e) => setBatchNotes(e.target.value)}
            rows={3}
            style={{
              ...smallInputStyle,
              resize: 'vertical',
              minHeight: 80,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary
              e.target.style.boxShadow = shadows.focus
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[3],
              padding: spacing[4],
              borderRadius: radius.md,
              background: colors.criticalLight,
              border: `1px solid rgba(215, 44, 13, 0.3)`,
              color: colors.critical,
              fontSize: typography.base,
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={() => navigate('/admin/tradeins')}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.bgSurfaceHover
              e.currentTarget.style.borderColor = colors.borderHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.bgSurface
              e.currentTarget.style.borderColor = colors.border
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || !selectedMember || totalTradeValue <= 0}
            style={{
              ...primaryButtonStyle,
              opacity: creating || !selectedMember || totalTradeValue <= 0 ? 0.5 : 1,
              cursor: creating || !selectedMember || totalTradeValue <= 0 ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!creating && selectedMember && totalTradeValue > 0) {
                e.currentTarget.style.backgroundColor = colors.primaryHover
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary
            }}
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Package size={18} />
                Create Trade-In · ${totalTradeValue.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
