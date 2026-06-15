/** Base URL for all internal links (handles trailing slash consistently) */
export const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';

/** Author info — single source of truth */
export const AUTHOR = {
  name: 'Mozz',
  location: 'Buenos Aires, Argentina',
  bio: 'Escribiendo sobre cosas que pasan cuando te quedas dos minutos más. Observador profesional de las pequeñas tragedias cotidianas.',
} as const;