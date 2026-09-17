import { PublicIdentityView } from '@/components/public-identity-view';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicIdentityView userId={id} />;
}
