import { MomentView } from '@/components/moment-view';

export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MomentView momentId={id} />;
}
