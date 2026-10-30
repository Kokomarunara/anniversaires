import type { ReactNode } from 'react';
import type { Person } from '../types';
import type { Store } from '../storage/store';
import { InstallCard } from '../components/InstallCard';
import { DrawPad } from '../components/DrawPad';
import { Home } from './Home';
import { EditPerson } from './EditPerson';

// Page affichée quand on ouvre le lien dans le navigateur : le bouton d'installation
// et des aperçus de l'app, qui sont les vrais écrans remplis avec des personnes fictives.

const noop = () => {};
const noopAsync = async () => {};

// aucun accès aux vraies données du téléphone dans les aperçus ; les « photos » sont tes dessins de public/previews
const previewStore: Store = {
  list: async () => [],
  save: noopAsync,
  remove: noopAsync,
  putPhoto: async () => '',
  deletePhoto: noopAsync,
  photoUrl: async (path) => path,
};

/** dessins faits à la main dans l'atelier (npm run dev, puis ?atelier) */
const drawing = (n: number) => `./previews/dessin-${n}.jpg`;

function inDays(days: number, year: number | null): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${year ?? '-'}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const person = (
  id: string,
  name: string,
  gender: Person['gender'],
  birthday: string,
  photo: string | null = null,
  reminders: number[] = [],
): Person => ({
  id: `apercu-${id}`,
  name,
  gender,
  birthday,
  photo,
  notes: '',
  remindOnDay: true,
  reminders,
});

const PEOPLE: Person[] = [
  person('1', 'Camille', 'F', inDays(0, 1994), drawing(3)),
  person('2', 'Hugo', 'M', inDays(4, 1990), drawing(1)),
  person('3', 'Léa', 'F', inDays(12, 1997), drawing(2)),
  person('4', 'Maman', 'F', inDays(40, 1965)),
  person('5', 'Thomas', 'M', inDays(95, 1988)),
  person('6', 'Inès', 'F', inDays(200, 2001)),
];

// la personne qu'on est en train d'ajouter dans l'aperçu du formulaire
const NEW_PERSON = person('7', 'Léa', 'F', inDays(12, 1997), drawing(2), [7]);

const PREVIEWS: { caption: string; screen: ReactNode }[] = [
  {
    caption: 'Tous tes proches, du prochain anniversaire au plus lointain',
    screen: <Home people={PEOPLE} store={previewStore} onOpen={noop} onAdd={noop} onSettings={noop} />,
  },
  {
    caption: 'Son nom, sa date, ses rappels : c’est tout',
    screen: <EditPerson person={NEW_PERSON} asNew store={previewStore} onCancel={noop} onSaved={noopAsync} />,
  },
  {
    caption: 'Dessine sa photo de profil',
    screen: <DrawPad startFrom={drawing(1)} onCancel={noop} onDone={noop} embedded />,
  },
];

export function Landing() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <img className="landing-icon" src="./icons/icon-192.png" alt="" width={96} height={96} />
        <h1>Anniversaires</h1>
        <p>Les anniversaires de tes proches, sans jamais en oublier un.</p>
        <InstallCard />
      </header>

      <section aria-label="Aperçu de l’app">
        <div className="previews">
          {PREVIEWS.map(({ caption, screen }) => (
            <figure key={caption} className="preview">
              <div className="preview-frame" aria-hidden="true" inert>
                <div className="preview-screen">{screen}</div>
              </div>
              <figcaption>{caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
