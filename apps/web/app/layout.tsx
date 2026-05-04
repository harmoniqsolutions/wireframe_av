import type { Metadata } from "next";
import Link from "next/link";
import { CircuitBoard, FolderKanban } from "lucide-react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "WireframeAV",
  description: "Structured AV engineering documentation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen">
            <header className="border-b border-neutral-200 bg-white">
              <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                  <CircuitBoard className="h-5 w-5" />
                  WireframeAV
                </Link>
                <nav className="flex items-center gap-1 text-sm">
                  <Link className="rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100" href="/">
                    <FolderKanban className="mr-2 inline h-4 w-4" />
                    Projects
                  </Link>
                  <Link className="rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100" href="/library/products">
                    Product Library
                  </Link>
                </nav>
              </div>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
