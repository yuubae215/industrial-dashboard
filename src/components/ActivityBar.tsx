import { theme } from '../styles/theme'

interface ActivityBarProps {
  activeView: string
  onViewChange: (view: string) => void
}

const VIEWS = [
  {
    id: 'explorer',
    label: 'Explorer',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M1 1h6l2 2h6v11H1V1zm0 1v10h13V4H8.5L6.5 2H1z" />
      </svg>
    ),
  },
  {
    id: 'network',
    label: 'Network',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <circle cx="8" cy="4" r="2" />
        <circle cx="3" cy="12" r="2" />
        <circle cx="13" cy="12" r="2" />
        <line x1="8" y1="6" x2="3" y2="10" stroke="currentColor" strokeWidth="1.2" />
        <line x1="8" y1="6" x2="13" y2="10" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    id: 'alarms',
    label: 'Alarms',
    icon: (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M8 1a5 5 0 00-5 5v3l-1.5 2.5h13L13 9V6a5 5 0 00-5-5zm0 14a2 2 0 002-2H6a2 2 0 002 2z" />
      </svg>
    ),
  },
] as const

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange }) => {
  return (
    <div
      style={{
        width: 40,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: theme.activityBar,
        borderRight: `1px solid ${theme.border}`,
      }}
    >
      {VIEWS.map((view) => {
        const isActive = activeView === view.id
        return (
          <button
            key={view.id}
            title={view.label}
            onClick={() => onViewChange(view.id)}
            style={{
              width: 40,
              height: 40,
              border: 'none',
              background: isActive ? `${theme.accent}18` : 'transparent',
              borderLeft: isActive ? `3px solid ${theme.accent}` : '3px solid transparent',
              color: isActive ? theme.text : theme.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'background 0.12s, color 0.12s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = `${theme.border}88`
                e.currentTarget.style.color = theme.text
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = theme.textMuted
              }
            }}
          >
            {view.icon}
          </button>
        )
      })}
    </div>
  )
}
