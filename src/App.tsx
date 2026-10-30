import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Person } from './types';
import { hasGitHub, loadSettings, saveSettings, type Settings } from './settings';
import type { Store } from './storage/store';
import { localStore } from './storage/localStore';
import { createGitHubStore } from './storage/githubStore';
import { GitHubError } from './storage/github';
import { Home } from './views/Home';
import { PersonView } from './views/PersonView';
import { EditPerson } from './views/EditPerson';
import { SettingsView } from './views/SettingsView';
import { Welcome } from './views/Welcome';
import { sound } from './lib/sound';

// en local (npm run dev), l'app fonctionne sans code d'accès, avec des données sur l'ordinateur
const LOCAL_DEV = ['localhost', '127.0.0.1'].includes(location.hostname);

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
  const setError = useCallback((message: string | null) => {
    if (message) sound.error();
    setErrorState(message);
  }, []);

  const store: Store = useMemo(
    () => (hasGitHub(settings) ? createGitHubStore(settings) : localStore),
    [settings.owner, settings.repo, settings.token],
  );

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
      // code d'accès expiré : on revient à l'écran de bienvenue pour en coller un nouveau
      if (err instanceof GitHubError && err.status === 401) {
        setSettings((s) => {
          const next = { ...s, token: '' };
          saveSettings(next);
          return next;
        });
        return;
      }
      setError(`Impossible de charger tes anniversaires : ${(err as Error).message}`);
      setPeople((p) => p ?? []);
    }
  }, [store, setError]);

  useEffect(() => {
    setPeople(null);
    refresh();
    // recharge quand on revient sur l'app, pour voir les ajouts de l'autre téléphone
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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

  const find = (id?: string) => people?.find((p) => p.id === id);
  let view;

  if (!hasGitHub(settings) && !LOCAL_DEV) {
    view = <Welcome settings={settings} onConnected={changeSettings} />;
  } else if (route.name === 'settings') {
    view = <SettingsView settings={settings} onBack={back} onChange={changeSettings} />;
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
    </>
  );
}
