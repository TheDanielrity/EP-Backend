import { fileURLToPath } from 'node:url';
import { config } from '../config/env.js';

/** Especificación OpenAPI 3 del proyecto (docs/openapi.yaml). */
const RUTA_OPENAPI = fileURLToPath(new URL('../../docs/openapi.yaml', import.meta.url));

/** Versión fija de Swagger UI servida desde CDN: no agrega dependencias al proyecto. */
const SWAGGER_UI = 'https://unpkg.com/swagger-ui-dist@5.17.14';

const paginaSwagger = () => `<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mythos Coworking · Documentación de la API</title>
    <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css">
    <style>body { margin: 0; } .topbar { display: none; }</style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_UI}/swagger-ui-bundle.js" crossorigin></script>
    <script>
        window.ui = SwaggerUIBundle({
            url: '${config.prefijoApi}/openapi.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            displayRequestDuration: true,
            tryItOutEnabled: true
        });
    </script>
</body>
</html>`;

export const documentacionController = {
    especificacion(req, res) {
        res.type('application/yaml').sendFile(RUTA_OPENAPI);
    },

    interfaz(req, res) {
        res.type('html').send(paginaSwagger());
    }
};
