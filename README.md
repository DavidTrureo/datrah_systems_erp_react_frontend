# Datrah Systems ERP - Frontend

Bienvenido al frontend de **Datrah Systems ERP**, una solución integral moderna de punto de venta (POS) y planificación de recursos empresariales.

## 🚀 Tecnologías

Este proyecto está construido utilizando las últimas tecnologías para garantizar un rendimiento óptimo y una experiencia de usuario (UX) excepcional:

- **React 18** (Librería principal UI)
- **TypeScript** (Tipado fuerte)
- **Vite** (Empaquetador ultrarrápido)
- **Tailwind CSS v4** (Sistema de diseño utilitario, Dark Theme, Glassmorphism)
- **Lucide React** (Iconografía limpia y moderna)
- **jsPDF & autoTable** (Generación de reportes financieros y cotizaciones en PDF)

## 📦 Módulos Principales

El sistema está dividido en módulos de negocio altamente especializados:

- 📊 **Dashboard**: Resumen financiero en tiempo real, KPIs, alertas de bajo stock y gráficas.
- 🛒 **Facturación (POS)**: Punto de venta fluido, con generación de tickets imprimibles y cálculo automático de impuestos/vueltos.
- 📄 **Cotizaciones**: Creación, seguimiento y exportación de cotizaciones en PDF.
- 📦 **Inventario**: Control estricto de stock, productos, categorías y ajuste de existencias.
- 👥 **Clientes y Proveedores**: Gestión centralizada de entidades con su información fiscal.
- 💰 **Finanzas**: Control de flujo de caja, cuentas por cobrar, cuentas por pagar y movimientos.
- 🏛️ **Contabilidad**: Motor de doble partida (libro diario), libro mayor, balance general y estado de resultados.
- ⚙️ **Administración**: Gestión de usuarios, roles de acceso y auditoría de la bitácora del sistema.
- 🤖 **Datrah Copilot**: Asistente virtual inteligente integrado para consultas rápidas.

## 🛠️ Instalación y Configuración Local

1. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

El proyecto estará disponible localmente en `http://localhost:5173`.

## 🎨 Arquitectura de Estilos (Tailwind v4)

Se ha realizado una migración completa hacia **Tailwind CSS v4**. Las clases utilitarias reemplazan los estilos en línea y centralizan el diseño para mantener un estándar estricto visual. Se utiliza un tema oscuro por defecto con acentos de color (`--color-primary`, `--color-success`, etc.) integrados directamente en las directivas de `@theme` de Tailwind.
