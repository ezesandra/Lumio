import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import { SidebarOffset } from "@/components/layout/SidebarOffset";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Lumio - AI Study Companion",
  description: "Your AI-powered study companion. Upload materials and transform them into summaries, flashcards, and quizzes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${bricolage.variable}`}>
        <AuthProvider>
          <Navbar />
          <SidebarOffset>
            {children}
          </SidebarOffset>
        </AuthProvider>
        <script src="https://checkout.flutterwave.com/v3.js" async></script>
      </body>
    </html>
  );
}
