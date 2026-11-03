# ReportHub — Sistema de Gestión y Seguimiento de Informes Técnicos

Plataforma web y Progressive Web Application (PWA) de arquitectura desacoplada para el registro en campo, supervisión operativa, auditoría y exportación masiva de informes técnicos de mantenimiento e instalaciones.

Diseñada con enfoque offline-first, permite a las cuadrillas técnicas registrar intervenciones, materiales consumidos y solicitudes de reposición en entornos sin conectividad, sincronizando los datos de manera transparente una vez restablecido el acceso a la red.

---

## Módulos y Capacidades

### 1. Módulo Operativo de Campo (Técnicos)
* **Arquitectura Offline-First:** Almacenamiento local con cola de sincronización diferida automática al detectar reconexión de red (`window.ononline`).
* **Captura estructurada de intervenciones:** Registro de trabajos clasificados por categoría (Correctivo, Instalaciones, Recableados o categorías configurables), ambiente físico, equipos intervenidos y materiales utilizados.
* **Control de insumos en tiempo real:** Autocompletado predictivo conectado al catálogo centralizado y módulo de solicitud inmediata de reposición de materiales hacia supervisión.
* **Optimización para dispositivos móviles:** Interfaz táctil reactiva, integración con eventos hápticos para confirmación de acciones y persistencia local de borradores ante pérdidas de energía o reinicio de navegador.

### 2. Módulo de Supervisión y Control Operativo
* **Tablero de Control e Indicadores (KPIs):** Visualización en tiempo real del estado de los servicios (Pendiente, En Proceso, En Espera de Aprobación, Finalizado, Aprobado).
* **Bandeja de auditoría y validación:** Filtrado multicriterio por sede, técnico asignado, supervisor a cargo y rango de fechas.
* **Motor de exportación masiva en lote:** Compilación en cliente de reportes individuales y consolidados en formato Microsoft Excel (`.xlsx`) con estilos corporativos y empaquetado en archivo `.zip` con monitor de progreso en tiempo real.
* **Trazabilidad y control de cambios:** Historial cronológico inmutable de revisiones, motivos de modificación y aprobaciones por informe.

### 3. Módulo de Administración y Seguridad
* **Control de acceso basado en roles (RBAC):** Definición jerárquica de permisos para perfiles Técnico, Supervisor y Administrador.
* **Gestión de cuentas de usuario:** Creación, activación/desactivación de accesos y flujo de recuperación de credenciales vía correo electrónico.
* **Gestión de catálogos maestros:** Mantenimiento de listas de materiales, unidades de medida normalizadas, inventario de dispositivos y directorio de sedes.

---

## Arquitectura y Tecnologías

| Componente | Especificación Técnica |
| :--- | :--- |
| **Framework Frontend** | Next.js 16 (App Router, Turbopack, React 19) |
| **Lenguaje** | TypeScript 5 (tipado estricto en toda la capa de dominio y servicios) |
| **Persistencia y Autenticación** | Firebase Authentication + Cloud Firestore con persistencia multi-tab |
| **Generación de Archivos** | ExcelJS (formato de hojas de cálculo) + JSZip (empaquetado ZIP en cliente) + jsPDF |
| **Soporte Móvil / PWA** | Next-PWA (Service Workers, Offline caching) + Capacitor (Haptics, Device API) |
| **Diseño y Estilos** | CSS nativo con variables de diseño (Design Tokens), soporte para temas claro y oscuro |

---

## Puesta en Marcha

### Requisitos Previos
* Node.js 18.18 o superior (recomendado LTS)
* Gestor de paquetes `npm` (v9+) o `pnpm`

### 1. Instalación de Dependencias
```bash
git clone https://github.com/zelned24/info-tecni-web.git
cd info-tecni-web
npm install
```

### 2. Modo de Demostración Local (Sin Dependencias Externas)
Para evaluar o ejecutar la plataforma localmente sin necesidad de aprovisionar un proyecto en la nube:
```bash
npm run dev
```
Acceda a `http://localhost:3000` en su navegador. La pantalla de acceso cuenta con accesos directos preconfigurados para iniciar sesión de inmediato con datos de prueba realistas:
* **Técnico:** Ingreso directo al entorno de captura, catálogo precargado y emulación de almacenamiento offline.
* **Supervisor:** Visualización de métricas, bandeja con informes de muestra en múltiples estados y prueba del generador masivo en ZIP.
* **Administrador:** Panel de administración de usuarios y configuración general.

Alternativamente, puede autenticarse utilizando cualquiera de las siguientes credenciales:
* `tecnico@demo.com`
* `supervisor@demo.com`
* `admin@demo.com`

---

## Configuración de Producción (Firebase)

Para conectar la aplicación con su propia infraestructura en la nube:

### 1. Variables de Entorno
Cree un archivo `.env.local` en la raíz del proyecto tomando como referencia el archivo `.env.example`:
```bash
cp .env.example .env.local
```

Configure las credenciales de su proyecto de Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=su_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=su-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=su-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=su-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=su_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=su_app_id
```

### 2. Carga Inicial de Catálogos (Seeding)
El proyecto incluye un script de inicialización para poblar las colecciones maestras (`materiales`, `dispositivos`, `agencias`) en Firestore:
```bash
npm run seed
```

### 3. Reglas de Seguridad en Cloud Firestore
En la consola de Firebase (`Firestore Database > Reglas`), aplique la política de acceso de mínimo privilegio:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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

## Personalización y Adaptación Corporativa

### Identidad Visual y Paleta de Colores
Las variables globales de estilo se centralizan en `src/app/globals.css`:
```css
:root {
  --color-primary: #2E75B6;      /* Color corporativo principal */
  --color-primary-dark: #1F4E78; /* Variante para estados activos/hover */
  --color-accent: #F0A500;       /* Acentos e indicadores destacados */
}
```

### Categorías Operativas
Para adaptar los tipos de trabajo a su rubro específico (por ejemplo: "Mantenimiento Preventivo", "Calibración", "Inspección"), actualice la constante en `src/lib/config.ts`:
```typescript
export const CATEGORIAS = ["Preventivo", "Correctivo", "Auditoría"] as const;
```
Todos los selectores de interfaz, filtros de supervisión y generadores de hojas de cálculo se ajustan de manera automática.

### Configuración del Usuario Administrador Inicial
1. En la consola de Firebase (`Authentication > Users`), cree el primer usuario con correo y contraseña.
2. En `Firestore Database`, cree un documento dentro de la colección `usuarios` con el ID correspondiente al **UID** del usuario:
   ```json
   {
     "email": "admin@empresa.com",
     "nombre": "Administrador del Sistema",
     "rol": "admin",
     "activo": true
   }
   ```
3. A partir de este momento, el administrador podrá gestionar las altas y modificaciones de personal directamente desde el panel `/admin`.

---

## Compilación y Despliegue

La solución está configurada para compilación estática desacoplada (`output: 'export'`), permitiendo alojar el frontend en cualquier servicio de hosting estático o CDN:

```bash
# Compilar y generar artefactos de producción en la carpeta /out
npm run build

# Despliegue en Firebase Hosting (opcional)
npx firebase-tools deploy --only hosting
```

---

## Estructura del Proyecto

```text
├── src/
│   ├── app/                    # Rutas y vistas de la aplicación (Next.js App Router)
│   │   ├── admin/              # Panel de administración de usuarios y accesos
│   │   ├── supervisor/         # Dashboard ejecutivo, bandeja y reportes masivos
│   │   ├── tecnico/            # Captura operativa de campo y modo offline
│   │   ├── layout.tsx          # Layout principal y configuración de PWA
│   │   └── page.tsx            # Portal de autenticación y acceso demo
│   ├── components/             # Componentes modulares y elementos de interfaz
│   │   ├── supervisor/         # Bandeja, KPIs, modales de revisión y visor de reportes
│   │   └── tecnico/            # Formularios de ingreso, resumen y seguimiento
│   └── lib/                    # Lógica de negocio, adaptadores y capa de servicios
│       ├── auth-service.ts     # Manejo de sesiones y control de roles (RBAC)
│       ├── config.ts           # Configuración de categorías y tokens del sistema
│       ├── demo-data.ts        # Datos de prueba para ejecución sin backend
│       ├── excel-export.ts     # Motor de generación de libros Excel y empaquetado ZIP
│       ├── firebase.ts         # Inicialización de clientes Firebase y persistencia local
│       ├── firestore-service.ts# Capa de acceso a datos y sincronización en tiempo real
│       └── store.ts            # Almacenamiento local, borradores y cola offline
├── public/                     # Manifiesto PWA, iconos y recursos estáticos
├── scripts/                    # Scripts de utilidad para inicialización de catálogos
└── README.md                   # Documentación técnica del repositorio
```

---

## Licencia

Distribuido bajo la Licencia MIT. Consulte el archivo `LICENSE` para más detalles.
