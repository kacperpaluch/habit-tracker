import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, TestTube, Upload, Download, Trash2, Plus, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi, backupApi } from '../api/settings'
import { categoriesApi } from '../api/categories'
import type { Category } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'

const TIMEZONES = [
  'UTC', 'Europe/Warsaw', 'Europe/London', 'Europe/Berlin', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
]

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const { data: backups = [] } = useQuery({ queryKey: ['backups'], queryFn: backupApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const [form, setForm] = useState({
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '',
    smtp_tls: true, smtp_from: '', notification_email: '',
    backup_enabled: true, backup_retention: 10, backup_cron: '0 4 * * *',
    daily_summary_time: '08:00', daily_summary_enabled: false,
    timezone: 'UTC', current_password: '', new_password: '', new_password2: '',
  })
  const [catForm, setCatForm] = useState({ name: '', color: '#6366f1' })
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null)
  const [confirmDeleteBk, setConfirmDeleteBk] = useState<string | null>(null)
  const [confirmRestoreBk, setConfirmRestoreBk] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setForm(f => ({
        ...f,
        smtp_host: settings.smtp_host, smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user, smtp_tls: settings.smtp_tls,
        smtp_from: settings.smtp_from, notification_email: settings.notification_email,
        backup_enabled: settings.backup_enabled, backup_retention: settings.backup_retention,
        backup_cron: settings.backup_cron, daily_summary_time: settings.daily_summary_time,
        daily_summary_enabled: settings.daily_summary_enabled, timezone: settings.timezone,
      }))
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => settingsApi.update(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Zapisano!') },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Błąd'),
  })

  const testEmailMutation = useMutation({
    mutationFn: settingsApi.testEmail,
    onSuccess: () => toast.success('E-mail testowy wysłany!'),
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Błąd SMTP'),
  })

  const deleteBkMutation = useMutation({
    mutationFn: backupApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backups'] }); setConfirmDeleteBk(null) },
  })

  const restoreServerMutation = useMutation({
    mutationFn: backupApi.restoreFromServer,
    onSuccess: () => { qc.invalidateQueries(); toast.success('Backup przywrócony! Odśwież stronę.'); setConfirmRestoreBk(null) },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Błąd przywracania'),
  })

  const createDbBkMutation = useMutation({
    mutationFn: backupApi.createDbBackup,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['backups'] }); toast.success(`Backup utworzony: ${r.filename}`) },
    onError: () => toast.error('Błąd tworzenia backupu'),
  })

  const createCatMutation = useMutation({
    mutationFn: () => editingCat
      ? categoriesApi.update(editingCat.id, catForm)
      : categoriesApi.create(catForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['habits'] })
      setCatForm({ name: '', color: '#6366f1' })
      setEditingCat(null)
      toast.success(editingCat ? 'Kategoria zaktualizowana' : 'Kategoria dodana')
    },
  })

  const deleteCatMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['habits'] })
      setConfirmDeleteCat(null)
    },
  })

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password && form.new_password !== form.new_password2) {
      toast.error('Hasła nie są zgodne')
      return
    }
    updateMutation.mutate(form)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    backupApi.import(file).then(() => {
      qc.invalidateQueries()
      toast.success('Import zakończony pomyślnie!')
    }).catch(() => toast.error('Błąd importu'))
    e.target.value = ''
  }

  const handleRestoreDb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Wczytać plik „' + file.name + '" i natychmiast przywrócić bazę danych?\nBieżące dane zostaną nadpisane.')) {
      e.target.value = ''
      return
    }
    backupApi.restoreDb(file).then(() => {
      qc.invalidateQueries()
      toast.success('Baza przywrócona! Odśwież stronę.')
    }).catch(() => toast.error('Błąd przywracania pliku .db'))
    e.target.value = ''
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Ustawienia</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SMTP */}
        <section className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 p-6 space-y-4">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Powiadomienia e-mail (SMTP)</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Serwer SMTP</label>
              <input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} className="input" placeholder="smtp.example.com" />
            </div>
            <div>
              <label className="label">Port</label>
              <input type="number" value={form.smtp_port} onChange={e => set('smtp_port', parseInt(e.target.value))} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Użytkownik</label>
              <input value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Hasło SMTP</label>
              <input type="password" value={form.smtp_password} onChange={e => set('smtp_password', e.target.value)} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Adres nadawcy</label>
              <input value={form.smtp_from} onChange={e => set('smtp_from', e.target.value)} className="input" placeholder="no-reply@example.com" />
            </div>
            <div>
              <label className="label">Adres docelowy</label>
              <input type="email" value={form.notification_email} onChange={e => set('notification_email', e.target.value)} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.smtp_tls} onChange={e => set('smtp_tls', e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
              <span className="text-sm text-stone-700 dark:text-stone-300">Użyj TLS/SSL</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.daily_summary_enabled} onChange={e => set('daily_summary_enabled', e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
              <span className="text-sm text-stone-700 dark:text-stone-300">Dzienne podsumowanie</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Godzina podsumowania</label>
              <input type="time" value={form.daily_summary_time} onChange={e => set('daily_summary_time', e.target.value)} className="input" />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => testEmailMutation.mutate()}
                disabled={testEmailMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 border border-warm-200 dark:border-warm-800 rounded-xl text-sm hover:bg-warm-50 dark:hover:bg-warm-800 text-stone-700 dark:text-stone-300"
              >
                <TestTube size={15} />
                Wyślij testowy e-mail
              </button>
            </div>
          </div>
        </section>

        {/* General */}
        <section className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 p-6 space-y-4">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Ogólne</h2>
          <div>
            <label className="label">Strefa czasowa</label>
            <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className="input">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </section>

        {/* Password */}
        <section className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 p-6 space-y-4">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Zmiana hasła</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Aktualne hasło</label>
              <input type="password" value={form.current_password} onChange={e => set('current_password', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Nowe hasło</label>
              <input type="password" value={form.new_password} onChange={e => set('new_password', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Powtórz hasło</label>
              <input type="password" value={form.new_password2} onChange={e => set('new_password2', e.target.value)} className="input" />
            </div>
          </div>
        </section>

        {/* Backup */}
        <section className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 p-6 space-y-4">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Backup</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.backup_enabled} onChange={e => set('backup_enabled', e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
              <span className="text-sm text-stone-700 dark:text-stone-300">Automatyczny backup</span>
            </label>
            <div>
              <label className="label">Zachowaj ostatnich N backupów</label>
              <input type="number" min="1" value={form.backup_retention} onChange={e => set('backup_retention', parseInt(e.target.value))} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Harmonogram (cron)</label>
            <input value={form.backup_cron} onChange={e => set('backup_cron', e.target.value)} className="input font-mono" placeholder="0 4 * * *" />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={() => createDbBkMutation.mutate()} disabled={createDbBkMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm">
              <Download size={15} /> Utwórz backup .db
            </button>
            <button type="button" onClick={backupApi.export} className="flex items-center gap-2 px-4 py-2 border border-warm-200 dark:border-warm-800 rounded-xl text-sm hover:bg-warm-50 dark:hover:bg-warm-800 text-stone-700 dark:text-stone-300">
              <Download size={15} /> Eksportuj dane (JSON)
            </button>
            <label className="flex items-center gap-2 px-4 py-2 border border-warm-200 dark:border-warm-800 rounded-xl text-sm hover:bg-warm-50 dark:hover:bg-warm-800 text-stone-700 dark:text-stone-300 cursor-pointer">
              <Upload size={15} /> Importuj JSON
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <label className="flex items-center gap-2 px-4 py-2 border border-warm-200 dark:border-warm-800 rounded-xl text-sm hover:bg-warm-50 dark:hover:bg-warm-800 text-stone-700 dark:text-stone-300 cursor-pointer">
              <Upload size={15} /> Wczytaj plik .db z dysku
              <input type="file" accept=".db" className="hidden" onChange={handleRestoreDb} />
            </label>
          </div>

          {backups.length > 0 && (
            <div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Zapisane backupy</p>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {backups.map(b => (
                  <div key={b.filename} className="flex items-center justify-between px-3 py-2 bg-warm-50 dark:bg-warm-800 rounded-lg text-xs">
                    <span className="text-stone-700 dark:text-stone-300 font-mono truncate">{b.filename}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-stone-400 dark:text-stone-500">{(b.size / 1024).toFixed(1)} KB</span>
                      <button
                        type="button"
                        title="Pobierz"
                        onClick={() => backupApi.download(b.filename)}
                        className="text-primary-500 hover:text-primary-600"
                      >
                        <Download size={12} />
                      </button>
                      {b.filename.endsWith('.db') && (
                        <button
                          type="button"
                          title="Przywróć"
                          onClick={() => setConfirmRestoreBk(b.filename)}
                          className="text-amber-500 hover:text-amber-600"
                          disabled={restoreServerMutation.isPending}
                        >
                          <Upload size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Usuń"
                        onClick={() => setConfirmDeleteBk(b.filename)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors disabled:opacity-60"
          >
            <Save size={16} />
            {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz ustawienia'}
          </button>
        </div>
      </form>

      {/* Categories */}
      <section className="bg-white dark:bg-warm-900 rounded-2xl border border-warm-200 dark:border-warm-800 p-6 space-y-4">
        <h2 className="font-semibold text-stone-900 dark:text-stone-100">Kategorie</h2>

        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-warm-50 dark:bg-warm-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{c.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditingCat(c); setCatForm({ name: c.name, color: c.color }) }}
                  className="p-1.5 text-stone-400 hover:text-primary-600 rounded"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setConfirmDeleteCat(c)}
                  className="p-1.5 text-stone-400 hover:text-red-600 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-3 pt-2 border-t border-warm-200 dark:border-warm-800">
          <div className="flex-1">
            <label className="label">Nazwa</label>
            <input
              value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              className="input"
              placeholder="np. Zdrowie"
            />
          </div>
          <div>
            <label className="label">Kolor</label>
            <input
              type="color"
              value={catForm.color}
              onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
              className="h-10 w-14 rounded-lg border border-warm-200 dark:border-warm-800 cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            {editingCat && (
              <button
                type="button"
                onClick={() => { setEditingCat(null); setCatForm({ name: '', color: '#6366f1' }) }}
                className="px-3 py-2.5 border border-warm-200 dark:border-warm-800 rounded-xl text-stone-500 hover:bg-warm-50 dark:hover:bg-warm-800"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              disabled={!catForm.name}
              onClick={() => createCatMutation.mutate()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {editingCat ? <Save size={14} /> : <Plus size={14} />}
              {editingCat ? 'Zapisz' : 'Dodaj'}
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDeleteCat !== null}
        title="Usuń kategorię"
        message={`Czy na pewno chcesz usunąć kategorię "${confirmDeleteCat?.name}"? Nawyki z tej kategorii nie zostaną usunięte — stracą tylko przypisanie.`}
        confirmLabel="Usuń"
        danger
        onConfirm={() => confirmDeleteCat && deleteCatMutation.mutate(confirmDeleteCat.id)}
        onCancel={() => setConfirmDeleteCat(null)}
      />

      <ConfirmDialog
        open={confirmDeleteBk !== null}
        title="Usuń backup"
        message={`Czy na pewno chcesz usunąć plik "${confirmDeleteBk}"? Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń"
        danger
        onConfirm={() => confirmDeleteBk && deleteBkMutation.mutate(confirmDeleteBk)}
        onCancel={() => setConfirmDeleteBk(null)}
      />

      <ConfirmDialog
        open={confirmRestoreBk !== null}
        title="Przywróć backup"
        message={`Czy na pewno chcesz przywrócić backup "${confirmRestoreBk}"? Wszystkie bieżące dane zostaną nadpisane.`}
        confirmLabel="Przywróć"
        danger
        onConfirm={() => confirmRestoreBk && restoreServerMutation.mutate(confirmRestoreBk)}
        onCancel={() => setConfirmRestoreBk(null)}
      />
    </div>
  )
}
