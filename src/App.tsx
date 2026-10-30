import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Person } from './types';
import { loadSettings, saveSettings, type Settings } from './settings';
import { localStore as store } from './storage/localStore';
import { Home } from './views/Home';
import { PersonView } from './views/PersonView';
import { EditPerson } from './views/EditPerson';
import { SettingsView } from './views/SettingsView';
import { Landing } from './views/Landing';
import { Atelier } from './views/Atelier';
import { sound } from './lib/sound';
import { calendarStatus, sendToCalendar } from './lib/calendar';
import { isInstalled } from './lib/install';

// ouvert dans le navigateur : page de présentation ; installé sur l'écran d'accueil : l'app
// (?app permet d'ouvrir l'app dans le navigateur pour la tester sur ordinateur)
const SHOW_LANDING = !isInstalled() && !new URLSearchParams(location.search).has('app');
// en local uniquement : atelier pour dessiner l'image d'aperçu (voir vite.config.ts)
const SHOW_ATELIER = import.meta.env.DEV && new URLSearchParams(location.search).has('atelier');

type Route =
  | { name: 'home' }
  | { name: 'person'; id: string }
  | { name: 'edit'; id?: string }
  | { name: 'settings' };

function parseHash(): Route {
  const [, page, id] = location.hash.replace(/^#/, '').split('/');
  if (page === 'p' && id) return { name: 'person', id };
  if (page === 'edit') return { name: 'edit', id };
  if (page === 'new') return { name: 'edit' };
  if (page === 'settings') return { name: 'settings' };
  return { name: 'home' };
}

// nombre de pages ouvertes dans l'app, pour savoir si « Retour » peut utiliser l'historique
let depth = 0;

function go(hash: string, play = sound.forward) {
  depth++;
  play();
  location.hash = hash;
}

function back() {
  sound.back();
  leave();
}

/** revient à la page précédente sans son (un autre son vient d'être joué) */
function leave() {
  if (depth > 0) {
    depth--;
    history.back();
  } else {
    location.replace('#/');
  }
}

export function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  // message d'information (pas une erreur), par exemple au sujet du Calendrier
  const [notice, setNotice] = useState<string | null>(null);
  // change après chaque envoi au Calendrier, pour recalculer si le bouton 📅 doit pulser
  const [calendarVersion, setCalendarVersion] = useState(0);
  const setError = useCallback((message: string | null) => {
    if (message) sound.error();
    setErrorState(message);
  }, []);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setPeople(await store.list());
      setError(null);
    } catch (err) {
      setError(`Impossible de charger tes anniversaires : ${(err as Error).message}`);
      setPeople((p) => p ?? []);
    }
  }, [setError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function changeSettings(next: Settings) {
    saveSettings(next);
    setSettings(next);
  }

  async function save(person: Person) {
    try {
      await store.save(person);
    } catch (err) {
      setError(`Enregistrement impossible : ${(err as Error).message}`);
      throw err;
    }
    setPeople((list) => {
      const rest = (list ?? []).filter((p) => p.id !== person.id);
      return [...rest, person];
    });
  }

  /** Bouton 📅 de l'accueil : envoie au Calendrier tout ce qui manque */
  async function sendCalendar() {
    const toRemove = await sendToCalendar(people ?? [], settings.hour);
    setCalendarVersion((v) => v + 1);
    if (toRemove.length) {
      setNotice(`Dans l’app Calendrier, supprime ces anciens événements qui ne sont plus bons : ${toRemove.join(' · ')}`);
    } else {
      sound.success();
    }
  }

  async function remove(person: Person) {
    try {
      await store.remove(person);
    } catch (err) {
      setError(`Suppression impossible : ${(err as Error).message}`);
      return;
    }
    setPeople((list) => (list ?? []).filter((p) => p.id !== person.id));
    sound.remove();
    leave();
  }

  // le bouton 📅 pulse tant que le Calendrier n'est pas à jour (ajout, modification ou suppression)
  const calendarPending = useMemo(() => {
    if (!people) return false;
    const status = calendarStatus(people, settings.hour);
    return status.toSend > 0 || status.toRemove.length > 0;
  }, [people, settings.hour, calendarVersion]);

  const find = (id?: string) => people?.find((p) => p.id === id);
  let view;

  if (SHOW_ATELIER) {
    view = <Atelier />;
  } else if (SHOW_LANDING) {
    view = <Landing />;
  } else if (route.name === 'settings') {
    view = (
      <SettingsView
        settings={settings}
        people={people ?? []}
        onBack={back}
        onChange={changeSettings}
        onCalendarResent={() => setCalendarVersion((v) => v + 1)}
      />
    );
  } else if (route.name === 'edit' && (!route.id || people)) {
    const person = find(route.id);
    view = (
      <EditPerson
        key={route.id ?? 'new'}
        person={person}
        store={store}
        onCancel={back}
        onSaved={async (p) => {
          await save(p);
          sound.success();
          if (person) leave();
          else location.replace(`#/p/${p.id}`);
        }}
      />
    );
  } else if (route.name === 'person' && find(route.id)) {
    view = (
      <PersonView
        key={route.id}
        person={find(route.id)!}
        store={store}
        hour={settings.hour}
        onBack={back}
        onEdit={() => go(`#/edit/${route.id}`)}
        onSave={save}
        onDelete={remove}
      />
    );
  } else {
    view = (
      <Home
        people={people}
        store={store}
        onOpen={(id) => go(`#/p/${id}`)}
        onAdd={() => go('#/new', sound.add)}
        onSettings={() => go('#/settings')}
        calendarPending={calendarPending}
        onCalendar={sendCalendar}
      />
    );
  }

  return (
    <>
      {view}
      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Fermer">
            ✕
          </button>
        </div>
      )}
      {notice && !error && (
        <div className="toast toast-info" role="status">
          <span>📅 {notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Fermer">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
