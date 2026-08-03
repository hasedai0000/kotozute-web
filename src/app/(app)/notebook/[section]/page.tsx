type Params = { section: string };

export default async function NotebookSectionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { section } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold">セクション：{section}</h1>
    </div>
  );
}
