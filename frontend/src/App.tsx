import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './admin/components/Layout'
import Dashboard from './admin/pages/Dashboard'
import Members from './admin/pages/Members'
import MemberDetail from './admin/pages/MemberDetail'
import NewMember from './admin/pages/NewMember'
import CardSetupQueue from './admin/pages/CardSetupQueue'
import Settings from './admin/pages/Settings'
import TradeIns from './admin/pages/TradeIns'
import TradeInDetail from './admin/pages/TradeInDetail'
import TradeInCategories from './admin/pages/TradeInCategories'
import Promotions from './admin/pages/Promotions'
import BulkCredit from './admin/pages/BulkCredit'

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Layout />}>
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Membership */}
        <Route path="members" element={<Members />} />
        <Route path="members/new" element={<NewMember />} />
        <Route path="members/:id" element={<MemberDetail />} />
        <Route path="card-setup" element={<CardSetupQueue />} />

        {/* Trade-Ins */}
        <Route path="tradeins" element={<TradeIns />} />
        <Route path="tradeins/categories" element={<TradeInCategories />} />
        <Route path="tradeins/:id" element={<TradeInDetail />} />

        {/* Promotions & Store Credit */}
        <Route path="promotions" element={<Promotions />} />
        <Route path="bulk-credit" element={<BulkCredit />} />

        {/* Settings */}
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default App
