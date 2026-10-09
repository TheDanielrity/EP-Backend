import express from 'express';
import { salas } from './routes/api/salas.js';
import { usuarios } from './routes/api/usuarios.js';
import { reservas } from './routes/api/reservas.js';
import { logging } from './middlewares/logging.js';
import { manejoErrores } from './middlewares/manejoErrores.js';

export const app = express();

app.use(logging);
app.use(express.json());

app.use('/v1/api/salas', salas);
app.use('/v1/api/usuarios', usuarios);
app.use('/v1/api/reservas', reservas);

app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// El middleware de errores se coloca después de todas las rutas.
app.use(manejoErrores);
