# Nuclear Waste Tracking System

Aplikacija za evidenciju pošiljki, profila kontejnera i otpada, privremenih i završnih skladišta te zahtjeva za transfer. Svaka firma ima zasebnu organizaciju i pristup svojim podacima.

## Tehnologije

Node.js 24, Next.js 16 / React 19, PostgreSQL, Prisma 6.19, NextAuth 4, TanStack Query 5, React Hook Form, Tailwind CSS 4, daisyUI 5 i Recharts 3. Backend koristi Next.js Route Handlers. Većina aplikacije je još JS/JSX; TypeScript provjera nije potpuna provjera tog koda.

## Lokalni demo

```bash
nvm use
npm ci
npm run dev:demo
```

Otvorite http://localhost:3000. Generisani email i lozinka su u `.local/demo-credentials.json`. Skripta pokreće lokalni PostgreSQL na portu 55438, primjenjuje migracije i dodaje sintetičke podatke. `.local/` je izuzet iz Gita. Ponovno pokretanje čuva demo podatke. Zaustavljanje: Ctrl+C.

Demo koristi vlastitu bazu `nwts_dev`, bez obzira na vanjski `DATABASE_URL`. Namijenjen je lokalnom razvoju; provjeren je na Linux x64. Ne kopirajte njegove pristupne podatke u drugo okruženje.

## Razvoj s vlastitom bazom

Kopirajte `.env.example` u `.env` i postavite:

- `DATABASE_URL`: PostgreSQL konekciju za izdvojenu razvojnu bazu.
- `NEXTAUTH_URL`: tačan origin aplikacije, npr. `http://localhost:3000`.
- `NEXTAUTH_SECRET`: vlastitu slučajnu tajnu, npr. izlaz `openssl rand -base64 32`.

```bash
npm run db:generate
npm run db:validate
npm run db:migrate
npm run dev
```

`db:migrate` primjenjuje historiju migracija na odabranu bazu. Za postojeću bazu prvo pregledajte migracije i testirajte obnovu sigurnosne kopije u izdvojenom okruženju. Historija uključuje ranije destruktivne promjene. Nove organizacijske kolone ostavljaju stare zapise bez firme; takvi zapisi nisu vidljivi kroz poslovni API dok im se provjereno ne dodijeli vlasnik.

Doppler ostaje opcionalan: `npm run dev:doppler` koristi konfiguraciju navedenu u `package.json`.

## Dodavanje firme i korisnika

Korisnik se registruje preko aplikacije. Novi račun je neaktivan, bez firme i administratorskih prava. Operater s pristupom serveru i odgovarajućom bazom zatim aktivira račun:

```bash
npm run organization:provision -- --email admin@example.com --name "Primjer firme" --admin
npm run organization:provision -- --email member@example.com --organization 1
```

Druga komanda koristi ID organizacije ispisan prvom komandom; zamijenite `1` stvarnim ID-em. Novi administrator može mijenjati podatke svoje firme. Ostali aktivni članovi trenutno mogu čitati podatke. Uloge operatera i supervizora čekaju potvrdu poslovnih ovlasti. `companyId` iz registracije ne dodjeljuje članstvo. Dodjela postojećeg člana drugoj firmi nije podržana ovom skriptom.

## Provjere

Uz postavljen razvojni `DATABASE_URL`:

```bash
npm run check
npm run build
npm run test:integration
npm audit
```

`check` provjerava Prisma shemu, serverski lint, TypeScript i jedinične testove. Lint trenutno obuhvata `app/api`, `lib`, `scripts` i `tests`. Integracijski testovi automatski kreiraju i uklanjaju izdvojenu PostgreSQL bazu `nwts_test` na portu 55439 i Next server na portu 3109. Ne koriste vanjsku bazu. Testni Next izlaz je `.next-test/`, pa mogu raditi uz demo.

GitHub Actions workflow izvršava instalaciju, generisanje klijenta, provjere, build i integracijske testove na push na `main` i pull request. Lokalni build koristi Google font preko `next/font`, pa pri prvom buildu zahtijeva mrežni pristup. Za produkcijsko pokretanje nakon builda: `npm start`; prije objave pripremiti stvarne tajne, bazu i plan migracije.

## Obuhvat i preostali rad

Izolacija firmi se provodi u serverskom pristupu bazi i provjerava testovima. Nije uveden PostgreSQL RLS. Server provjerava trenutnu aktivnost i prava korisnika pri svakom poslovnom zahtjevu. Upisi zahtijevaju isti origin, JSON i administratorsko pravo. Registracija i prijava imaju zajedničko ograničenje pokušaja u bazi.

Potpuna sljedivost pojedinačnih kontejnera, kontrola svih prijelaza transfera, bilans količina, revizijski dnevnik i detaljne uloge još nisu završeni. Stari POST `/api/final-storage-setup` vraća 410 jer je koristio uklonjeni model; koristi se tok zahtjeva za transfer. IoT, geolokacija, GraphQL i S3 nisu implementirane integracije ovog repozitorija.

Status i naredne odluke: [PLAN_UNAPREDJENJA.md](PLAN_UNAPREDJENJA.md).
