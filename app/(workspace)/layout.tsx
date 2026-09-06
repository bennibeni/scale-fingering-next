import SideNav from '@/components/navigation/SideNav';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex md:h-screen md:overflow-hidden">
      <aside className="w-full flex-none md:w-72"><SideNav /></aside>
      <main className="min-w-0 grow px-3 py-6 md:overflow-y-auto md:px-6 md:py-10 xl:px-8">{children}</main>
    </div>
  );
}
