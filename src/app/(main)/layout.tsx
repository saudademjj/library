import AppHeader from "@/components/AppHeader";
import MainAuthGuard from "@/components/MainAuthGuard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainAuthGuard>
      <AppHeader />
      {children}
    </MainAuthGuard>
  );
}
