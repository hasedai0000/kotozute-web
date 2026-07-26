type Params = { section: string };

export default async function NotebookSectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section } = await params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">セクション：{section}</h1>
    </main>
  );
}
