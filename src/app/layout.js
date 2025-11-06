import { Inter } from 'next/font/google'
import "./globals.css";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/context/AuthProvider";
import DarkVeil from "@/components/backgrounds/DarkVeil";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = {
  title: "Xen-AI ",
  description: "New generated code editor with AI-powered suggestions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen relative">
        {/* Site-wide animated background */}
        <div className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none">
          <div className="absolute inset-0">
            <DarkVeil speed={3} />
          </div>
        </div>
        <AuthProvider>
          <Provider>
            {/* Header and Footer will be rendered in the Home component instead */}
            <main className="relative z-10">{children}</main>
          </Provider>
        </AuthProvider>
      </body>
    </html>
  )
}
