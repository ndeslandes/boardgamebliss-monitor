import { redirect } from 'next/navigation';

export default function LegacyCollectionPage({ params }: { params: { handle: string } }) {
  redirect(`/collections/boardgamebliss/${params.handle}`);
}
