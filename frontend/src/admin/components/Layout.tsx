import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  Settings,
  Zap,
  ArrowRightLeft,
  Layers,
  Sparkles,
  Gift,
} from 'lucide-react'

const membershipNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/members', icon: Users, label: 'Members' },
  { to: '/admin/members/new', icon: UserPlus, label: 'New Member' },
  { to: '/admin/card-setup', icon: CreditCard, label: 'Card Setup Queue' },
]

const tradeUpNav = [
  { to: '/admin/tradeins', icon: ArrowRightLeft, label: 'Trade-Ins' },
  { to: '/admin/tradeins/categories', icon: Layers, label: 'Categories' },
]

const promotionsNav = [
  { to: '/admin/promotions', icon: Sparkles, label: 'Promotions' },
  { to: '/admin/bulk-credit', icon: Gift, label: 'Bulk Credit' },
]

const settingsNav = [
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6">
          {/* Logo */}
          <Link to="/admin" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg glow-sm">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">TradeUp</h1>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="space-y-6">
            {/* Membership Section */}
            <div>
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Membership
              </p>
              <div className="space-y-1">
                {membershipNav.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Trade-Ins Section */}
            <div>
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Trade-Ins
              </p>
              <div className="space-y-1">
                {tradeUpNav.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Promotions & Credit Section */}
            <div>
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Store Credit
              </p>
              <div className="space-y-1">
                {promotionsNav.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <div className="space-y-1">
                {settingsNav.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-slate-800">
          <div className="text-xs text-slate-500">
            <p>ORB Sports Cards</p>
            <p className="text-primary-500">orbsportscards.com</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
