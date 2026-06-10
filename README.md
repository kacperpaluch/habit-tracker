# Habit Tracker

[![Docker Hub](https://img.shields.io/docker/pulls/kpa90/habit-tracker?logo=docker)](https://hub.docker.com/r/kpa90/habit-tracker)

Self-hostowana aplikacja do śledzenia nawyków dla jednego użytkownika. Działa w pojedynczym kontenerze Docker, dane przechowuje lokalnie w SQLite.

## Funkcje

- **Cztery tryby nawyków** — tak/nie, ilościowy (cel liczbowy z inkrementalnym dodawaniem), czasowy (cel w minutach z wbudowanym stoperem) i negatywny (rzucanie)
- **Nawyki negatywne (rzucanie)** — "nie palę", "zero cukru": dzień bez wpadki liczy się automatycznie jako sukces, oznaczasz tylko złamanie; streak czystych dni rośnie sam
- **Nawyki czasowe ze stoperem** — Start/Pauza/Zapisz w karcie nawyku; biegnący timer przeżywa odświeżenie strony (localStorage); minuty sumują się w ciągu dnia
- **Zaliczenie po osiągnięciu celu** — nawyk ilościowy/czasowy liczy się jako wykonany dopiero gdy wartość osiągnie cel (np. 10/10 pompek), nie przy pierwszym wpisie
- **Wnioski (insighty)** — analiza ostatnich 90 dni: najmocniejszy i najsłabszy dzień tygodnia, słabe dni per nawyk, korelacje par nawyków ("gdy robisz A, w X% robisz też B"), wykrywanie gasnących nawyków po spadku rytmu
- **Widok dzienny i tygodniowy** — przełącznik Dzień/Tydzień; siatka 7-dniowa do szybkiego backfillu
- **Elastyczny harmonogram** — codziennie, X razy w tygodniu, konkretne dni, X razy w miesiącu (rozłożone równomiernie)
- **Pauza/zamrożenie** — urlop lub choroba nie psuje streaka; opcjonalny przedział "od–do", a bez podanych dat pauza obowiązuje bezterminowo (dopóki włączona)
- **Uzupełnianie wstecz** — odznaczanie poprzednich dni z interfejsu; date picker do szybkiego skoku do daty
- **Notatki do wpisów** — adnotacja przy każdym wpisie: zarówno po wykonaniu nawyku, jak i przy pominięciu (np. "dlaczego dziś nie?")
- **Kategorie** z kolorem — grupowanie nawyków w widoku dziennym wg kategorii
- **Archiwum** — przenieś nieaktywny nawyk do archiwum (dane zostają, przestaje zaśmiecać widok); przywracanie jednym kliknięciem z poziomu Dziś lub Statystyk; pełne statystyki historyczne dostępne dla zarchiwizowanych nawyków bez konieczności przywracania
- **Usuwanie na stałe** — hard-delete nawyku wraz ze wszystkimi wpisami i notatkami (nieodwracalne)
- **Zmiana kolejności nawyków** — strzałki góra/dół w trybie edycji, kolejność zapisywana globalnie
- **Streaki** — aktualny i najdłuższy, per nawyk (uwzględnia wpisy wstecz przed datą tworzenia nawyku)
- **System rytmu (momentum)** — triangularna akumulacja punktów: każdy kolejny wykonany dzień dodaje coraz więcej (+1, +2, +3…), każde pominięcie odejmuje (-1, -2, -3…); widoczny na kartach i w tabeli
- **Trend rytmu** — wykres AreaChart historii momentum (30/90/180 dni) z linią zerową
- **Heatmapa** — widok aktywności rocznej (styl GitHub) z interaktywnym tooltipem; dla nawyków negatywnych pokazuje czyste dni
- **Statystyki** — % realizacji tygodniowej i miesięcznej, tabela porównawcza z kolumną rytmu; przełącznik Aktywne/Archiwum z pełnymi danymi dla obu widoków
- **Kalendarz** — widok miesięczny wykonanych/pominiętych/zapauzowanych dni; wpadki nawyków negatywnych oznaczone na czerwono
- **Powiadomienia e-mail** — dzienne podsumowanie przez SMTP
- **Backup/Eksport/Import** — automatyczny backup SQLite z retencją, eksport JSON
- **Tryb jasny/ciemny** — wg preferencji systemu lub ręczny przełącznik
- **Mobile-first** — duże przyciski dotykowe, responsywny layout

## Szybki start

### Gotowy obraz z Docker Hub (zalecane)

Obraz dostępny na [hub.docker.com/r/kpa90/habit-tracker](https://hub.docker.com/r/kpa90/habit-tracker).

```bash
docker run -d \
  -p 8000:8000 \
  -v habit-data:/data \
  -v habit-backups:/backups \
  -e ADMIN_PASSWORD=moje-haslo \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e TZ=Europe/Warsaw \
  kpa90/habit-tracker:latest
```

Lub przez Docker Compose:

```yaml
services:
  habit-tracker:
    image: kpa90/habit-tracker:latest
    ports:
      - "8000:8000"
    volumes:
      - habit-data:/data
      - habit-backups:/backups
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=zmień-mnie
      - SECRET_KEY=zmień-na-losowy-string
      - TZ=Europe/Warsaw
    restart: unless-stopped

volumes:
  habit-data:
  habit-backups:
```

### Budowanie ze źródeł

```bash
# Sklonuj repozytorium
git clone https://codeberg.org/kacperpaluch/habit-tracker
cd habit-tracker

# Skopiuj przykładowy plik konfiguracji
cp .env.example .env

# Uruchom (domyślne dane: admin / changeme)
docker compose up -d
```

Aplikacja będzie dostępna pod adresem **http://localhost:8000**

## Konfiguracja przez zmienne środowiskowe

| Zmienna | Domyślna | Opis |
|---------|----------|------|
| `ADMIN_USERNAME` | `admin` | Login użytkownika |
| `ADMIN_PASSWORD` | `changeme` | **Zmień przed wystawieniem publicznie!** |
| `SECRET_KEY` | losowy string | Klucz podpisywania tokenów JWT |
| `TZ` | `Europe/Warsaw` | Strefa czasowa (wpływa na harmonogram przypomnień) |
| `SMTP_HOST` | — | Serwer SMTP do e-maili |
| `SMTP_PORT` | `587` | Port SMTP (587 → STARTTLS, 465 → implicit TLS) |
| `SMTP_USER` | — | Login SMTP |
| `SMTP_PASSWORD` | — | Hasło SMTP |
| `SMTP_TLS` | `true` | Użyj TLS/SSL |
| `SMTP_FROM` | — | Adres nadawcy |
| `NOTIFICATION_EMAIL` | — | Adres docelowy przypomnień |
| `AUTH_DISABLED` | `false` | Wyłącz logowanie — **tylko lokalnie/dev!** |

Ustawienia SMTP można też zmienić w UI → Ustawienia.

## Uruchomienie przez `docker run`

```bash
docker run -d \
  -p 8000:8000 \
  -v habit-data:/data \
  -v habit-backups:/backups \
  -e ADMIN_PASSWORD=moje-haslo \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e TZ=Europe/Warsaw \
  habit-tracker
```

## Wolumeny Docker

| Wolumin | Ścieżka w kontenerze | Zawartość |
|---------|---------------------|-----------|
| `habit-data` | `/data` | Baza danych SQLite (`habits.db`) |
| `habit-backups` | `/backups` | Automatyczne backupy `.db` i eksporty `.json` |

## Architektura

```
habit-tracker/
├── backend/
│   └── app/
│       ├── main.py          # Punkt wejścia FastAPI, inicjalizacja DB
│       ├── models.py        # Modele SQLAlchemy (Habit, Category, Entry, Settings)
│       ├── schemas.py       # Pydantic schemas (walidacja request/response)
│       ├── database.py      # Konfiguracja SQLite, WAL mode
│       ├── auth.py          # JWT, bcrypt, middleware uwierzytelniania
│       ├── stats.py         # Logika streaków, heatmapy, completion rate
│       ├── scheduler.py     # APScheduler — backupy i e-maile
│       ├── email.py         # Wysyłka e-maili przez aiosmtplib
│       └── routers/
│           ├── auth.py      # POST /api/auth/login
│           ├── habits.py    # CRUD nawyków
│           ├── categories.py # CRUD kategorii
│           ├── entries.py   # Logowanie wykonania, inkrementacja
│           ├── stats.py     # Streaki, heatmapa, kalendarz, summary, all-habits
│           ├── settings.py  # Ustawienia SMTP, zmiana hasła
│           └── backup.py    # Eksport/import JSON, lista backupów
├── frontend/
│   └── src/
│       ├── App.tsx          # Routing między stronami, auth guard
│       ├── api/             # Axios clients dla każdego zasobu
│       ├── components/
│       │   ├── HabitCard.tsx    # Karta nawyku z odznaczeniem i polem notatki
│       │   ├── HabitForm.tsx    # Modal tworzenia/edycji nawyku (kategoria, harmonogram, pauza)
│       │   ├── Heatmap.tsx      # Heatmapa roczna z interaktywnym tooltipem
│       │   ├── DatePicker.tsx   # Kalendarz miesięczny do szybkiego wyboru daty
│       │   ├── ConfirmDialog.tsx # Modal potwierdzenia akcji (usuwanie, przywracanie)
│       │   └── Navbar.tsx       # Górna nawigacja
│       ├── hooks/
│       │   ├── useAuth.ts     # Zarządzanie tokenem JWT
│       │   └── useTheme.ts    # Przełącznik ciemny/jasny motyw
│       ├── pages/
│       │   ├── TodayPage.tsx     # Widok dzienny/tygodniowy — grupy wg kategorii
│       │   ├── StatsPage.tsx     # Statystyki i heatmapa
│       │   ├── CalendarPage.tsx  # Kalendarz miesięczny per nawyk
│       │   └── SettingsPage.tsx  # Ustawienia + kategorie + backup
│       └── types/index.ts   # TypeScript interfaces
├── Dockerfile               # Multi-stage: Node (build frontend) → Python 3.12
├── docker-compose.yml
└── .env.example
```

## Stack technologiczny

### Backend
- **Python 3.12** + **FastAPI 0.115** — REST API
- **SQLAlchemy 2.0** + **SQLite** — ORM, WAL mode dla lepszej współbieżności
- **APScheduler 3.10** — harmonogram backupów i e-maili
- **python-jose** — tokeny JWT (HS256, 7 dni ważności)
- **passlib + bcrypt** — hashowanie haseł
- **aiosmtplib** — asynchroniczne wysyłanie e-maili

### Frontend
- **React 18** + **TypeScript** + **Vite 6**
- **Tailwind CSS 3** — utility-first styling, dark mode przez klasę `.dark`
- **TanStack Query v5** — cache i synchronizacja stanu serwera
- **Recharts** — wykresy słupkowe i AreaChart trendu rytmu
- **date-fns** — operacje na datach (heatmapa, kalendarz)
- **Lucide React** — spójny zestaw ikon

### Infrastruktura
- **Docker** — multi-stage build (obraz ~200MB)
- Backend serwuje zbudowany frontend jako pliki statyczne

## Rozwój lokalny (bez Dockera)

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
DATA_DIR=./data BACKUP_DIR=./backups uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
npm install
npm run dev   # proxy /api → localhost:8000
```

Frontend deweloperski dostępny pod http://localhost:5173

## Backup i odtwarzanie danych

**Automatyczny backup** (domyślnie o 4:00 w nocy, przechowuje 10 ostatnich kopii):
- Spójne migawki `.db` w wolumenie `/backups` (przez SQLite Online Backup API — bezpieczne przy włączonym trybie WAL)
- Konfigurowany przez cron expression w Ustawieniach (zmiana działa od razu, bez restartu kontenera)

**Z poziomu interfejsu** (Ustawienia → sekcja Backup):
- **Utwórz backup .db** — natychmiastowe wykonanie kopii bazy SQLite
- **Eksportuj dane (JSON)** — pobierz pełny eksport danych
- **Importuj JSON** — przywróć dane z pliku JSON (nadpisuje wszystko)
- **Wczytaj plik .db z dysku** — upload pliku `.db` i natychmiastowe przywrócenie
- **Lista backupów** — pliki `.db` (automatyczne i ręczne) i `.json` (eksporty); każdy można pobrać (⬇), pliki `.db` można też przywrócić (🔼) bezpośrednio z listy

**Odtworzenie po awarii (bez dostępu do UI):**
```bash
# Zatrzymaj kontener
docker compose down

# Przywróć plik DB z backupu
docker run --rm -v habit-data:/data -v habit-backups:/backups alpine \
  cp /backups/habits_20240101_040000.db /data/habits.db

# Uruchom ponownie
docker compose up -d
```

## Harmonogram — jak działa

Nawyk „X razy w tygodniu" (`weekly_x`) rozkłada sesje równomiernie na cały tydzień, np.:

| Częstotliwość | Planowane dni |
|---------------|---------------|
| 2×/tydzień | Pon, Czw |
| 3×/tydzień | Pon, Śr, Pt |
| 5×/tydzień | Pon, Wt, Śr, Pt, Sob |

Analogicznie „X razy w miesiącu" (`monthly_x`) rozkłada sesje równomiernie na dni miesiąca, np.:

| Częstotliwość | Planowane dni |
|---------------|---------------|
| 2×/miesiąc | 1., 16. |
| 3×/miesiąc | 1., 11., 21. |

Streak i % realizacji są liczone względem tych dni — jeśli zrobisz nawyk w zaplanowany dzień, streak się utrzymuje.

## Notatki przy niewykonanych nawykach

Wpisy z `value = 0` reprezentują "odnotowane pominięcie" — nie liczą się do streaka ani procentów realizacji, ale pozwalają zapisać powód pominięcia. Otwórz kartę nawyku (▾) → pole "Notatka" widoczne zawsze, niezależnie od stanu wykonania.

## System rytmu (momentum)

Rytm to miara konsekwencji — rośnie szybciej niż streak przy utrzymaniu i spada szybciej przy porzuceniu:

| Sytuacja | Efekt |
|----------|-------|
| 1. wykonany dzień z rzędu | +1 |
| 2. dzień z rzędu | +2 (łącznie +3) |
| 3. dzień z rzędu | +3 (łącznie +6) |
| 1. pominięty dzień | −1 |
| 2. pominięty dzień z rzędu | −2 (łącznie −3) |
| 3. pominięty z rzędu | −3 (łącznie −6) |

Widoczny na kartach nawyków w sekcji Statystyki. Po kliknięciu karty pojawia się wykres trendu za 30/90/180 dni.

Wzór: `momentum = Σ(n) dla serii wykonań` − `Σ(n) dla serii pominięć`, gdzie *n* to długość bieżącej serii w danym momencie.
