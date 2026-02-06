import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { ProjectProvider } from "@/components/project-context";
import { ViewerModeProvider } from "@/contexts/ViewerModeContext";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EVOX - Mission Control",
  description: "Agent coordination dashboard",
};

/** AGT-152: Single unified dashboard — no sidebar, no header; root is full-width dashboard */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-base`}
      >
        <ConvexClientProvider>
          <ViewerModeProvider>
            <ProjectProvider>
              <div className="flex h-screen flex-col">
                {children}
              </div>
              <Toaster />
            </ProjectProvider>
          </ViewerModeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
