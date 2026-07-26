type Params = { token: string };

export default async function InvitationAcceptPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">招待の受諾</h1>
      <p className="mt-2 text-muted-foreground">token: {token}</p>
    </main>
  );
}
