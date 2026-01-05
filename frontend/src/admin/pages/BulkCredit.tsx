import { useState, useEffect } from 'react'
import {
  createBulkCreditOperation,
  previewBulkCredit,
  executeBulkCredit,
  getBulkCreditOperations,
  type BulkCreditOperation
} from '../api'

export default function BulkCredit() {
  const [operations, setOperations] = useState<BulkCreditOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [previewData, setPreviewData] = useState<{
    operation: BulkCreditOperation
    member_count: number
    total_amount: number
    members: Array<{ id: number; email: string; tier: string }>
  } | null>(null)
  const [executing, setExecuting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    amount_per_member: 5,
    tier_filter: '',
  })

  useEffect(() => {
    loadOperations()
  }, [])

  const loadOperations = async () => {
    try {
      setLoading(true)
      const data = await getBulkCreditOperations()
      setOperations(data.operations)
    } catch (err) {
      setError('Failed to load operations')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAndPreview = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      // Create the operation
      const operation = await createBulkCreditOperation({
        ...form,
        tier_filter: form.tier_filter || undefined,
        created_by: 'admin',
      })

      // Get preview
      const preview = await previewBulkCredit(operation.id)
      setPreviewData({
        operation,
        ...preview,
      })
      setShowModal(false)
    } catch (err) {
      setError('Failed to create operation')
      console.error(err)
    }
  }

  const handleExecute = async () => {
    if (!previewData) return
    try {
      setExecuting(true)
      await executeBulkCredit(previewData.operation.id)
      setPreviewData(null)
      loadOperations()
    } catch (err) {
      setError('Failed to execute bulk credit')
      console.error(err)
    } finally {
      setExecuting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-500/20 text-amber-400',
      processing: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      failed: 'bg-red-500/20 text-red-400',
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading && operations.length === 0) {
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
          <h1 className="text-2xl font-bold text-white">Bulk Credit Operations</h1>
          <p className="text-gray-400 mt-1">Issue store credit to multiple members at once</p>
        </div>
        <button
          onClick={() => {
            setForm({ name: '', description: '', amount_per_member: 5, tier_filter: '' })
            setShowModal(true)
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Bulk Credit
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Preview Panel */}
      {previewData && (
        <div className="bg-slate-800 rounded-xl border border-emerald-500/50 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ready to Execute: {previewData.operation.name}
            </h2>
            <p className="text-gray-400 mt-1">{previewData.operation.description}</p>
          </div>

          <div className="p-6 grid gap-6 md:grid-cols-3">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-white">{previewData.member_count}</div>
              <div className="text-sm text-gray-400 mt-1">Members</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">
                ${previewData.operation.amount_per_member.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400 mt-1">Per Member</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">
                ${previewData.total_amount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400 mt-1">Total Credit</div>
            </div>
          </div>

          {previewData.members.length > 0 && (
            <div className="px-6 pb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Sample Recipients ({previewData.members.length} of {previewData.member_count})
              </h4>
              <div className="flex flex-wrap gap-2">
                {previewData.members.map(m => (
                  <span key={m.id} className="px-2 py-1 bg-slate-700 rounded text-sm text-gray-300">
                    {m.email} ({m.tier})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
            <button
              onClick={() => setPreviewData(null)}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={executing}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              {executing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Executing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Execute Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Operations History */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Operation History</h2>
        </div>

        <div className="divide-y divide-slate-700">
          {operations.map(op => (
            <div key={op.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-white">{op.name}</h3>
                  {getStatusBadge(op.status)}
                  {op.tier_filter && (
                    <span className="px-2 py-0.5 text-xs rounded bg-slate-700 text-gray-400">
                      {op.tier_filter.split(',').join(', ')}
                    </span>
                  )}
                </div>
                {op.description && (
                  <p className="text-sm text-gray-400 mt-0.5">{op.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{new Date(op.created_at).toLocaleDateString()}</span>
                  <span>by {op.created_by}</span>
                </div>
              </div>

              <div className="text-right">
                {op.status === 'completed' ? (
                  <>
                    <div className="text-emerald-400 font-semibold">
                      ${op.total_amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {op.member_count} members @ ${op.amount_per_member}/ea
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400">
                    ${op.amount_per_member}/member
                  </div>
                )}
              </div>
            </div>
          ))}

          {operations.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No bulk credit operations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">New Bulk Credit</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateAndPreview} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Operation Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Holiday Thank You Bonus"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  rows={2}
                  placeholder="Thank you for being a loyal member!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount Per Member ($) *</label>
                <input
                  type="number"
                  value={form.amount_per_member}
                  onChange={e => setForm(f => ({ ...f, amount_per_member: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Filter by Tier (optional)</label>
                <select
                  value={form.tier_filter}
                  onChange={e => setForm(f => ({ ...f, tier_filter: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">All Active Members</option>
                  <option value="SILVER">Silver Only</option>
                  <option value="GOLD">Gold Only</option>
                  <option value="PLATINUM">Platinum Only</option>
                  <option value="GOLD,PLATINUM">Gold & Platinum</option>
                </select>
              </div>

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
                  Preview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
