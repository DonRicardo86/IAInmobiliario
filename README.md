# 🏢 IA_Inmobiliaria (MVP SaaS)

Sistema SaaS moderno para agencias inmobiliarias diseñado para captar, registrar, clasificar (Lead Scoring) y hacer seguimiento de prospectos comerciales.

Construido con una arquitectura modular y desacoplada (**Clean Architecture / Repository Pattern**), lista para incorporar agentes de Inteligencia Artificial (OpenAI/Gemini/Claude) y automatizaciones de WhatsApp (Meta Cloud API/Twilio).

---

## 🚀 Características del MVP

### 1. Dashboard Integral
- **Métricas y KPIs en Tiempo Real**:
  - Total de prospectos y nuevos registros.
  - Conteo de **Prospectos Calientes** (Alta prioridad 🔥).
  - Volumen económico en Pipeline (suma de presupuestos en proceso).
  - Tasa de Conversión (% de prospectos cerrados exitosamente).
- **Embudo de Conversión Visual**: Barra de progreso interactiva por cada etapa comercial.
- **Distribución de Operaciones**: Métricas de Compra vs Arriendo.
- **Lead Scoring**: Desglose por calidad del prospecto (Alta, Media, Baja).
- **Panel de Atención Prioritaria**: Acceso directo a prospectos calientes con botón de WhatsApp instantáneo.

### 2. Gestión de Prospectos (Leads)
- **Registro con Formulario Validado**:
  - Nombre completo.
  - Teléfono / WhatsApp.
  - Correo electrónico.
  - Tipo de operación (**Compra** / **Arriendo**).
  - Tipo de inmueble (**Apartamento, Casa, Penthouse, Oficina, Local Comercial, Lote, Bodega, Otro**).
  - Zona / Sector de interés con sugerencias automáticas.
  - Presupuesto estimado en COP con formateo en tiempo real.
  - Observaciones y requerimientos específicos.
  - Estado inicial.
  - Clasificación de prioridad (**Alta / Caliente**, **Media / Tibia**, **Baja / Fría**) con sugerencia inteligente automática basada en reglas de negocio.
- **Vista Dual**:
  - **Vista Tabla Dinámica**: Búsqueda en tiempo real por cualquier criterio, filtros combinados por estado, prioridad, operación, tipo de inmueble y ordenamiento avanzado.
  - **Vista Tablero Kanban**: 6 columnas (`Nuevo`, `Contactado`, `Interesado`, `Negociación`, `Cerrado`, `No interesado`) con transición rápida entre etapas y cálculo de volumen por columna.
- **Ficha de Detalle y Bitácora de Seguimiento**:
  - Historial y timeline de actividades (cambios de estado, notas de asesores, llamadas, etc.).
  - Enlace directo con mensaje pre-redactado para contactar al cliente por WhatsApp con 1 clic (`https://wa.me/...`).
  - Edición y eliminación con confirmación de seguridad.

### 3. Arquitectura Desacoplada (Preparada para IA & WhatsApp)
- `src/core/types/`: Modelos de dominio fuertemente tipados.
- `src/core/repositories/`: Patrón repositorio con interfaz abstracta `ILeadRepository` e implementación actual en `LocalStorageLeadRepository`. Listo para migrar a **Supabase (PostgreSQL)** o **Prisma** con solo cambiar el adaptador.
- `src/core/services/`: Lógica de negocio pura (`LeadService`).
- `src/integrations/ai/`: Interfaces y stubs (`IAIService`) para conectar modelos LLM para auto-calificación y redacción de seguimientos.
- `src/integrations/whatsapp/`: Interfaces y stubs (`IWhatsAppService`) para webhooks entrantes y envío de plantillas.
- `src/app/api/`: Serverless endpoints en Next.js App Router.

---

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Lenguaje**: TypeScript
- **UI & Estilos**: Vanilla CSS Moderno con Design Tokens (Dark Theme Luxury, Glassmorphism, Microinteracciones)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Despliegue Recomendado**: [Vercel](https://vercel.com/)

---

## 📦 Instalación y Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abrir en el navegador:
   ```
   http://localhost:3000
   ```

---

## 🌐 Despliegue en Vercel

Este proyecto está 100% optimizado para Vercel:
1. Conectar el repositorio de GitHub en Vercel.
2. Vercel detectará automáticamente la configuración de Next.js.
3. Hacer clic en **Deploy**.
