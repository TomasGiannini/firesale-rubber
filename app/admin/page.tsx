import type { Metadata } from 'next'
import AdminClient from '@/components/AdminClient'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Firesale Rubber admin dashboard — manage inventory and products.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminPage() {
  return <AdminClient />
}
