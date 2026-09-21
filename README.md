# Nuclear Waste Tracking System

Aplikacija za evidenciju pošiljki, profila kontejnera i otpada, privremenih i završnih skladišta te zahtjeva za transfer. Svaka firma ima zasebnu organizaciju i pristup svojim podacima.

## Tehnologije

Node.js 24, Next.js 16 / React 19, PostgreSQL, Prisma 7.10 (`@prisma/adapter-pg` + `pg`), NextAuth 4, TanStack Query 5, React Hook Form, Tailwind CSS 4, daisyUI 5 i Recharts 3. Backend koristi Next.js Route Handlers. Većina aplikacije je još JS/JSX; TypeScript provjera nije potpuna provjera tog koda. Konekcijski URL za Prisma CLI je u `prisma.config.ts` (`DATABASE_URL`); klijent se kreira s driver adapterom.

## Lokalni demo

```bash
nvm use
npm ci
npm run dev:demo
```

`npm run dev` i `npm run dev:local` pokreću isti lokalni demo setup: bazu i potrebne `NEXTAUTH_SECRET` / `NEXTAUTH_URL` vrijednosti. Za vlastitu bazu i vlastiti `.env` koristi se `npm run dev:database`. Demo koristi port 3000; ako je zauzet, prvo zaustavite postojeći server.

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
npm run dev:database
```

`db:migrate` primjenjuje historiju migracija na odabranu bazu. Za postojeću bazu prvo pregledajte migracije i testirajte obnovu sigurnosne kopije u izdvojenom okruženju. Historija uključuje ranije destruktivne promjene. Nove organizacijske kolone ostavljaju stare zapise bez firme; takvi zapisi nisu vidljivi kroz poslovni API dok im se provjereno ne dodijeli vlasnik.

Doppler ostaje opcionalan: `npm run dev:doppler` koristi konfiguraciju navedenu u `package.json`.

## Korisnici i administrativne uloge

Prijava prihvata korisničko ime ili email i šifru. Uloga se čita iz baze; korisnik je ne bira pri prijavi. Javna registracija je zatvorena.

Sve tri uloge mogu pregledati Home statistike svoje organizacije. Employee pristup statistici ne daje pravo na korekcije OUT pošiljki niti upravljanje korisnicima.

- **Administrator** kreira sve tri vrste računa, mijenja podatke i uloge te deaktivira račune svoje firme. Ne može deaktivirati ili degradirati vlastiti administratorski račun.
- **Supervision** ima pregled sistema i može kreirati samo Employee račune svoje firme. Ne može mijenjati postojeće račune niti dodjeljivati više ovlasti.
- **Employee** unosi pošiljke i kontejnere koristeći postojeće definicije otpada, tipova i porijekla. Definicije kreira i mijenja samo Administrator. Employee i Supervision mogu korigovati IN pošiljke; nakon OUT samo administrator može mijenjati pošiljku i njene kontejnere. Izmjene zajedničkih definicija i administrativne postavke ostaju administratorske.

Odjeljak **Users** služi za dodavanje imena, korisničkog imena, emaila, uloge i početne šifre. Nema pozivnica: osoba koja kreira račun predaje podatke korisniku. **My account** omogućava promjenu vlastite šifre uz potvrdu stare; nakon promjene sve prethodne sesije prestaju važiti. Deaktivacija također opoziva sesije. Šifre imaju najmanje 12 znakova i najviše 72 UTF-8 bajta, a u bazi su bcrypt hashovi.

Za lokalno testiranje `npm run dev:demo` kreira administratora, `supervision` i `employee` u istoj demo firmi. Pristupni podaci su u `.local/demo-accounts.md`, izvan Gita. Postojeće podatke i promijenjene šifre ponovno pokretanje čuva.

Demo seed dopunjava i postojeću demo firmu primjerima iz konceptnog PDF-a: M01/M02, čelični i betonski kontejner (15 m³, nosivost 7/6 tona, otisak 2 m²), Brokdorf/Ahaus te IN pošiljku `DEMO-CONCEPT-001` sa 15 i 12 kontejnera. Zapisi su označeni kao demo i nisu operativne specifikacije. Seed ne prepisuje postojeće zapise ili status pošiljke. Setup stranica provjerava dostupne povezane komponente i vodi do pošiljki za kreiranje Container Profile.

Prvog administratora nove firme operater kreira preko CLI-ja, uz `NWTS_INITIAL_PASSWORD` postavljen u okruženju:

```bash
npm run organization:provision -- --email admin@example.com --username admin --display-name "Company administrator" --name "Primjer firme" --admin
```

Za dodavanje postojećoj firmi zamijeniti `--name` s `--organization ID`. Postojeći račun bez firme može se aktivirati istom komandom. Premještanje korisnika između firmi nije podržano.

Migracija pretvara postojeće administratore u `ADMINISTRATOR`, ostale u `EMPLOYEE`. `role` je izvor ovlasti; stari `administrator` boolean zadržan je radi kompatibilnosti i usklađuje se pri upravljanju korisnicima. Nema globalnog pristupa drugim firmama.

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

Status `OUT` označava da je kamion napustio zonu istovara. Employee i Supervision tada imaju samo pregled detalja pošiljke; Administrator zadržava korekcije uz jasnu napomenu. Ovlasti dolaze sa servera, a svaki upis ih zasebno provjerava u transakciji. Postojeća ograničenja interfejsa za prihvaćene kontejnere ostaju na snazi.

Izolacija firmi se provodi u serverskom pristupu bazi i provjerava testovima. Nije uveden PostgreSQL RLS. Server provjerava trenutnu aktivnost i prava korisnika pri svakom poslovnom zahtjevu. Upisi zahtijevaju isti origin, JSON i odgovarajuću ulogu. Registracija i prijava imaju zajedničko ograničenje pokušaja u bazi.

Potpuna sljedivost pojedinačnih kontejnera, kontrola svih prijelaza transfera, bilans količina, revizijski dnevnik i dodatne ovlasti po skladištu još nisu završeni. Stari POST `/api/final-storage-setup` vraća 410 jer je koristio uklonjeni model; koristi se tok zahtjeva za transfer. IoT, geolokacija, GraphQL i S3 nisu implementirane integracije ovog repozitorija.

Status i naredne odluke: [PLAN_UNAPREDJENJA.md](PLAN_UNAPREDJENJA.md).
