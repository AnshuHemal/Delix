import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Delix — Work smarter. Together.",
    template: "%s — Delix",
  },
  description:
    "Delix brings your team together with HD video meetings, real-time chat, file sharing, and smart scheduling — all in one beautiful workspace.",
  keywords: ["team collaboration", "video meetings", "chat", "workspace"],
  openGraph: {
    title: "Delix — Work smarter. Together.",
    description: "The modern workspace for high-performing teams.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
