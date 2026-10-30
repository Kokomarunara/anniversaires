// Installation de l'app sur l'écran d'accueil.
// Android / Chrome proposent une vraie fenêtre d'installation ; sur iPhone, Safari ne le permet pas :
// on affiche alors la marche à suivre (Partager › « Sur l'écran d'accueil »).

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
});

export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  );
}

/** Lance l'installation si le navigateur le permet ; renvoie false s'il faut montrer la marche à suivre */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  deferred = null;
  return true;
}
