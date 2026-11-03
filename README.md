# 📋 ReportHub — Sistema de Gestión y Seguimiento de Informes Técnicos

> **Plantilla White-Label de Arquitectura Completa**: Plataforma web y **PWA Offline-First** para el registro en campo, supervisión, validación y exportación masiva de informes técnicos de mantenimiento, instalaciones y obras.

Diseñada para adaptarse a cualquier empresa de servicios técnicos, telecomunicaciones, seguridad electrónica, climatización, energía o infraestructura.

---

## 🌟 Características Principales

### 👨‍🔧 1. Módulo Operativo de Cuadrillas (Técnicos)
- **Modo Offline-First Real**: Las cuadrillas pueden registrar trabajos e insumos utilizados en sótanos, zonas rurales o lugares sin conectividad. Los datos se almacenan localmente y se sincronizan automáticamente con la nube al recuperar conexión.
- **Formularios Ágiles Estructurados**: Clasificación por categorías de servicio, ambientes/ubicaciones, selección de equipos revisados y materiales consumidos con autocompletado predictivo.
- **Solicitud de Materiales In Situ**: Envío de solicitudes de reposición en tiempo real directamente a los supervisores.
- **Soporte PWA y Móvil**: Optimizado para dispositivos táctiles, con retroalimentación háptica y navegación fluida.

### 📊 2. Módulo de Supervisión y Control de Calidad
- **Dashboard Ejecutivo**: Métricas en tiempo real sobre el estado de cada sede o servicio (*Pendiente, En Proceso, En Espera, Finalizado, Aprobado*).
- **Bandeja de Informes con Filtros**: Búsqueda instantánea por técnico, supervisor, fecha o sede.
- **Descarga Masiva de Informes en ZIP**: Motor en cliente que compila cientos de hojas de cálculo Excel (`.xlsx`) con formato corporativo y tablas dinámicas de resumen en un único archivo comprimido `.zip` con barra de progreso interactiva.
- **Auditoría y Flujo de Aprobación**: Validación de trabajos, registro de observaciones y control de cambios.

### ⚙️ 3. Módulo de Administración y Catálogos
- **Gestión de Usuarios con Roles (RBAC)**: Roles de *Técnico*, *Supervisor* y *Administrador*.
- **Control de Acceso**: Desactivación inmediata de cuentas y envío de enlaces de restablecimiento de contraseña.
- **Catálogos Centralizados**: Administración de materiales, unidades de medida y catálogo de dispositivos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Backend & Base de Datos** | [Firebase](https://firebase.google.com/) (Firestore con caché offline multi-tab, Firebase Authentication) |
| **Reportes y Archivos** | [ExcelJS](https://github.com/exceljs/exceljs) (generación de hojas de cálculo formateadas), [JSZip](https://stuk.github.io/jszip/) (empaquetado ZIP en navegador), [jsPDF](https://github.com/parallax/jsPDF) |
| **Mobile & PWA** | Next-PWA, [@capacitor/device](https://capacitorjs.com/), Capacitor Haptics & Filesystem |
| **Estilos** | CSS Moderno nativo, variables de diseño tokens, soporte completo Dark/Light mode |

---

## 🚀 Guía de Inicio Rápido

### 1. Clonar o Descargar el Proyecto
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd informes-web-template
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo de plantilla `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

Abre `.env.local` y coloca las credenciales de tu propio proyecto de Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 4. Sembrar Datos de Demostración (Opcional)
Para cargar catálogos iniciales de materiales, equipos y sedes de ejemplo en tu base de datos Firestore:
```bash
npm run seed
```

### 5. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 🏢 Cómo Adaptar la Plantilla a Tu Empresa

### 1. Personalizar Branding y Nombre
- **Nombre y Título**: Modifica el nombre en `src/app/layout.tsx` y `public/manifest.json`.
- **Logotipo e Iconos**: Puedes colocar tus iconos en `public/icon-192.png` y `public/icon-512.png`. En `src/app/page.tsx` puedes personalizar el encabezado del login.
- **Paleta de Colores**: Ajusta las variables CSS en `src/app/globals.css`:
  ```css
  :root {
    --color-primary: #2E75B6;      /* Color corporativo principal */
    --color-primary-dark: #1F4E78; /* Variación oscura */
    --color-accent: #F0A500;       /* Color de acento/botones */
  }
  ```

### 2. Personalizar Categorías de Servicio
Si tu empresa no realiza "Correctivo / Instalaciones / Recableados", edita las categorías en `src/lib/config.ts`:
```typescript
export const CATEGORIAS = ["Mantenimiento Preventivo", "Reparación", "Auditoría"] as const;
```
La interfaz, los formularios y los reportes en Excel/PDF se adaptarán automáticamente a las nuevas categorías.

### 3. Crear el Primer Usuario Administrador
1. En tu consola de Firebase (`Authentication > Users`), crea un usuario con su correo y contraseña.
2. En `Firestore Database`, crea una colección `usuarios` y un documento cuyo ID sea el **UID** del usuario creado, con los siguientes campos:
   ```json
   {
     "email": "admin@tuempresa.com",
     "nombre": "Administrador Principal",
     "rol": "admin",
     "activo": true
   }
   ```
3. Inicia sesión en la plataforma. Desde el panel de administración (`/admin`) podrás registrar supervisores y técnicos directamente.

---

## 🔒 Reglas de Seguridad Recomendadas para Firestore

En la consola de Firebase (`Firestore > Reglas`), se recomienda la siguiente política base:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden operar
    function estaAutenticado() {
      return request.auth != null;
    }

    match /usuarios/{userId} {
      allow read: if estaAutenticado();
      allow write: if estaAutenticado();
    }

    match /informes/{informeId} {
      allow read, write: if estaAutenticado();
    }

    match /solicitudes/{solicitudId} {
      allow read, write: if estaAutenticado();
    }

    match /materiales/{matId} {
      allow read: if estaAutenticado();
      allow write: if estaAutenticado();
    }

    match /dispositivos/{dispId} {
      allow read: if estaAutenticado();
      allow write: if estaAutenticado();
    }

    match /agencias/{agenciaId} {
      allow read: if estaAutenticado();
      allow write: if estaAutenticado();
    }
  }
}
```

---

## 📦 Compilación y Despliegue para Producción

La plataforma genera una salida estática (`output: export`) compatible con cualquier servidor web o CDN:

```bash
# Compilar proyecto estático (se genera en la carpeta /out)
npm run build

# Desplegar en Firebase Hosting (requiere firebase-tools)
npx firebase-tools deploy --only hosting
```

---

## 📄 Licencia
Este proyecto es una plantilla de código abierto pensada para acelerar el desarrollo de soluciones de gestión operativa y técnica.

