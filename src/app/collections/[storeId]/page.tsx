import { redirect } from 'next/navigation';

export default function LegacyCollectionPage({ params }: { params: { storeId: string } }) {
  redirect(`/collections/boardgamebliss/${params.storeId}`);
}
