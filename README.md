# Café y Vida — página tipo Link-in-bio editable

Incluye:
- Página pública responsive.
- Panel `/admin` protegido por contraseña.
- PDF reemplazable con un clic.
- Links agregables/editables/activables y destacados.
- Apariencia con colores, transparencia, redondeado, tamaños y textos.
- Vista previa.
- Logo y fondo reemplazables.

## Prueba local
`npm install` y luego `npm start`.

Público: `http://localhost:3000`
Admin: `http://localhost:3000/admin`
Contraseña de prueba: `cafevida2026`

Para Internet necesitás un hosting Node.js con almacenamiento persistente.


## v7
- /admin now has a password-only entrance before the administration panel.
- PDF upload submits the selected PDF explicitly and replaces the current presentation.
- Title, description, button background and button text colors are independent.


## Administración
Entrá a `/admin` y primero aparecerá la pantalla de contraseña. Una vez autenticado, el panel no vuelve a pedir la contraseña en cada sección. Para producción, configurá `ADMIN_PASSWORD` en las variables de entorno de Railway; el valor de respaldo solo sirve para desarrollo local.
