import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Inforens FIFA Predictor 2026 | Predict. Win. Celebrate.",
  description: "Predict FIFA World Cup matches, earn points, climb the leaderboard and stand a chance to win cash prizes and exclusive Inforens rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
