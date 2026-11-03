import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NativeWrapper } from "@/components/NativeWrapper";

export const metadata: Metadata = {
  title: "Sistema de Informes Técnicos",
  description: "Plataforma de gestión de informes técnicos, registro de materiales, control de sedes y supervisión operativa.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Informes Técnicos" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2E75B6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <body>
        {/* Inline script to prevent flash: reads theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('app_theme');
            if(t) document.documentElement.setAttribute('data-theme', t);
          })();
        `}} />
        {/* Offline banner */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            function u(){
              var el=document.getElementById('offline-banner');
              if(!el){el=document.createElement('div');el.id='offline-banner';
                el.className='offline-banner';el.style.display='none';
                el.textContent='⚠️ Sin conexión — Los cambios se guardarán localmente';
                document.body.prepend(el);}
              el.style.display=navigator.onLine?'none':'block';
            }
            window.addEventListener('online',u);window.addEventListener('offline',u);window.addEventListener('load',u);
          })();
        `}} />
        <NativeWrapper>
          {children}
        </NativeWrapper>
      </body>
    </html>
  );
}
