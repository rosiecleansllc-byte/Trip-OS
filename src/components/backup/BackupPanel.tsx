import { useRef, useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import {
  backupFileName,
  createBackup,
  describeBackup,
  parseBackup,
  restoreBackup,
  type RestoreResult,
} from '../../lib/backup'

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; what: 'export' | 'restore' }
  | { kind: 'exported'; sizeLabel: string; docs: number; images: number }
  | { kind: 'restored'; result: RestoreResult }
  | { kind: 'error'; message: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Trip OS keeps everything in this browser's own storage, and iOS hands a
// Home Screen app a separate storage container from Safari — so an
// installed copy starts empty no matter what the manifest says. This is
// the bridge: export a file from the browser that has the data, open the
// installed app, import it there.
export function BackupPanel() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInput = useRef<HTMLInputElement>(null)
  const busy = status.kind === 'working'

  const handleExport = async () => {
    setStatus({ kind: 'working', what: 'export' })
    try {
      const backup = await createBackup()
      const json = JSON.stringify(backup)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = backupFileName()
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Revoked on a timer rather than immediately: iOS Safari hands the
      // blob to the share sheet asynchronously and a synchronous revoke
      // can cancel the save before it starts.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setStatus({
        kind: 'exported',
        sizeLabel: formatBytes(blob.size),
        docs: backup.privateDocs.length,
        images: backup.visualBoardImages.length,
      })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Export failed.' })
    }
  }

  const handleFile = async (file: File) => {
    setStatus({ kind: 'working', what: 'restore' })
    try {
      const backup = parseBackup(await file.text())
      const contents = describeBackup(backup)
      if (!contents.hasAppState && contents.privateDocs === 0 && contents.visualBoardImages === 0) {
        throw new Error('That backup is empty.')
      }
      const result = await restoreBackup(backup)
      setStatus({ kind: 'restored', result })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Restore failed.' })
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm font-medium text-ink">Backup &amp; restore</p>
      <p className="mt-1 text-xs text-ink-soft">
        Your trip data is saved on this device only. Adding Trip OS to the Home Screen gives it separate storage from
        Safari, so move your data across with a backup file.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-blue py-2.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy && status.what === 'export' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Export
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line py-2.5 text-xs font-medium text-blue disabled:opacity-50"
        >
          {busy && status.what === 'restore' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Restore
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />

      {status.kind === 'exported' && (
        <p className="mt-2.5 text-xs text-ink-soft">
          Saved {status.sizeLabel} — settings, {status.docs} document{status.docs === 1 ? '' : 's'} and {status.images}{' '}
          photo{status.images === 1 ? '' : 's'}.
        </p>
      )}

      {status.kind === 'restored' && (
        <p className="mt-2.5 text-xs text-ink-soft">
          Restored {status.result.addedDocs} document{status.result.addedDocs === 1 ? '' : 's'} and{' '}
          {status.result.addedImages} photo{status.result.addedImages === 1 ? '' : 's'}.
          {status.result.skippedExisting > 0
            ? ` ${status.result.skippedExisting} item${status.result.skippedExisting === 1 ? '' : 's'} already on this device were left as they are.`
            : ''}{' '}
          Reload to see everything.
        </p>
      )}

      {status.kind === 'error' && <p className="mt-2.5 text-xs text-red">{status.message}</p>}

      <p className="mt-2.5 text-[11px] text-gray">
        Restoring only adds what's missing — nothing already on this device is overwritten or deleted.
      </p>
    </div>
  )
}
