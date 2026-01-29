import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook optimizado para detectar dispositivos móviles en tiempo real.
 * Útil para ajustar el comportamiento del mapa y la visibilidad de la barra lateral.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Función optimizada para manejar el cambio
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Soporte para navegadores antiguos y modernos
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else {
      mql.addListener(onChange);
    }

    // Comprobación inicial
    onChange(mql);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else {
        mql.removeListener(onChange);
      }
    };
  }, []);

  return isMobile;
}
