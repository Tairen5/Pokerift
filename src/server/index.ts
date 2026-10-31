/**
 * Punto de entrada del servidor multijugador.
 *   PORT                  puerto (por defecto 8787)
 *   TURN_TIMEOUT_SECONDS  límite de espera por turno (por defecto 60, 0 = sin límite)
 */
import { startServer } from './app';

startServer({
  port: Number(process.env.PORT ?? 8787),
  turnTimeoutSeconds: Number(process.env.TURN_TIMEOUT_SECONDS ?? 60),
});
