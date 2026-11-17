import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Avatar,
  Badge,
  Body1,
  Button,
  Caption1,
  makeStyles,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Tab,
  TabList,
  Text,
  ToggleButton,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArrowDownload20Regular,
  ArrowLeft20Regular,
  Code20Regular,
  Copy16Regular,
  Copy20Regular,
  Delete20Regular,
  Desktop20Regular,
  MailRead20Regular,
  MailUnread20Regular,
  MoreHorizontal20Regular,
  Phone20Regular,
} from '@fluentui/react-icons'
import { downloadBlob, emlFilename, toEml } from '../lib/download'
import { displayName, formatAddressList, formatBytes, formatLongDate } from '../lib/format'
import type { MailKind, MailMessage } from '../lib/model'
import { Attachments } from './Attachments'
import { EmailFrame, type PreviewWidth } from './EmailFrame'

type View = 'message' | 'text' | 'html' | 'headers' | 'source' | 'template' | 'json'

/** Acima disso o código-fonte é truncado até o usuário pedir para ver tudo. */
const SOURCE_PREVIEW_LIMIT = 200_000

const KIND_LABEL: Record<MailKind, string> = {
  raw: 'SendRawEmail',
  simple: 'SendEmail',
  template: 'SendTemplatedEmail',
}

const useStyles = makeStyles({
  root: {
    height: '100%',
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: '16px 20px 32px',
  },
  subjectRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '12px',
  },
  subject: {
    flex: 1,
    minWidth: 0,
    wordBreak: 'break-word',
    paddingTop: '2px',
  },
  actions: {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '16px',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
  },
  sender: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr auto',
    columnGap: '12px',
    alignItems: 'start',
  },
  senderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  addressLine: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-word',
  },
  addressLabel: {
    color: tokens.colorNeutralForeground3,
    marginRight: '4px',
  },
  date: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  badges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px',
  },
  viewBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tabs: {
    flex: 1,
    minWidth: 0,
    overflowX: 'auto',
  },
  widthToggle: {
    display: 'flex',
    gap: '2px',
  },
  plainText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  codeWrap: {
    position: 'relative',
  },
  code: {
    margin: 0,
    padding: '12px 14px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    maxHeight: '70vh',
    overflow: 'auto',
  },
  copyCode: {
    position: 'absolute',
    top: '6px',
    right: '18px',
  },
  truncated: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    color: tokens.colorNeutralForeground3,
  },
  headers: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: tokens.fontSizeBase200,
    '& td': {
      padding: '5px 8px',
      verticalAlign: 'top',
      borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
      wordBreak: 'break-word',
    },
    '& td:first-child': {
      width: '1%',
      whiteSpace: 'nowrap',
      fontWeight: tokens.fontWeightSemibold,
      color: tokens.colorNeutralForeground2,
    },
  },
  muted: {
    color: tokens.colorNeutralForeground3,
  },
})

interface Props {
  message: MailMessage
  unread: boolean
  showBack: boolean
  onBack: () => void
  onDelete: (message: MailMessage) => void
  onToggleRead: (message: MailMessage) => void
  notify: (text: string, intent?: 'success' | 'error' | 'info') => void
}

export function ReadingPane({ message, unread, showBack, onBack, onDelete, onToggleRead, notify }: Props) {
  const styles = useStyles()
  const [view, setView] = useState<View>('message')
  const [width, setWidth] = useState<PreviewWidth>('desktop')

  const views = useMemo(() => {
    const list: { value: View; label: string }[] = [{ value: 'message', label: 'Mensagem' }]
    if (message.text) list.push({ value: 'text', label: 'Texto' })
    if (message.htmlSource) list.push({ value: 'html', label: 'HTML' })
    if (message.headers.length) list.push({ value: 'headers', label: 'Cabeçalhos' })
    if (message.raw) list.push({ value: 'source', label: 'Fonte (MIME)' })
    if (message.template) list.push({ value: 'template', label: 'Dados do template' })
    list.push({ value: 'json', label: 'JSON do SES' })
    return list
  }, [message])

  // Mantém a aba escolhida ao trocar de mensagem, se ela existir na nova.
  useEffect(() => {
    if (!views.some((v) => v.value === view)) setView('message')
  }, [views, view])

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(`${label} copiado para a área de transferência`, 'success')
    } catch {
      notify('Não foi possível copiar', 'error')
    }
  }

  const sesJson = useMemo(() => {
    const { RawData, ...rest } = message.original
    const json = RawData == null ? rest : { ...rest, RawData: truncate(RawData, 2000) }
    return JSON.stringify(json, null, 2)
  }, [message])

  const sender = displayName(message.from)

  return (
    <div className={styles.root}>
      <div className={styles.subjectRow}>
        {showBack && (
          <Button appearance="subtle" icon={<ArrowLeft20Regular />} onClick={onBack} aria-label="Voltar para a lista" />
        )}
        <Text as="h1" size={500} weight="semibold" className={styles.subject}>
          {message.subject || '(sem assunto)'}
        </Text>
        <div className={styles.actions}>
          <Tooltip content={unread ? 'Marcar como lida' : 'Marcar como não lida'} relationship="label">
            <Button
              appearance="subtle"
              icon={unread ? <MailRead20Regular /> : <MailUnread20Regular />}
              onClick={() => onToggleRead(message)}
            />
          </Tooltip>
          <Tooltip content="Baixar .eml (abre no Outlook)" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowDownload20Regular />}
              onClick={() => downloadBlob(new Blob([toEml(message)], { type: 'message/rfc822' }), emlFilename(message))}
            />
          </Tooltip>
          <Tooltip content="Excluir" relationship="label">
            <Button appearance="subtle" icon={<Delete20Regular />} onClick={() => onDelete(message)} />
          </Tooltip>
          <Menu positioning="below-end">
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content="Mais ações" relationship="label">
                <Button appearance="subtle" icon={<MoreHorizontal20Regular />} />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<Copy20Regular />} onClick={() => copy(message.id, 'ID da mensagem')}>
                  Copiar ID da mensagem
                </MenuItem>
                <MenuItem icon={<Copy20Regular />} onClick={() => copy(message.subject, 'Assunto')}>
                  Copiar assunto
                </MenuItem>
                {message.htmlSource && (
                  <MenuItem icon={<Code20Regular />} onClick={() => copy(message.htmlSource!, 'HTML')}>
                    Copiar HTML
                  </MenuItem>
                )}
                <MenuDivider />
                <MenuItem icon={<Copy20Regular />} onClick={() => copy(JSON.stringify(message.original, null, 2), 'JSON')}>
                  Copiar JSON completo do SES
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sender}>
          <Avatar name={sender} color="colorful" idForColor={sender} size={40} />
          <div className={styles.senderInfo}>
            <Text weight="semibold">
              {sender}
              {message.from.name && <span className={styles.muted}> &lt;{message.from.address}&gt;</span>}
            </Text>
            <AddressLine label="Para:" value={formatAddressList(message.to)} />
            <AddressLine label="Cc:" value={formatAddressList(message.cc)} />
            <AddressLine label="Cco:" value={formatAddressList(message.bcc)} />
            <AddressLine label="Responder para:" value={formatAddressList(message.replyTo)} />
            <div className={styles.badges}>
              <Badge appearance="tint" color="brand" size="small">
                {KIND_LABEL[message.kind]}
              </Badge>
              <Badge appearance="tint" color="informative" size="small">
                {message.region}
              </Badge>
              {message.template && (
                <Badge appearance="tint" color="important" size="small">
                  template: {message.template.name}
                </Badge>
              )}
              <Badge appearance="tint" color="informative" size="small">
                {formatBytes(message.size)}
              </Badge>
            </div>
          </div>
          <Caption1 className={styles.date}>{formatLongDate(message.date)}</Caption1>
        </div>

        {message.template &&
          (message.template.error ? (
            <MessageBar intent="warning">
              <MessageBarBody>
                <MessageBarTitle>Template não renderizado</MessageBarTitle>
                {message.template.error}
              </MessageBarBody>
            </MessageBar>
          ) : (
            <MessageBar intent="info">
              <MessageBarBody>
                Renderizado com a versão <strong>atual</strong> do template "{message.template.name}" no LocalStack. O
                SES guarda apenas o nome e os dados enviados.
              </MessageBarBody>
            </MessageBar>
          ))}

        {message.attachments.length > 0 && <Attachments attachments={message.attachments} />}

        <div className={styles.viewBar}>
          <TabList
            size="small"
            selectedValue={view}
            onTabSelect={(_, data) => setView(data.value as View)}
            className={styles.tabs}
          >
            {views.map((v) => (
              <Tab key={v.value} value={v.value}>
                {v.label}
              </Tab>
            ))}
          </TabList>
          {view === 'message' && message.html && (
            <div className={styles.widthToggle} role="group" aria-label="Largura da visualização">
              <Tooltip content="Visualização desktop" relationship="label">
                <ToggleButton
                  size="small"
                  appearance="subtle"
                  checked={width === 'desktop'}
                  icon={<Desktop20Regular />}
                  onClick={() => setWidth('desktop')}
                />
              </Tooltip>
              <Tooltip content="Visualização mobile (375px)" relationship="label">
                <ToggleButton
                  size="small"
                  appearance="subtle"
                  checked={width === 'mobile'}
                  icon={<Phone20Regular />}
                  onClick={() => setWidth('mobile')}
                />
              </Tooltip>
            </div>
          )}
        </div>

        <div>
          {view === 'message' &&
            (message.html ? (
              <EmailFrame html={message.html} width={width} />
            ) : (
              <pre className={styles.plainText}>{message.text || '(mensagem sem corpo)'}</pre>
            ))}
          {view === 'text' && <pre className={styles.plainText}>{message.text}</pre>}
          {view === 'html' && <Code value={message.htmlSource ?? ''} onCopy={() => copy(message.htmlSource ?? '', 'HTML')} />}
          {view === 'source' && <Code value={message.raw ?? ''} onCopy={() => copy(message.raw ?? '', 'Fonte MIME')} />}
          {view === 'template' && message.template && (
            <Code value={prettyJson(message.template.data)} onCopy={() => copy(message.template!.data, 'TemplateData')} />
          )}
          {view === 'json' && <Code value={sesJson} onCopy={() => copy(JSON.stringify(message.original, null, 2), 'JSON')} />}
          {view === 'headers' && (
            <table className={styles.headers}>
              <tbody>
                {message.headers.map((h, i) => (
                  <tr key={i}>
                    <td>{h.key}</td>
                    <td>{h.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function AddressLine({ label, value }: { label: string; value: string }) {
  const styles = useStyles()
  if (!value) return null
  return (
    <span className={styles.addressLine}>
      <span className={styles.addressLabel}>{label}</span>
      {value}
    </span>
  )
}

function Code({ value, onCopy }: { value: string; onCopy: () => void }): ReactNode {
  const styles = useStyles()
  const [expanded, setExpanded] = useState(false)
  useEffect(() => setExpanded(false), [value])
  const isLong = value.length > SOURCE_PREVIEW_LIMIT
  const shown = isLong && !expanded ? value.slice(0, SOURCE_PREVIEW_LIMIT) : value

  return (
    <div className={styles.codeWrap}>
      <pre className={styles.code}>{shown}</pre>
      <Tooltip content="Copiar" relationship="label">
        <Button className={styles.copyCode} size="small" appearance="subtle" icon={<Copy16Regular />} onClick={onCopy} />
      </Tooltip>
      {isLong && !expanded && (
        <div className={styles.truncated}>
          <Body1>
            Exibindo {formatBytes(SOURCE_PREVIEW_LIMIT)} de {formatBytes(value.length)}.
          </Body1>
          <Button size="small" onClick={() => setExpanded(true)}>
            Mostrar tudo
          </Button>
        </div>
      )}
    </div>
  )
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}… [+${value.length - max} caracteres]` : value
}

function prettyJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}
