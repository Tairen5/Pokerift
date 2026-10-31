/**
 * Interfaz original de la ROM (tools/import-rom-ui.mjs): si se ha importado, la
 * clase `rom-ui` en <html> cambia las cajas, los marcos de retrato y la fuente
 * de diálogo por los del juego (style.css). Sin ROM se usan los de build-ui.mjs.
 */
import { ROM_UI } from '../assets/ui-rom.generated';

if (ROM_UI && typeof document !== 'undefined') document.documentElement.classList.add('rom-ui');

/** Ruta de una caja o marco: la de la ROM si existe. */
export const uiAsset = (name: string) => (ROM_UI ? `${ROM_UI.ui}/${name}.png` : `assets/ui/${name}.png`);
