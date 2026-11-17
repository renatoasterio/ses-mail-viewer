import type { ReactNode } from 'react'
import {
  Caption1,
  makeStyles,
  mergeClasses,
  NavCategory,
  NavCategoryItem,
  NavDivider,
  NavDrawer,
  NavDrawerBody,
  NavDrawerFooter,
  NavItem,
  NavSubItem,
  NavSubItemGroup,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import {
  Attach20Regular,
  bundleIcon,
  Circle12Filled,
  MailInbox20Filled,
  MailInbox20Regular,
  MailUnread20Filled,
  MailUnread20Regular,
  PeopleTeam20Filled,
  PeopleTeam20Regular,
  Send20Filled,
  Send20Regular,
} from '@fluentui/react-icons'
import type { ConnectionStatus } from '../hooks/useMailbox'

const Inbox = bundleIcon(MailInbox20Filled, MailInbox20Regular)
const Unread = bundleIcon(MailUnread20Filled, MailUnread20Regular)
const Recipients = bundleIcon(PeopleTeam20Filled, PeopleTeam20Regular)
const Senders = bundleIcon(Send20Filled, Send20Regular)

export interface MailboxEntry {
  address: string
  total: number
  unread: number
}

const useStyles = makeStyles({
  drawer: {
    width: '240px',
    minWidth: '240px',
  },
  inline: {
    backgroundColor: 'transparent',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    minWidth: 0,
  },
  subItem: {
    display: 'flex',
    width: '100%',
    minWidth: 0,
  },
  text: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  count: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  unreadCount: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 12px 12px',
    color: tokens.colorNeutralForeground3,
    minWidth: 0,
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  endpoint: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  online: { color: tokens.colorPaletteGreenForeground1 },
  offline: { color: tokens.colorPaletteRedForeground1 },
  connecting: { color: tokens.colorPaletteYellowForeground1 },
})

interface Props {
  open: boolean
  overlay: boolean
  onOpenChange: (open: boolean) => void
  folder: string
  onSelect: (folder: string) => void
  counts: { total: number; unread: number; attachments: number }
  recipients: MailboxEntry[]
  senders: MailboxEntry[]
  status: ConnectionStatus
  endpoint?: string
  lastSync?: Date
}

/** Rótulo com contador: não lidas em destaque, senão o total. */
function Label({ text, unread, total }: { text: ReactNode; unread?: number; total?: number }) {
  const styles = useStyles()
  return (
    <span className={styles.label}>
      <span className={styles.text}>{text}</span>
      {unread ? (
        <span className={mergeClasses(styles.count, styles.unreadCount)}>{unread}</span>
      ) : total ? (
        <span className={styles.count}>{total}</span>
      ) : null}
    </span>
  )
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  online: 'Conectado ao LocalStack',
  offline: 'LocalStack indisponível',
  connecting: 'Conectando…',
}

export function NavPane(props: Props) {
  const { open, overlay, onOpenChange, folder, onSelect, counts, recipients, senders, status, endpoint, lastSync } = props
  const styles = useStyles()

  return (
    <NavDrawer
      className={mergeClasses(styles.drawer, !overlay && styles.inline)}
      type={overlay ? 'overlay' : 'inline'}
      open={open}
      onOpenChange={(_, data) => onOpenChange(data.open)}
      selectedValue={folder}
      onNavItemSelect={(_, data) => onSelect(String(data.value))}
      defaultOpenCategories={['recipients']}
      density="small"
    >
      <NavDrawerBody>
        <NavItem value="inbox" icon={<Inbox />}>
          <Label text="Caixa de Entrada" unread={counts.unread} total={counts.total} />
        </NavItem>
        <NavItem value="unread" icon={<Unread />}>
          <Label text="Não lidas" total={counts.unread} />
        </NavItem>
        <NavItem value="attachments" icon={<Attach20Regular />}>
          <Label text="Com anexos" total={counts.attachments} />
        </NavItem>

        <NavDivider />

        <NavCategory value="recipients">
          <NavCategoryItem icon={<Recipients />}>Destinatários ({recipients.length})</NavCategoryItem>
          <NavSubItemGroup>
            {recipients.map((r) => (
              <NavSubItem key={r.address} value={`to:${r.address}`}>
                <Tooltip content={r.address} relationship="label" positioning="after">
                  <span className={styles.subItem}>
                    <Label text={r.address} unread={r.unread} total={r.total} />
                  </span>
                </Tooltip>
              </NavSubItem>
            ))}
          </NavSubItemGroup>
        </NavCategory>

        <NavCategory value="senders">
          <NavCategoryItem icon={<Senders />}>Remetentes ({senders.length})</NavCategoryItem>
          <NavSubItemGroup>
            {senders.map((s) => (
              <NavSubItem key={s.address} value={`from:${s.address}`}>
                <Tooltip content={s.address} relationship="label" positioning="after">
                  <span className={styles.subItem}>
                    <Label text={s.address} unread={s.unread} total={s.total} />
                  </span>
                </Tooltip>
              </NavSubItem>
            ))}
          </NavSubItemGroup>
        </NavCategory>
      </NavDrawerBody>

      <NavDrawerFooter>
        <div className={styles.footer}>
          <Caption1 className={styles.status}>
            <Circle12Filled className={styles[status]} />
            {STATUS_LABEL[status]}
          </Caption1>
          {endpoint && (
            <Caption1 className={styles.endpoint} title={endpoint}>
              {endpoint}
            </Caption1>
          )}
          {lastSync && (
            <Caption1>
              Sincronizado às {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Caption1>
          )}
        </div>
      </NavDrawerFooter>
    </NavDrawer>
  )
}
