/**
 * Member Detail Page Stub
 */
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';

export default function MemberDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/members"
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Member Details</h1>
      </div>

      <div className="glass-card p-8 text-center">
        <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400">
          Member #{id} details coming soon
        </p>
      </div>
    </div>
  );
}
