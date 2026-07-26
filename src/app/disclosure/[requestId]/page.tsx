type Params = { requestId: string };

export default async function DisclosureRevokePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { requestId } = await params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">死後開示の撤回</h1>
      <p className="mt-2 text-muted-foreground">
        requestId: {requestId}（v1 で実装予定）
      </p>
    </main>
  );
}
