# Plan unapređenja Nuclear Waste Tracking System

Datum plana: 7. septembar 2026. Ažurirano: 8. septembar 2026. Status: implementacija u toku.

Cilj je dobiti aplikaciju sa zaštićenim pristupom, pouzdanom evidencijom kretanja otpada, podržanim zavisnostima i ponovljivim postupkom testiranja i objave. Plan se zasniva na pregledu izvornog koda i konfiguracije. Lokalni demo, build i testna baza su provjereni. Stanje stvarne baze i produkcijskog okruženja još nije potvrđeno. Ovaj dokument ne potvrđuje regulatornu usklađenost niti operativnu spremnost sistema.

## Status implementacije — 8. septembar 2026.

Potvrđena odluka: aplikaciju koristi više nezavisnih firmi. Svaka firma ima svoju organizaciju. Rad se nastavlja na `main`, prema zahtjevu korisnika; promjene nisu objavljene na GitHub.

| Faza | Implementirano | Preostalo |
| --- | --- | --- |
| 0 — okruženje | Node 24, Prisma/TS konfiguracija, izdvojene demo i testne baze, ponovljive skripte | Produkcijsko okruženje i obnova kopije stvarne baze |
| 1 — zaštita | Sesija i trenutne ovlasti na svim poslovnim rutama, organizacijsko filtriranje i validacija referenci, zatvorena registracija privilegija, ograničavanje pokušaja | Matrica uloga, upravljanje članstvom kroz UI, pregled potpunih shema svakog endpointa, provjerena dodjela starih podataka firmama |
| 2 — zavisnosti | Next 16.3.4, React 19.2.8, NextAuth 4.24.15 i osvježene prateće biblioteke; uklonjen react-query v3 | Praćenje budućih zakrpa i provjera ciljnog hostinga |
| 3 — podaci | Prisma 6.19.3, zajednički client, aditivna organizacijska migracija, serijalizabilne transakcije poslovnih zahtjeva | Glavna Prisma migracija zasebno; sljedivost, statusni automat, bilans količina, zaštita historije i domena kapaciteta |
| 4 — kvalitet | Ispravljen dupli queryKey, cache odvojen po korisniku/firmi, generičke API greške, ograničen JSON, serverski lint i testovi | Postepeni TypeScript/strict, potpune ulazne sheme, pokrivenost poslovnih tokova |
| 5 — sučelje | Tailwind 4 / daisyUI 5, zamijenjene stare CSS klase, povezane oznake i greške na auth formama, obrađen mrežni neuspjeh prijave; provjereni prijava, pregled i detalji pošiljke | Sistematska provjera svih modala, mobilnih prikaza i pristupačnosti |
| 6 — isporuka | Tačan README i CI workflow za instalaciju/provjere/build/testove | CI na GitHubu još nije pokrenut; staging, backup/restore, observability i produkcijska objava |

Provjereno: čisti `npm ci` u izdvojenom direktoriju (dopunjen lockfile za opcionalni `sharp`), svih 43 migracije na praznoj izdvojenoj bazi, 5 jediničnih i 11 integracijskih testova, lint/typecheck i produkcijski build. Integracijski testovi uključuju anonimni pristup svim poslovnim metodama, izolaciju dvije firme, stare zapise bez organizacije, neispravne reference, trenutni opoziv prava, rollback i konkurentno ograničavanje pokušaja. `npm audit` je 8. septembra prijavio 0 poznatih ranjivosti; taj nalaz nije potpuna sigurnosna revizija.

Privremeni kompatibilni override `@prisma/config → deepmerge-ts 8.0.0` uklanja ranjivu tranzitivnu verziju. Generisanje, migracije i build su provjereni s overrideom; ukloniti ga kada nadogradnja Prisma konfiguracije donese ispravljenu zavisnost.

Nisu mijenjani podaci stvarne baze. Stari zapisi ostaju s `organizationId = null` i nedostupni kroz poslovni API do provjerene migracije vlasništva. Izolacija je aplikacijska, bez RLS-a. Transakcije same ne rješavaju pravila količina ili dozvoljene promjene statusa.

**Naredni poslovni korak:** razraditi grupni unos uz pojedinačne kontejnere prema dopuni iz koncept dokumenta; potvrditi matricu odobravanja transfera i postojanje stvarne baze. Zatim implementirati model izvora/odredišta i testove transfera, bez izmišljanja veza historijskih zapisa.

## Dopuna iz koncept dokumenta

Pregledan je `Nuclear Waste Tracking System - Concept doc.pdf` (jedna stranica, dijelovi Step 1–3.1 i Administrative levels). PDF je izvor prvobitnog koncepta; prijedlozi ispod su jasno odvojeni od onoga što dokument zaista određuje.

### Utvrđeno u dokumentu i kodu

- **Grupna evidencija:** Step 1 prikazuje Container Profile ID 00202 s količinom 15 i ID 00322 s količinom 12. Step 2 i Step 3 koriste ukupan broj kontejnera. Nije prikazana posebna oznaka svakog fizičkog kontejnera. Trenutni `ContainerProfile.quantity` odgovara tom grupnom modelu.
- **Tok:** pošiljka → privremeno skladište → završno skladište. Dokument bilježi lokacije, vrijeme i odgovorne zaposlenike, ali ne definiše zahtjeve/odobravanje transfera ili dozvoljene prijelaze statusa.
- **Uloge:** zaposlenik unosi podatke za vrstu otpada; supervizor nasljeđuje te ovlasti i dobija statistike/kapacitete i upozorenja; administrator upravlja računima, hijerarhijom i podacima. Prema naknadno potvrđenoj odluci o više firmi, sva ova prava treba ograničiti na korisnikovu firmu. Zapis odgovornog zaposlenika nije automatski autentificirani korisnički račun.
- **Jedinice:** dokument navodi °C, μSv/h, %, hPa, m², m³, tone i metre. Navedeni rasponi upozorenja su konceptualni primjeri, bez potvrde primjenjivosti na stvarno postrojenje; postoje i razlike između privremenog i završnog skladišta. Ne pretvarati ih u univerzalna pravila sigurnosti.
- **Nedosljednosti:** kartice privremenih skladišta zamjenjuju nazive profila otpada i tipa kontejnera; oznake završnih lokacija nisu svuda jednake. Company ID u primjeru ima crticu, dok trenutna baza i validacija dopuštaju samo cijeli broj. Identifikator firme treba zasebno migrirati na string, uz očuvanje vrijednosti i odgovarajuću validaciju formi.

### Predloženi smjer prema korisnikovom sjećanju o pojedinačnim kontejnerima

Korisnik je rekao da misli da se svaki kontejner prati zasebno, ali nije siguran. Radni prijedlog je spoj grupnog unosa i pojedinačne sljedivosti; nije tvrdnja da PDF već zahtijeva pojedinačne oznake.

1. Zadržati postojeći profil kao grupu/stavku pošiljke i dodati zaseban fizički kontejner s oznakom jedinstvenom unutar firme. Unos grupe od 15 može pripremiti 15 pojedinačnih zapisa, uz provjeru i dodjelu fizičkih oznaka.
2. Za svaki kontejner evidentirati pripadnost firmi, grupu/pošiljku, trenutno stanje i lokaciju. Premještanje navodi konkretne kontejnere te izvor i odredište.
3. Količine novih, potpuno identificiranih grupa izračunavati iz pripadajućih kontejnera. Djelimični transfer bira konkretne kontejnere; spriječiti istovremeno rezervisanje istog kontejnera za dva transfera.
4. Svaku promjenu lokacije/statusa bilježiti u historiji s vremenom i stvarnim korisnikom koji ju je izvršio. Odgovornog zaposlenika voditi zasebno kada nije isti korisnik.
5. Postojeće grupne zapise ostaviti za usklađivanje: ne izmišljati fizičke oznake, izvornu lokaciju ili prošle transfere iz same količine. Prije migracije stvarnih podataka provjeriti postoji li takva baza.
6. Uloge razvijati prema dokumentu, a pravo odobravanja/završetka transfera ostaje otvorena poslovna odluka. Postojeća privremena zaštita upisa ostaje do implementacije provjerene matrice prava.

## 1. Polazno stanje i otvorene odluke

| Nalaz | Posljedica | Faza |
| --- | --- | --- |
| Middleware štiti stranice; pregledane poslovne API rute nemaju provjeru sesije i dozvola | Direktni API zahtjevi mogu zaobići zaštitu sučelja | 1 |
| Registracija preuzima `administrator` iz tijela zahtjeva | Korisnik može tražiti administratorsku privilegiju | 1 |
| Next.js 14.0.4; React 18.3.1 | Potrebna migracija frameworka i sigurnosne zakrpe | 2 |
| Prisma 6.0.1; datasource u `prisma/schema.prisma` nema `url` | Konfiguraciju treba uskladiti i potvrditi validacijom | 0, 3 |
| Više API datoteka kreira vlastiti `PrismaClient` | Nepotrebne instance i otežano upravljanje konekcijama | 1, 3 |
| `PreStorageEntry` nema direktnu vezu s profilom kontejnera; transfer nema eksplicitnu izvornu skladišnu lokaciju | Nije jasno dokazana potpuna sljedivost kroz skladišta | 3 |
| Statusi su stringovi, a transfer se ažurira bez provjere prethodnog statusa u pregledanom helperu | Neispravni ili ponovljeni prijelazi moraju biti spriječeni na serveru | 3 |
| Brojne relacije koriste `onDelete: Cascade` | Brisanje osnovnog zapisa može ukloniti povezanu historiju | 3 |
| Mutacija transfera navodi `queryKey` dvaput u istom objektu | Prvi ključ se prepisuje i dio prikaza može ostati zastario | 4 |
| TypeScript 5.3.3 uz `ignoreDeprecations: "6.0"`, JS/JSX kod i dvije konfiguracije | Konfiguraciju i obuhvat provjere tipova treba popraviti | 0, 4 |
| Nisu pronađeni projektni testovi i CI workflow | Nema automatske potvrde ključnih ponašanja | 0–6 |
| README navodi integracije koje nisu pronađene u pregledanom kodu | Dokumentacija precjenjuje potvrđene funkcionalnosti | 6 |

Poslovne odluke koje treba razriješiti prije zavisnih promjena:

- **Potvrđeno:** više međusobno odvojenih kompanija. Dodan je stvarni model organizacije; `companyId` nije izvor prava pristupa.
- Ko smije kreirati, odobriti i završiti transfer? Početni prijedlog je operater, supervizor i administrator; detaljnu matricu prava potvrditi prije dodjele ovih uloga.
- Da li `ContainerProfile.quantity` predstavlja grupu kontejnera ili svaki kontejner mora imati jedinstvenu oznaku? To određuje model sljedivosti i djelimičnih transfera.
- Koje su jedinice mjerenja, pravila kapaciteta i dozvoljeni uslovi? Postojeće pragove treba potvrditi s vlasnikom procesa, bez izmišljanja fizičkih ograničenja.
- Postoji li produkcijska baza i koje podatke mora sačuvati migracija? Nepoznate veze u historijskim podacima označiti za ručnu provjeru.

Sigurnosne popravke mogu početi prije ovih odluka: javna registracija dobija minimalne privilegije, a poslovni API zahtijeva autentifikaciju i provjeru pristupa.

## 2. Ciljana tehnološka osnova

Zadržati Next.js App Router, PostgreSQL, Prisma, TanStack Query i postojeću organizaciju funkcionalnosti. Verzije zaključati nakon provjere kompatibilnosti, instalacije i testova.

| Tehnologija | Cilj |
| --- | --- |
| Node.js | Node 24 LTS kao kandidat, nakon provjere hostinga i kompatibilnosti; ista verzija lokalno i u CI-ju. [Službeni status verzija](https://nodejs.org/en/about/previous-releases) |
| Next.js i React | Najnovija sigurnosno zakrpljena verzija podržane Next.js 16 grane i kompatibilni React 19 paketi. Next 15 može biti privremeni migracijski korak; 14.x je izvan podrške. [Politika podrške](https://nextjs.org/support-policy) |
| Prisma | Prvo popraviti konfiguraciju za postojeću verziju, zatim zasebno odabrati podržanu stabilnu verziju i migrirati CLI i client zajedno. Tačan cilj potvrditi prema aktuelnim izdanjima prije implementacije. |
| PostgreSQL | Utvrditi stvarnu serversku verziju, podršku i hosting ograničenja. Nadogradnju servera, ako je potrebna, odvojiti od ORM migracije. |
| Autentifikacija | Najprije ispraviti autorizaciju s postojećim NextAuth-om. Prije Next/React migracije provjeriti podršku i peer zavisnosti odabranog auth izdanja; eventualnu migraciju sesija izdvojiti. |
| Podaci i forme | Zadržati TanStack Query v5, Axios i React Hook Form; osvježiti kompatibilna izdanja. Ukloniti neupotrijebljeni `react-query` v3 nakon provjere svih importa. |
| CSS | Tailwind 4 i daisyUI 5 u zajedničkoj, zasebnoj migraciji. [Službeni vodič](https://daisyui.com/docs/upgrade/) |
| Alati i grafikoni | Uskladiti TypeScript i `@types` pakete; provjeriti Recharts, Toastify, Tooltip, ikone, Day.js, bcryptjs, PostCSS i Prettier. Glavne verzije mijenjati uz pripadajuće funkcionalne provjere. |

## 3. Faza 0 — Ponovljivo razvojno okruženje

Prioritet: P0. Okvirno 1–2 radna dana.

- Evidentirati postojeće lokalne izmjene i odrediti polazno stanje za implementaciju, bez njihovog prepisivanja. Korisnik je zatražio rad na `main`; taj zahtjev ima prednost nad prvobitnim prijedlogom zasebne grane.
- Utvrditi Node/npm verzije, stanje lockfilea i dozvole lokalnih CLI datoteka. Prethodni pokušaj Prisma validacije nije izvršen zbog dozvole izvršavanja.
- Provjeriti konfiguraciju Prisma 6 datasourcea i povezivanje preko `DATABASE_URL`; ukloniti neusklađene TypeScript opcije uz validaciju.
- Pripremiti zasebnu razvojnu/testnu PostgreSQL bazu. Dokumentovati Doppler i lokalni `.env` način pokretanja.
- Potvrditi `npm ci`, generisanje Prisma klijenta, validaciju sheme, primjenu migracija na praznu testnu bazu i `build/start`.
- Napraviti početnu provjeru: prijava, pregled pošiljke, kreiranje kontejnera, ulaz u skladište i transfer. Zapisati postojeće kvarove.
- Uspostaviti minimalan CI za provjere koje već mogu proći; testove dodavati uz svaku popravku.

Gotovo kada: drugi developer može pokrenuti projekt prema uputama; poznati kvarovi imaju ponovljiv primjer; testni podaci su odvojeni od stvarnih.

## 4. Faza 1 — Pristup i zaštita API-ja

Prioritet: P0. Zavisi od faze 0. Okvirno 3–5 dana.

- Napraviti popis svih API ruta i metoda, s eksplicitno javnim auth endpointima i zaštićenim poslovnim endpointima.
- Uvesti zajedničke server provjere sesije, dozvole i pristupa konkretnom zapisu. Middleware ostaje pomoć za navigaciju; svaka poslovna operacija provjerava prava na serveru.
- Registracija ignoriše pokušaj slanja privilegija; prvi administrator nastaje kontrolisanim postupkom. Provjeriti postojeće administratorske račune i pouzdanost postojećeg `companyId` prije upotrebe za izolaciju.
- Povezati korisničke račune s odgovornim zaposlenicima ili izričito provjeravati ovlašteno djelovanje u tuđe ime. ID zaposlenika iz forme sam po sebi nije dokaz identiteta.
- Ako su kompanije odvojene, ograničiti čitanje i pisanje prema pouzdano utvrđenoj pripadnosti. Ograničenje primijeniti i na statistike, pretrage i povezane zapise.
- Uvesti validaciju zahtjeva: tipovi, opsezi, pozitivne količine, stvarni ID-jevi, dozvoljena polja, statusi i datumi. Ne oslanjati se na `parseInt` i provjeru istinitosti vrijednosti.
- Provjeriti zaštitu od CSRF-a za vlastite mutirajuće rute i ograničiti pokušaje prijave/registracije. Za više serverskih instanci koristiti zajedničko spremište limita.
- Ujednačiti odgovore: `401`, `403`, `400`, `404` i `409`; ukloniti interne DB poruke iz odgovora. Prazne liste vraćati dosljedno kao `200` i `[]`, bez JSON tijela uz `204`.
- Centralizirati Prisma klijent i sigurno logovanje grešaka. Za osjetljive akcije provjeriti kako promjena privilegija ili deaktivacija računa utiče na već izdate JWT sesije.

Provjere: anonimni korisnik ne može čitati ni mijenjati poslovne podatke; registracija ne stvara administratora; izmjena ID-ja ne daje pristup drugoj organizaciji; neispravne količine ne mijenjaju bazu; povučena prava prestaju važiti za osjetljive operacije.

## 5. Faza 2 — Next.js, React i zavisnosti

Prioritet: P0/P1. Zavisi od početnih sigurnosnih testova. Okvirno 3–5 dana.

- Napraviti tabelu kompatibilnosti Node/Next/React/auth/Prisma i UI biblioteka prije promjene paketa.
- Migrirati promjene iz Next 15, zatim Next 16; testirati nakon svakog koraka. Ako postoji javno dostupan deployment, potrebne sigurnosne zakrpe izdvojiti kao raniju isporuku.
- Prilagoditi asinhrone `params`, `searchParams`, `cookies` i `headers` gdje se koriste. Pregledati promjene cache ponašanja za privatne podatke.
- Prilagoditi middleware/proxy i auth integraciju odabranoj verziji. Zamijeniti `next lint` direktnim ESLint pozivom; lint pokretati odvojeno od builda. [Next 16 migracija](https://nextjs.org/docs/app/guides/upgrading/version-16)
- Uskladiti React, React DOM i njihove tipove; provjeriti forme, modale, grafikone, sesiju i hidrataciju.
- Ažurirati ostale pakete u kompatibilnim grupama. Pregledati sigurnosni audit i napuštene zavisnosti; za nalaze provjeriti pogođeni kod i mogućnost popravke, bez slijepog `audit fix --force`.
- Ukloniti stari `react-query` v3 ako nema upotrebe; potvrditi čistu instalaciju iz novog lockfilea i dokumentovati zašto se eventualna stara verzija privremeno zadržava.

Gotovo kada: čista instalacija, lint, provjera tipova, build i ključni scenariji prolaze na odabranom podržanom skupu verzija; nema neriješenih potvrđeno primjenjivih kritičnih/visokih ranjivosti u obuhvatu izdanja.

## 6. Faza 3 — Baza, sljedivost i pouzdani transferi

Prioritet: P1. Zavisi od odluka o evidenciji i pristupu. Okvirno 4–7 dana, uz dodatni rad ako historijski podaci zahtijevaju ručno povezivanje.

- Nacrtati model pošiljka → kontejner/grupa → skladišni ulaz → transfer → konačna lokacija. Odlučiti o djelimičnim transferima i stabilnim identifikatorima.
- Povezati skladišne ulaze i transfere s konkretnim predmetom evidencije te izvornom i ciljnom lokacijom. Nazivi prostorija služe za prikaz, ID-jevi za relacije.
- Preispitati `ShippingInformation.userProfileId @unique`, koji trenutno ograničava povezivanje istog korisnika s više pošiljki.
- Definisati dozvoljene prijelaze statusa i uloge koje ih pokreću. Stare stringove i tipografske varijante mapirati prije uvođenja enum vrijednosti ili DB ograničenja.
- Kreiranje premještanja, rezervaciju kapaciteta i promjenu količina izvesti u transakciji. Za paralelne zahtjeve koristiti uslovna ažuriranja/zaključavanje i odgovarajući nivo izolacije uz kontrolisano ponavljanje konflikata.
- Spriječiti dvostruko izvršavanje ponovljenog zahtjeva. Kapacitet i raspoloživu količinu provjeravati na serveru; zbir evidentiranih količina mora ostati usklađen tokom transfera.
- Pregledati cascade brisanja. Za historijske zapise predložiti arhiviranje ili zabranu brisanja, uz definisan postupak ispravke evidencije.
- Uvesti zapis promjena: akter, vrijeme, entitet, operacija i relevantne promjene. Upis poslovne promjene i zapisa izvršiti u istoj transakciji; aplikacijski korisnici ne smiju mijenjati historiju.
- Nadogradnju Prisma alata izdvojiti od promjene poslovne sheme. Provjeriti konfiguraciju, generator, module, konekcije/adapter i seed prema odabranoj verziji.
- Migracije probati na praznoj bazi i kopiji postojećih podataka. Koristiti dodavanje novih polja → popunjavanje → provjeru → obavezna ograničenja; zabilježiti sve nerazriješene veze.

Provjere: dva istovremena transfera ne prekoračuju raspoloživu količinu; ponavljanje završetka ne knjiži količinu dvaput; nedozvoljeni prijelaz se odbija; kvar transakcije ne ostavlja djelimično stanje; iz konačnog zapisa moguće je pratiti porijeklo.

## 7. Faza 4 — Održavanje koda i prikaz svježih podataka

Prioritet: P1/P2. Okvirno 3–5 dana.

- Objediniti TypeScript konfiguraciju i alias putanje. Postepeno tipizirati API podatke, validaciju, auth i transfere; zatim forme i ostale komponente. Eksplicitno uključiti željene JS datoteke u provjere tokom prelaska.
- Poslovna pravila izdvojiti iz API ruta u zajedničke funkcije, bez dupliciranja pravila po komponentama.
- Popraviti dupli `queryKey` u `requests/request-final-storage/request-final-storage-transver-request/use-update-final-storage-transver-request-mutation.js`: osvježiti oba upita zasebnim pozivima ili zajedničkim predikatom. Pregledati isti obrazac u ostalim mutacijama.
- Standardizirati ključeve upita, greške i stanja učitavanja. Očistiti cache pri odjavi ili promjeni korisnika, posebno za podatke kompanija.
- Dodati paginaciju/filtere gdje se trenutno dohvaćaju kompletne liste; na osnovu izmjerenih upita dodati potrebne indekse.
- Ujednačiti jedinice i format datuma, uz UTC zapis i jasno lokalno prikazivanje. Razlikovati nepostojeće mjerenje od nule.

Gotovo kada: transfer osvježava sve povezane prikaze bez ručnog reloada; promjena korisnika ne prikazuje podatke prethodne sesije; najvažnija poslovna pravila imaju jednu implementaciju i testove.

## 8. Faza 5 — Tailwind, daisyUI i upotrebljivost

Prioritet: P2. Okvirno 2–4 dana.

- Snimiti početni izgled važnih ekrana i popis korištenih tema, klasa i komponenti.
- Zajedno migrirati Tailwind 3 → 4 i daisyUI 4 → 5, uključujući PostCSS, konfiguraciju tema i prilagođeni CSS. Provjeriti minimalno podržane preglednike prije usvajanja. [Vodič](https://daisyui.com/docs/upgrade/)
- Provjeriti tabele, modale, forme, padajuće liste, grafikone i poruke na desktopu i telefonu.
- Omogućiti jasne oznake polja, povezane poruke greške, tastaturnu navigaciju i vidljiv fokus. Status prikazivati tekstom uz boju.
- Tokom slanja prikazati napredak i spriječiti slučajno ponovljeni klik; server ostaje odgovoran za sprječavanje duplog knjiženja.

Gotovo kada: ključni tokovi rade tastaturom i na malom ekranu; nema odsječenih dijaloga, skrivenih dugmadi i vizuelnih regresija.

## 9. Faza 6 — Dokumentacija, CI i priprema izdanja

Prioritet: P1 za provjere, P2 za doradu. Okvirno 2–4 dana. Dio provjera uvodi se od faze 0.

- Prepisati README prema stvarnoj implementaciji: instalacija, env varijable, migracije, seed, testovi i postojeći moduli. IoT, S3, GraphQL i regulatorne izvještaje označiti kao budući rad dok ne postoje i ne budu provjereni.
- Dokumentovati matricu prava, prijelaze statusa, model sljedivosti i postupak dodavanja administratora.
- CI treba izvršavati čistu instalaciju, Prisma generisanje/validaciju, lint, typecheck, integracijske testove na PostgreSQL-u, build i ključne browser scenarije. Testovi autorizacije i transakcija provjeravaju stvarno ponašanje API-ja i baze.
- Pripremiti staging sa zasebnim podacima i tajnama. Uvesti osnovne provjere dostupnosti, logove s identifikatorom zahtjeva i praćenje grešaka bez lozinki/tokena u logovima.
- Probati backup i vraćanje baze prije izdanja s migracijama. Definisati povrat aplikacije na prethodnu verziju i kompatibilnost sheme; vraćanje aplikacije nije automatski vraćanje baze.
- Pripremiti izdanje s rezultatima provjera i uputama za primjenu migracija. Demo seed ne pokretati nad produkcijskim podacima.
- Definisati mjesečni pregled zavisnosti i brži postupak za sigurnosne zakrpe; ovaj plan sam ne kreira automatizaciju niti objavljuje aplikaciju.

Gotovo kada: CI prolazi, staging prolazi ključne scenarije, dokumentacija odgovara aplikaciji i postupak oporavka je praktično provjeren.

## 10. Redoslijed isporuka i procjena

| Isporuka | Obuhvat | Uslov za nastavak |
| --- | --- | --- |
| A | Okruženje + početni testovi | Ponovljivo pokretanje |
| B | API autentifikacija, privilegije i validacija | Prolaze negativni sigurnosni scenariji |
| C | Podržan Next/React/Node skup | Prolaze provjere kompatibilnosti i postojeći tokovi |
| D | Prisma migracija alata | Prolaze DB integracijski testovi |
| E | Sljedivost, transakcije i historija | Potvrđena pravila i usklađene količine |
| F | Tipovi, cache i održavanje | Svježi i pravilno ograničeni podaci u prikazu |
| G | CSS migracija i upotrebljivost | Vizuelne i funkcionalne provjere |
| H | Dokumentacija i priprema izdanja | Staging, backup/restore i CI |

Okvirni zbir je 18–32 radna dana jednog developera, približno 4–7 sedmica. To je planska procjena, ne izmjeren rok; faza 0 služi za njenu korekciju. Najveće nepoznanice su stanje baze, povezivanje historijskih podataka, poslovna prava i kompatibilnost auth integracije. Potpuna konverzija svih JS datoteka u TypeScript i nove IoT/S3 funkcionalnosti nisu uključene u ovaj okvir.

Prvi konkretni paket implementacije: ponovljivo pokretanje, zatvaranje administratorske registracije, zaštita svih poslovnih API metoda i testovi koji potvrđuju da neovlašteni zahtjevi više ne prolaze. Framework sigurnosne zakrpe imaju isti P0 prioritet i, gdje je potrebno, izdvajaju se prije ostalih migracija.
