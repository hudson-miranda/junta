import { OfferDetails } from '@junta/ui';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <OfferDetails id={(await params).id} />;
}
