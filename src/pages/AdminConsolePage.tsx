import ConsoleGate from '../features/auth/ConsoleGate'
import AdminDashboard from '../features/\u006frganizer/AdminDashboard'
import { useT } from '../lib/i18n'

export default function AdminConsolePage() {
  const t = useT()
  return (
    <main className="ops-shell">
      <ConsoleGate label={t('admin.console')} allowedRoles={['admin', 'master']}>
        <AdminDashboard />
      </ConsoleGate>
    </main>
  )
}
