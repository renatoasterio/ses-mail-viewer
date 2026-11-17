import { Button, Caption1, makeStyles, Text, tokens, Tooltip } from '@fluentui/react-components'
import {
  ArrowDownload16Regular,
  Document24Regular,
  DocumentPdf24Regular,
  DocumentTable24Regular,
  FolderZip24Regular,
  Image24Regular,
  Mail24Regular,
  Code24Regular,
} from '@fluentui/react-icons'
import { downloadBlob, openBlob } from '../lib/download'
import { formatBytes } from '../lib/format'
import type { MailAttachment } from '../lib/model'
import { base64ToBlob } from '../lib/parse'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  list: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '232px',
    maxWidth: '100%',
    padding: '6px 4px 6px 8px',
    boxSizing: 'border-box',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      border: `1px solid ${tokens.colorNeutralStroke1Hover}`,
    },
  },
  open: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: 'none',
    background: 'none',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
  },
  thumb: {
    width: '32px',
    height: '32px',
    flexShrink: 0,
    objectFit: 'cover',
    borderRadius: tokens.borderRadiusSmall,
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  size: {
    color: tokens.colorNeutralForeground3,
  },
  pdf: { color: tokens.colorPaletteRedForeground1 },
  image: { color: tokens.colorPaletteBerryForeground1 },
  sheet: { color: tokens.colorPaletteGreenForeground1 },
  generic: { color: tokens.colorBrandForeground1 },
})

/**
 * Tipos que o navegador exibe numa nova aba sem executar código. SVG e HTML
 * ficam de fora porque rodariam scripts na origem do visualizador.
 */
const PREVIEWABLE = /^(image\/(png|jpe?g|gif|webp|bmp|avif)|application\/pdf|text\/plain|audio\/|video\/)/

function useIcon(mimeType: string) {
  const styles = useStyles()
  if (mimeType === 'application/pdf') return <DocumentPdf24Regular className={styles.pdf} />
  if (mimeType.startsWith('image/')) return <Image24Regular className={styles.image} />
  if (/sheet|excel|csv/.test(mimeType)) return <DocumentTable24Regular className={styles.sheet} />
  if (/zip|compressed|tar|gzip/.test(mimeType)) return <FolderZip24Regular className={styles.generic} />
  if (mimeType === 'message/rfc822') return <Mail24Regular className={styles.generic} />
  if (/json|xml|html|javascript/.test(mimeType)) return <Code24Regular className={styles.generic} />
  return <Document24Regular className={styles.generic} />
}

export function Attachments({ attachments }: { attachments: MailAttachment[] }) {
  const styles = useStyles()
  const total = attachments.reduce((sum, a) => sum + a.size, 0)
  return (
    <div className={styles.root}>
      <Caption1 className={styles.size}>
        {attachments.length} {attachments.length === 1 ? 'anexo' : 'anexos'} ({formatBytes(total)})
      </Caption1>
      <div className={styles.list}>
        {attachments.map((a) => (
          <AttachmentCard key={a.key} attachment={a} />
        ))}
      </div>
    </div>
  )
}

function AttachmentCard({ attachment }: { attachment: MailAttachment }) {
  const styles = useStyles()
  const icon = useIcon(attachment.mimeType)
  const blob = () => base64ToBlob(attachment.base64, attachment.mimeType)
  const download = () => downloadBlob(blob(), attachment.filename)
  const open = () => (PREVIEWABLE.test(attachment.mimeType) ? openBlob(blob()) : download())
  const isImage = attachment.mimeType.startsWith('image/')

  return (
    <div className={styles.card}>
      <Tooltip content={`${attachment.filename} · ${attachment.mimeType}`} relationship="description">
        <button type="button" className={styles.open} onClick={open}>
          {isImage ? (
            <img className={styles.thumb} alt="" src={`data:${attachment.mimeType};base64,${attachment.base64}`} />
          ) : (
            icon
          )}
          <span className={styles.meta}>
            <Text size={200} weight="semibold" className={styles.name}>
              {attachment.filename}
            </Text>
            <Caption1 className={styles.size}>{formatBytes(attachment.size)}</Caption1>
          </span>
        </button>
      </Tooltip>
      <Tooltip content="Baixar" relationship="label">
        <Button appearance="subtle" size="small" icon={<ArrowDownload16Regular />} onClick={download} />
      </Tooltip>
    </div>
  )
}
