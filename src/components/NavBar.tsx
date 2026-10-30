interface Props {
  onBack: () => void;
  backLabel?: string;
  title?: string;
  /** nav : l'action change de page (le son de page remplace la bulle) */
  action?: { label: string; onClick: () => void; disabled?: boolean; bold?: boolean; nav?: boolean };
}

export function NavBar({ onBack, backLabel = 'Retour', title, action }: Props) {
  return (
    <header className="nav">
      <button className="nav-btn nav-back" data-nav onClick={onBack}>
        <svg viewBox="0 0 12 20" width="11" height="18" aria-hidden="true">
          <path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </button>
      {title && <span className="nav-title">{title}</span>}
      {action ? (
        <button
          className={`nav-btn${action.bold ? ' nav-bold' : ''}`}
          data-nav={action.nav || undefined}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      ) : (
        <span />
      )}
    </header>
  );
}
