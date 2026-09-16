import { KineticGridBackground } from "@/components/background";
import { HomeNavbar, HomeWorkspace } from "@/features/home";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden">
      {/* Background layer (unmodified, non-blocking) */}
      <KineticGridBackground />

      {/* Foreground Workspace Layer */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <HomeNavbar />
        <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
          <HomeWorkspace />
        </main>
      </div>
    </div>
  );
}
