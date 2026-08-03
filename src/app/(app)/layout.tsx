import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1 py-6">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
