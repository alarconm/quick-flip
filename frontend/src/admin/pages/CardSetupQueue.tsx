/**
 * Card Setup Queue Page Stub
 */
import { CreditCard } from 'lucide-react';

export default function CardSetupQueue() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Card Setup Queue</h1>

      <div className="glass-card p-8 text-center">
        <CreditCard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400">
          Card setup queue coming soon
        </p>
      </div>
    </div>
  );
}
