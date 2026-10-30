// Installation sur l'écran d'accueil de l'iPhone : Safari ne permet pas de l'automatiser,
// on affiche la marche à suivre (Partager › « Sur l'écran d'accueil »).

export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  );
}
