import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/admin-panel';

export const metadata: Metadata = {
  title: 'Jamino — Admin Panel',
  description: 'Full visibility and moderation over your community.',
};

export default function AdminPage() {
  return <AdminPanel />;
}