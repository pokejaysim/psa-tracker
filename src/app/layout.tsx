import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PSA Tracker",
  description: "Track your PSA card grading submissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-background">
        <TooltipProvider>
          <Sidebar />
          <main className="flex-1 min-h-screen">
            <div className="p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">{children}</div>
          </main>
          <Toaster richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
