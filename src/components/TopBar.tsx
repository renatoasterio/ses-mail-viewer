import type { Ref } from 'react'
import {
  Button,
  Caption1,
  Divider,
  Field,
  makeStyles,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  SearchBox,
  Select,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import { Mail24Filled, Settings20Regular, WeatherMoon20Regular, WeatherSunny20Regular } from '@fluentui/react-icons'

export const POLL_OPTIONS = [
  { value: 0, label: 'Desativada' },
  { value: 2000, label: 'A cada 2 segundos' },
  { value: 5000, label: 'A cada 5 segundos' },
  { value: 10000, label: 'A cada 10 segundos' },
  { value: 30000, label: 'A cada 30 segundos' },
]

const SHORTCUTS: [string, string][] = [
  ['↑ / ↓  ou  K / J', 'Mensagem anterior / próxima'],
  ['Delete', 'Excluir mensagem'],
  ['U', 'Alternar lida / não lida'],
  ['R', 'Atualizar agora'],
  ['/', 'Pesquisar'],
  ['Esc', 'Limpar pesquisa'],
]

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 600px) minmax(0, 1fr)',
    alignItems: 'center',
    gap: '12px',
    height: '48px',
    padding: '0 8px 0 12px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    '@media (max-width: 760px)': {
      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    },
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexShrink: 0,
  },
  brandText: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    '@media (max-width: 760px)': { display: 'none' },
  },
  brandSub: {
    color: 'rgba(255,255,255,0.8)',
  },
  search: {
    width: '100%',
    maxWidth: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '2px',
  },
  iconButton: {
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': {
      color: tokens.colorNeutralForegroundOnBrand,
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    ':hover:active': {
      color: tokens.colorNeutralForegroundOnBrand,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
  },
  settings: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '300px',
  },
  shortcuts: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: '12px',
    rowGap: '6px',
    alignItems: 'center',
  },
  muted: {
    color: tokens.colorNeutralForeground3,
    wordBreak: 'break-all',
  },
  kbd: {
    justifySelf: 'start',
    padding: '1px 6px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderBottomWidth: '2px',
    backgroundColor: tokens.colorNeutralBackground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    whiteSpace: 'nowrap',
  },
})

interface Props {
  search: string
  onSearchChange: (value: string) => void
  searchRef: Ref<HTMLInputElement>
  dark: boolean
  onToggleTheme: () => void
  pollInterval: number
  onPollIntervalChange: (value: number) => void
  endpoint?: string
}

export function TopBar(props: Props) {
  const styles = useStyles()
  const { search, onSearchChange, searchRef, dark, onToggleTheme, pollInterval, onPollIntervalChange, endpoint } = props

  return (
    <header className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <Mail24Filled />
        </span>
        <span className={styles.brandText}>
          <Text weight="semibold" size={400}>
            SES Mail
          </Text>
          <Caption1 className={styles.brandSub}>LocalStack</Caption1>
        </span>
      </div>

      <SearchBox
        ref={searchRef}
        className={styles.search}
        appearance="filled-lighter"
        placeholder="Pesquisar por assunto, pessoas, conteúdo ou ID"
        value={search}
        onChange={(_, data) => onSearchChange(data.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onSearchChange('')
            e.currentTarget.blur()
          }
        }}
      />

      <div className={styles.actions}>
        <Tooltip content={dark ? 'Tema claro' : 'Tema escuro'} relationship="label">
          <Button
            appearance="transparent"
            className={styles.iconButton}
            icon={dark ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
            onClick={onToggleTheme}
          />
        </Tooltip>
        <Popover positioning="below-end" withArrow>
          <PopoverTrigger disableButtonEnhancement>
            <Tooltip content="Configurações" relationship="label">
              <Button appearance="transparent" className={styles.iconButton} icon={<Settings20Regular />} />
            </Tooltip>
          </PopoverTrigger>
          <PopoverSurface>
            <div className={styles.settings}>
              <Text weight="semibold" size={400}>
                Configurações
              </Text>
              <Field label="Atualização automática">
                <Select
                  value={String(pollInterval)}
                  onChange={(_, data) => onPollIntervalChange(Number(data.value))}
                >
                  {POLL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {endpoint && (
                <Field label="Endpoint do LocalStack">
                  <Caption1 className={styles.muted}>{endpoint}</Caption1>
                  <Caption1 className={styles.muted}>
                    Altere com a variável LOCALSTACK_ENDPOINT ao iniciar o visualizador.
                  </Caption1>
                </Field>
              )}
              <Divider />
              <Text weight="semibold">Atalhos de teclado</Text>
              <div className={styles.shortcuts}>
                {SHORTCUTS.map(([keys, description]) => (
                  <ShortcutRow key={keys} keys={keys} description={description} />
                ))}
              </div>
            </div>
          </PopoverSurface>
        </Popover>
      </div>
    </header>
  )
}

function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  const styles = useStyles()
  return (
    <>
      <kbd className={styles.kbd}>{keys}</kbd>
      <Caption1>{description}</Caption1>
    </>
  )
}
