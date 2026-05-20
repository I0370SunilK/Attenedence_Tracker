import { ReactNode } from "react";
import TopNav from "./TopNav";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gradient-soft w-full overflow-x-hidden">
      <div className="w-full overflow-x-hidden">
        <TopNav />
      </div>
      <main className="w-full overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 xl:px-8 py-8 pb-20 md:pb-8 min-w-0">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
