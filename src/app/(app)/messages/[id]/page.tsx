import { EditMessagePage } from "@/features/messages/components/EditMessagePage";

type Params = { id: string };

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  return <EditMessagePage id={id} />;
}
