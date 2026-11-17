import type { ReactNode } from 'react'
import { Body1, makeStyles, Subtitle2, tokens } from '@fluentui/react-components'
import { MailInbox48Regular, MailRead48Regular } from '@fluentui/react-icons'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '48px 24px',
    height: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '88px',
    height: '88px',
    marginBottom: '8px',
    borderRadius: '50%',
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  description: {
    maxWidth: '320px',
    color: tokens.colorNeutralForeground3,
  },
})

interface Props {
  title: string
  description?: ReactNode
  icon?: ReactNode
  variant?: 'inbox' | 'reading'
  children?: ReactNode
}

export function EmptyState({ title, description, icon, variant, children }: Props) {
  const styles = useStyles()
  const glyph =
    icon ?? (variant === 'reading' ? <MailRead48Regular /> : variant === 'inbox' ? <MailInbox48Regular /> : null)
  return (
    <div className={styles.root}>
      {glyph && <div className={styles.icon}>{glyph}</div>}
      <Subtitle2>{title}</Subtitle2>
      {description && <Body1 className={styles.description}>{description}</Body1>}
      {children}
    </div>
  )
}
