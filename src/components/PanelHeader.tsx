import { theme } from '../styles/theme'

interface PanelHeaderProps {
  title: string
  badge?: number
  badgeColor?: string
  controls?: React.ReactNode
  isMobile?: boolean
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  badge,
  badgeColor = theme.accent,
  controls,
  isMobile,
}) => {
  const height = isMobile ? 32 : 22

  return (
    <div
      style={{
        height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        background: theme.panelHeader,
        borderBottom: `1px solid ${theme.border}`,
        minWidth: 0,
      }}
    >
      <span style={{ color: theme.textMuted, fontSize: 9, userSelect: 'none', lineHeight: 1 }}>▼</span>
      <span
        style={{
          fontSize: theme.fs.xs,
          fontWeight: 700,
          color: theme.textMuted,
          letterSpacing: '0.1em',
          fontFamily: theme.fontMono,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
        }}
      >
        {title}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            background: badgeColor,
            color: '#0F1114',
            fontSize: theme.fs.xs,
            fontWeight: 700,
            padding: '0 5px',
            borderRadius: 10,
            minWidth: 16,
            height: 16,
            lineHeight: '16px',
            textAlign: 'center',
            display: 'inline-block',
            fontFamily: theme.fontMono,
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
      {controls && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {controls}
        </div>
      )}
    </div>
  )
}
