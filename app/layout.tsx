import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ModeBanner from "@/components/ModeBanner";

export const metadata: Metadata = {
  title: "ManaSimulator — AI Prediction Market Agent",
  description:
    "Autonomous AI trading agent for Manifold Markets prediction markets. Dry-run mode.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="fade-up min-w-0 flex-1 p-4 md:p-6">
              <div className="mb-4"><ModeBanner /></div>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
