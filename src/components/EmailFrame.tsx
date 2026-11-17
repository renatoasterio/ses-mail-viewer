import { useEffect, useMemo, useRef, useState } from 'react'
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components'

export type PreviewWidth = 'desktop' | 'mobile'

const MOBILE_WIDTH = 375
const MIN_HEIGHT = 120

/** Injetado no <head> do e-mail: links em nova aba e nenhum script executa. */
const HEAD_INJECTION = [
  '<meta charset="utf-8">',
  '<base target="_blank">',
  `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; frame-src 'none'">`,
  // :where() tem especificidade zero, então qualquer estilo do e-mail prevalece.
  `<style>:where(html){background:#fff;color:#242424;color-scheme:light}:where(body){font-family:"Segoe UI","Segoe UI Web (West European)",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",sans-serif;font-size:14px;line-height:1.45}</style>`,
].join('')

function buildSrcDoc(html: string): string {
  if (/<head[\s>]/i.test(html)) return html.replace(/<head(\s[^>]*)?>/i, (m) => m + HEAD_INJECTION)
  if (/<html[\s>]/i.test(html)) return html.replace(/<html(\s[^>]*)?>/i, (m) => `${m}<head>${HEAD_INJECTION}</head>`)
  return `<!doctype html><html><head>${HEAD_INJECTION}</head><body>${html}</body></html>`
}

const useStyles = makeStyles({
  stage: {
    display: 'flex',
    justifyContent: 'center',
  },
  mobileStage: {
    padding: '24px 0',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusLarge,
  },
  frame: {
    display: 'block',
    width: '100%',
    border: 'none',
    backgroundColor: '#fff',
  },
  mobileFrame: {
    width: `${MOBILE_WIDTH}px`,
    maxWidth: '100%',
    borderRadius: '20px',
    boxShadow: tokens.shadow16,
    outline: `8px solid ${tokens.colorNeutralForeground1}`,
  },
})

interface Props {
  html: string
  width: PreviewWidth
}

/**
 * Renderiza o HTML do e-mail num iframe isolado. `allow-same-origin` sem
 * `allow-scripts` permite medir a altura do conteúdo sem executar código do e-mail.
 */
export function EmailFrame({ html, width }: Props) {
  const styles = useStyles()
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(MIN_HEIGHT)
  const srcDoc = useMemo(() => buildSrcDoc(html), [html])

  useEffect(() => {
    const iframe = ref.current
    if (!iframe) return
    setHeight(MIN_HEIGHT)

    let observer: ResizeObserver | undefined
    const attach = () => {
      const doc = iframe.contentDocument
      if (!doc?.documentElement) return
      const measure = () => setHeight(Math.max(MIN_HEIGHT, doc.documentElement.scrollHeight))
      measure()
      observer?.disconnect()
      observer = new ResizeObserver(measure)
      observer.observe(doc.documentElement)
      if (doc.body) observer.observe(doc.body)
      doc.querySelectorAll('img').forEach((img) => img.addEventListener('load', measure, { once: true }))
    }

    iframe.addEventListener('load', attach)
    if (iframe.contentDocument?.readyState === 'complete') attach()
    return () => {
      iframe.removeEventListener('load', attach)
      observer?.disconnect()
    }
  }, [srcDoc, width])

  const mobile = width === 'mobile'
  return (
    <div className={mergeClasses(styles.stage, mobile && styles.mobileStage)}>
      <iframe
        // força um novo documento ao trocar a largura para recalcular a altura
        key={width}
        ref={ref}
        title="Conteúdo do e-mail"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={srcDoc}
        className={mergeClasses(styles.frame, mobile && styles.mobileFrame)}
        style={{ height }}
      />
    </div>
  )
}
