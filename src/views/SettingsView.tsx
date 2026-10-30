import { useEffect, useState } from 'react';
import { hasGitHub, type Settings } from '../settings';
import { NavBar } from '../components/NavBar';
import { testConnection } from '../storage/github';
import { setSoundEnabled, sound, soundEnabled } from '../lib/sound';
import { disablePush, enablePush, getPushStatus, showTestNotification, syncSubscription, type PushStatus } from '../lib/push';

interface Props {
  settings: Settings;
  onBack: () => void;
  onChange: (settings: Settings) => void;
}

type Check = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; text: string } | { kind: 'error'; text: string };

const PUSH_HELP: Record<PushStatus, string> = {
  'needs-install': 'Sur iPhone, les notifications ne marchent qu’une fois l’app installée : dans Safari, touche Partager › « Sur l’écran d’accueil », puis ouvre l’app depuis l’icône.',
  unsupported: 'Ce navigateur ne gère pas les notifications push.',
  'missing-key': 'Les notifications ne sont pas encore configurées (clé VAPID manquante).',
  denied: 'Les notifications sont bloquées. Réautorise-les dans les réglages du téléphone, puis reviens ici.',
  off: 'Tu recevras une notification chaque jour d’anniversaire, et pour les rappels choisis.',
  on: 'Notifications activées sur cet appareil.',
};

export function SettingsView({ settings, onBack, onChange }: Props) {
  const [owner, setOwner] = useState(settings.owner);
  const [repo, setRepo] = useState(settings.repo);
  const [token, setToken] = useState(settings.token);
  const [check, setCheck] = useState<Check>({ kind: 'idle' });
  const [push, setPush] = useState<PushStatus | null>(null);
  const [pushMsg, setPushMsg] = useState<Check>({ kind: 'idle' });
  const [sounds, setSounds] = useState(soundEnabled);

  const connected = hasGitHub(settings);
  const dirty = owner.trim() !== settings.owner || repo.trim() !== settings.repo || token.trim() !== settings.token;

  useEffect(() => {
    getPushStatus().then(setPush);
  }, []);

  async function connect() {
    const cfg = { owner: owner.trim(), repo: repo.trim(), token: token.trim() };
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      setCheck({ kind: 'error', text: 'Remplis les trois champs.' });
      return;
    }
    setCheck({ kind: 'busy' });
    try {
      await testConnection(cfg);
      onChange({ ...settings, ...cfg });
      setCheck({ kind: 'ok', text: `Connecté à ${cfg.owner}/${cfg.repo}` });
    } catch (err) {
      setCheck({ kind: 'error', text: (err as Error).message });
    }
  }

  function disconnect() {
    if (!confirm('Repasser en mode démo sur cet appareil ? Les données sur GitHub ne sont pas touchées.')) return;
    onChange({ ...settings, token: '' });
    setToken('');
    setCheck({ kind: 'idle' });
  }

  async function runPush(action: () => Promise<void>, success: string) {
    setPushMsg({ kind: 'busy' });
    try {
      await action();
      setPushMsg({ kind: 'ok', text: success });
    } catch (err) {
      setPushMsg({ kind: 'error', text: (err as Error).message });
    }
    setPush(await getPushStatus());
  }

  function updateDevice(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    onChange(next);
    if (push === 'on') runPush(() => syncSubscription(next), 'Réglage enregistré');
  }

  return (
    <div className="screen">
      <NavBar onBack={onBack} title="Réglages" />

      <h2 className="section-title">Stockage GitHub</h2>
      <section className="group">
        <div className="group-field">
          <label htmlFor="owner">Compte GitHub</label>
          <input id="owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </div>
        <div className="group-field">
          <label htmlFor="repo">Dépôt des données</label>
          <input id="repo" className="input" value={repo} onChange={(e) => setRepo(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </div>
        <div className="group-field">
          <label htmlFor="token">Jeton d’accès</label>
          <input id="token" className="input" type="password" placeholder="github_pat_…" value={token} onChange={(e) => setToken(e.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </div>
      </section>
      <div className="stack">
        {(dirty || !connected) && (
          <button className="btn-primary wide" onClick={connect} disabled={check.kind === 'busy'}>
            {check.kind === 'busy' ? 'Connexion…' : 'Connecter'}
          </button>
        )}
        <StatusLine check={check} fallback={connected && !dirty ? `Connecté à ${settings.owner}/${settings.repo}` : 'Sans GitHub, l’app reste en mode démo.'} />
        {connected && (
          <button className="btn-link danger" onClick={disconnect}>
            Repasser en mode démo
          </button>
        )}
      </div>

      <h2 className="section-title">Ambiance</h2>
      <section className="group">
        <div className="group-row">
          <label htmlFor="sounds">Petits sons</label>
          <input
            id="sounds"
            type="checkbox"
            role="switch"
            className="switch"
            checked={sounds}
            onChange={(e) => {
              setSoundEnabled(e.target.checked);
              setSounds(e.target.checked);
              if (e.target.checked) sound.success();
            }}
          />
        </div>
      </section>

      <h2 className="section-title">Notifications</h2>
      <section className="group">
        <div className="group-field">
          <label htmlFor="device">Nom de cet appareil</label>
          <input id="device" className="input" defaultValue={settings.deviceLabel} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== settings.deviceLabel && updateDevice({ deviceLabel: e.target.value.trim() })} />
        </div>
        <div className="group-row">
          <label htmlFor="hour">Heure des notifications</label>
          <select id="hour" className="inline-select" value={settings.hour} onChange={(e) => updateDevice({ hour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </section>
      <div className="stack">
        {push && <p className="muted">{PUSH_HELP[push]}</p>}
        {push === 'off' && (
          <button
            className="btn-primary wide"
            disabled={!connected || pushMsg.kind === 'busy'}
            onClick={() => runPush(() => enablePush(settings), 'Notifications activées')}
          >
            Activer les notifications
          </button>
        )}
        {push === 'off' && !connected && <p className="muted">Connecte d’abord GitHub : c’est là que l’abonnement de l’appareil est enregistré.</p>}
        {push === 'on' && (
          <>
            <button className="btn-secondary wide" onClick={() => runPush(showTestNotification, 'Notification de test envoyée')}>
              Afficher une notification de test
            </button>
            <button className="btn-link danger" onClick={() => runPush(() => disablePush(settings), 'Notifications désactivées')}>
              Désactiver sur cet appareil
            </button>
          </>
        )}
        <StatusLine check={pushMsg} />
      </div>
    </div>
  );
}

function StatusLine({ check, fallback }: { check: Check; fallback?: string }) {
  if (check.kind === 'ok') return <p className="status ok">✓ {check.text}</p>;
  if (check.kind === 'error') return <p className="status error" role="alert">{check.text}</p>;
  return fallback ? <p className="muted">{fallback}</p> : null;
}
