import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Watermark Dokumen — DISPUSIP",
  description:
    "Cap watermark di setiap halaman, konversi ke TIFF 300 DPI, kemas dalam satu ZIP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
