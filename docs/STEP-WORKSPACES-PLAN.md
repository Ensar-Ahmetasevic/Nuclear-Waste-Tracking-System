# Plan: radna područja za tri koraka

Status: implementirana prva funkcionalna verzija radnih područja; provjera 13.09.2026.
Datum: 11.09.2026.

## 1. Cilj

Employee nakon prijave odmah vidi svoje radno područje, ono što čeka obradu i sljedeću dozvoljenu akciju. Ne vidi menije, operativne liste ni forme drugih koraka. Administrator i Supervision imaju zajednički pregled sva tri koraka, uz svoja postojeća ovlaštenja.

Ovo je podjela odgovornosti unutar organizacije, ne podjela podataka na tri nepovezane baze. Tok kontejnera kroz korake ostaje povezan.

## 2. Osnovne odluke

- Zadržati uloge ADMINISTRATOR, SUPERVISION i EMPLOYEE.
- Employee ima jedno dodijeljeno radno područje: SHIPPING, PRE_STORAGE ili FINAL_STORAGE.
- Korisnik ne bira ulogu ili radno područje na login stranici. Sistem ih učitava iz računa.
- Administrator i Supervision biraju područje pri kreiranju Employee računa. Naknadno uređivanje računa ostaje Administratoru prema trenutnim pravilima.
- Administrator i Supervision imaju pristup svim područjima; pristup području sam po sebi ne daje pravo na svaku korekciju.
- Nema pozivnica: nadređeni kreira korisničko ime i početnu šifru; promjena šifre ostaje u My account.
- Employee bez dodijeljenog područja dobija jasan ekran „Radno područje nije dodijeljeno“ i My account / Sign out. Ne dobija automatski pristup svim koracima.
- Statistike nisu zabranjene zaposlenicima: radni početni ekran prikazuje relevantne statistike vlastitog koraka. Detaljne operativne podatke drugih koraka ne prikazivati.
- Ranije odobren pregled globalnih agregata može ostati kao sekundarni sažetak bez linkova prema drugim radnim područjima. Ne koristiti ga kao glavnu radnu stranicu zaposlenika.

## 3. Nalazi iz postojećeg koda

| Dio | Trenutno stanje | Potrebna promjena |
|---|---|---|
| UserProfile | Ima role, nema radno područje | Dodati workArea i migraciju |
| lib/server/accounts.cjs | Validira ulogu i javna polja korisnika | Validirati područje i uključiti ga u siguran odgovor |
| lib/server/api-route.js | Provjerava organizaciju, ulogu i zabranu OUT korekcija | Dodati provjere radnog područja i pojedinačne operacije |
| proxy.js | Provjerava prijavu | Zaštititi i serverski sadržaj ruta, ne oslanjati se samo na JWT ili skriven meni |
| components/navbar/navbar.js | Svima učitava Shipping query; sadrži sve korake i placeholder akcije | Nezavisna navigacija prema sesiji i dozvolama |
| app/page.js | Generički pregled, statistike i linkovi za sve | Employee radna početna; upravljački pregled za više uloge |
| Step 1 lista | Filteri, najnoviji unosi prvi, 10 po stranici | Zadržati; povezati s radnom početnom |
| Pre-storage / final-storage API | Mnoge mutacije po defaultu zahtijevaju Administratora | Razdvojiti operativni rad od upravljanja postavkama |
| /api/shipping-informations/pending | Vraća dolazne profile za prijem | Namjenski Step 2 red prijema sa minimalnim podacima |
| Transfer request API | Različite operacije dijele PUT endpoint | Dodijeliti dozvole po operationType, ne samo URL-u |

Ne pretpostavljati da Employee trenutno može izvršiti sve Step 2/3 akcije samo zato što vidi dugmad.

## 4. Predložena matrica odgovornosti

| Akcija | Employee Step 1 | Employee Step 2 | Employee Step 3 | Supervision | Administrator |
|---|---|---|---|---|---|
| Evidencija dolaska i IN transporta | Da | Ne | Ne | Da | Da |
| Pregled sadržaja transporta | Svoj radni ekran | Sažetak za prijem | Sažetak za prijem transfera | Da | Da |
| Kreiranje/izmjena Container Profile | Ne; Supervision prema pojašnjenju korisnika | Ne | Ne | Da dok IN | Da |
| Korekcije transporta nakon OUT | Ne | Ne | Ne | Ne | Da |
| Prijem u pre-storage | Ne | Da | Ne | Da | Da |
| Rad s uslovima pre-storage | Ne | Da | Ne | Da | Da |
| Obrada predaje iz pre-storage | Ne | Da | Ne | Da | Da |
| Zahtjev/prijem u final-storage | Ne | Ne | Da | Da | Da |
| Rad s uslovima final-storage | Ne | Ne | Da | Da | Da |
| Definicije lokacija, tipova i otpada | Ne | Ne | Ne | Postojeća ograničenja | Da |
| Kreiranje Employee računa | Ne | Ne | Ne | Da, uz izbor područja | Da |
| Promjena vlastite šifre | Da | Da | Da | Da | Da |

Važno: unos mjerenja nije isto što i mijenjanje konfiguracije pragova. Prvi pripada operativnom radu, drugi postojećim ovlaštenjima upravljanja. Prije povezivanja dugmadi provjeriti šta konkretni endpoint radi.

## 5. Employee početna stranica

Zajednički raspored, različit sadržaj:

1. Naziv radnog područja i ime korisnika.
2. Jedna istaknuta glavna akcija.
3. Najviše tri ili četiri relevantna brojača, koji vode na filtriranu listu.
4. Lista zadataka koji čekaju obradu, najhitniji jasno označeni tekstom i bojom.
5. Sekundarni link prema istoriji vlastitog područja.

Bez velikog promotivnog uvoda, praznih menija i dugmadi koja rade console.log ili alert. Ne prikazivati nulu kada podaci nisu učitani; prikazati loading ili grešku s ponovnim pokušajem.

### Step 1 — Shipping informations

- Glavna akcija: Add arrival.
- Brojači: IN bez sadržaja, IN sa sadržajem, OUT.
- Employee evidentira datum/vrijeme, kompaniju, vozača i tablice.
- Za nedostajući sadržaj jasno prikazati „Waiting for Container Profile — Supervision“; zaposleniku ne nuditi akciju koju ne smije izvršiti.
- Supervision u istom području ima listu transporta kojima treba dodati Container Profile.
- Sačuvati postojeće filtere, pretragu, najnoviji unos prvi, 10 zapisa po stranici i crveni bočni border za OUT.
- „Content recorded“ ne znači automatski „accepted“ niti fizički potvrđen kompletan teret.

### Step 2 — Pre-storage Entry

- Glavna akcija: Open incoming containers.
- Brojači: čeka prijem, u pre-storage, čeka predaju, upozorenja.
- Radne cjeline: Incoming, In pre-storage, Transfers, Conditions, History.
- Prijem prikazuje porijeklo, Waste Profile, tip ambalaže, količinu i referencu pošiljke unutar Step 2 ekrana.
- Nema linka za uređivanje izvornog kamiona ili pristupa cijeloj Shipping listi.
- Odvojiti prijem/odbijanje od kreiranja definicija hala i zaposlenika.

### Step 3 — Final Storage Entry

- Glavna akcija: Open transfers / Create transfer request, prema trenutnom toku zahtjeva.
- Brojači: zahtjevi u obradi, čeka prijem, zaprimljeno, upozorenja.
- Radne cjeline: Transfer requests, Incoming, Stored, Conditions, History.
- Sažetak porijekla, tipa i količine vidljiv je u detaljima prijema; prethodni koraci se ne mogu mijenjati.
- Odvojiti evidenciju prijema od konfiguracije soba i mjernih pragova.

## 6. Administrator i Supervision

- Početna sa sažetkom sva tri koraka i jasno označenim ulazima u radna područja.
- Uvijek je vidljivo aktivno područje; prelazak bez traženja u višeslojnim menijima.
- Users i postavke odvojeni od svakodnevne operativne navigacije.
- Supervision vidi radne zadatke, uključujući kreiranje Container Profile; Administrator dodatno upravlja definicijama i dozvoljenim korekcijama.
- Ne dodavati Supervisionu automatski administratorova prava za OUT ili konfiguraciju.

## 7. Navigacija i povratne informacije

- Employee: My workspace, radne liste svog koraka, My account, Sign out.
- Desktop: kompaktna navigacija s jasnim aktivnim linkom; mobilni: iste stavke u jednostavnom meniju.
- Link My workspace uvijek vraća u dodijeljeno područje.
- Direktan pokušaj otvaranja tuđeg područja prikazuje objašnjenje i povratak u vlastito, bez renderovanja tuđih podataka.
- Nakon spremanja ostati u kontekstu zadatka, potvrditi rezultat i osvježiti relevantne brojače.
- Statusi imaju tekst; boja je dodatni signal. Vidljiv fokus, pristupačne oznake i dovoljno veliki klikabilni elementi.
- Radno područje ne prikazivati kao izbor koji Employee može sam promijeniti.

## 8. Podaci i serverska zaštita

- Prisma enum WorkArea: SHIPPING, PRE_STORAGE, FINAL_STORAGE; nullable UserProfile.workArea.
- Za nove Employee račune područje je obavezno. Za upravljačke uloge null znači sva područja zbog uloge, ne javni pristup.
- Postojeće Employee račune bez poznatog rasporeda ostaviti neraspoređenim. Poznati lokalni demo Employee dodijeliti Step 1 kroz eksplicitnu demo migraciju/seed; ne raspoređivati stvarne korisnike naslijepo.
- Pročitati trenutno područje iz baze u autentikaciji i API provjeri. Promjena rasporeda mora blokirati stare dozvole i u već otvorenom tabu.
- Očistiti ili razdvojiti React Query cache prema korisniku, organizaciji i području; ne prikazivati podatke prethodne sesije tokom prebacivanja računa.
- Centralna politika provjerava ulogu + područje + operaciju + organizaciju + stanje zapisa.
- Radna područja ne zamjenjuju postojeću izolaciju organizacija, CSRF provjere i OUT zaštitu.
- Operacije prijema i transfera moraju ostati transakcijske, sa provjerom dostupne količine i dozvoljenog prelaza stanja.
- Step 2/3 dobivaju namjenske read-only sažetke za predaju, ne izuzetak koji otvara cijeli API prethodnog koraka.
- Evidencije „responsible employee“ u skladištima nisu automatski login računi: definisati vezu prije automatskog popunjavanja; ne spajati ih po imenu.

## 9. Redoslijed implementacije

### Faza A — model pristupa i raspored zaposlenika

- [ ] WorkArea migracija bez brisanja podataka.
- [ ] Validacija kreiranja/izmjene računa i polje Work area u Users.
- [ ] Sesija, API politika, zaštita ruta i izolacija cachea.
- [ ] Matrica operacija za svaki postojeći endpoint, uključujući operationType transfera.
- [ ] Testovi svih kombinacija uloge/područja prije uključivanja novog ograničenja.

### Faza B — osnovna navigacija i radne početne

- [ ] Ukloniti globalnu zavisnost Navbar od Shipping queryja.
- [ ] Employee početne za tri koraka i ekran za neraspoređen račun.
- [ ] Upravljačka početna i prebacivanje između područja.
- [ ] Ukloniti placeholder menije, zadržati stvarne operativne akcije.

### Faza C — Step 1 kompletan tok

- [ ] Postojeća lista u novoj navigaciji, Add arrival na vidljivom mjestu.
- [ ] Razdvojiti unos kamiona od Supervision kreiranja Container Profile.
- [ ] Provjeriti IN/OUT zaštitu, indikatore nedostajućeg sadržaja i povezane API-je.

### Faza D — Step 2 i Step 3

- [ ] Namjenski redovi prijema i minimalni sažeci predaje.
- [ ] Dozvoliti operativne akcije raspoređenom Employeeju bez otvaranja Setup funkcija.
- [ ] Jasne liste prijema, transfera, istorije i uslova skladištenja.
- [ ] Provjeriti količine, odbijanje, ponovljen klik i istovremene zahtjeve.

### Faza E — demo i završna provjera

- [ ] Po jedan demo Employee račun za svaki Step, uz postojeće upravljačke račune.
- [ ] Ne resetovati postojeće lozinke niti unositi duplikate pri restartu.
- [ ] Testirati login → početna → zadatak → spremanje → istorija za svih pet scenarija pristupa.
- [ ] Provjeriti mobilni i desktop prikaz, prazne liste i greške mreže.

## 10. Kriteriji prihvatanja

1. Employee nakon prijave vidi samo svoje radno područje i zajedničke funkcije računa.
2. Direktni URL i ručni API zahtjev za tuđi korak ne otkrivaju operativne podatke i ne dopuštaju izmjene.
3. Step 2 i Step 3 mogu obaviti prijem s potrebnim sažetkom bez pristupa izvornom radnom ekranu.
4. Promjena područja djeluje na naredni serverski zahtjev; zastarjela sesija ili cache ne vraća stari pristup.
5. Step 1 radnik evidentira kamion, Supervision uređuje Container Profile; OUT korekcije ostaju Administratoru.
6. Statistike vlastitog koraka su vidljive zaposleniku, bez nepotrebnih tuđih radnih listi.
7. Izolacija organizacija i prethodna ograničenja ostaju pokriveni integracijskim testovima.
8. Liste prikazuju najviše 10 zapisa po stranici; filteri resetuju stranicu, prazni rezultati imaju razumljivo objašnjenje.
9. Nema menija za nedozvoljene akcije, zaglavljenog loading ekrana ili globalnog Shipping zahtjeva za Step 2/3.
10. Postojeći demo podaci i ručne izmjene ostaju sačuvani.

## 11. Granice prve verzije

Jedan Employee radi u jednom području. Višestruka područja, privremene zamjene, smjene i raspored po pojedinačnoj hali/sobi nisu dio prve verzije. Ne uvoditi nove nuklearne sigurnosne pragove ili pravila prihvatanja kroz UX reorganizaciju. Nazive vidljivih UI elemenata zadržati na engleskom kao u postojećoj aplikaciji.


## Izvedeno 13.09.2026.

- Primijenjena WorkArea migracija. Users ima obavezni izbor Step-a za Employee; promjene uloge/područja opozivaju staru sesiju.
- Dodana centralna API politika, serverske zaštite radnih ruta, client guard i razdvajanje query cachea prema ulozi/području.
- Employee početna prikazuje samo njegovo područje; upravljačke uloge vide sva tri. Navbar više ne učitava Shipping podatke globalno.
- Step 1 zadržava pretragu, statusne filtere, najnoviji unos prvi i 10 po stranici. Kreiranje Container Profile dostupno je upravljačkim ulogama; Employee može uređivati IN kamion.
- Step 2/3 imaju naslov, upute, ulaze u hale/sobe, razlikovanje praznog stanja od greške i paginaciju lokacija.
- Step 2 koristi sažetak zahtjeva za predaju umjesto punog pristupa final-storage lokacijama. Step 3 više ne koristi Shipping prijem za svoje transfere.
- Step 2 prijem i promjena statusa odabranih profila čine jednu transakciju; količine, kapacitet i ponavljanje prijema su provjereni.
- Transfer operacije imaju dozvole po smjeru i provjeru trenutnog stanja; Step 3 prikazuje stvarne transfer zahtjeve i potvrdu prijema.
- Pripremljeni lokalni računi: employee (Step 1), employee-pre-storage (Step 2), employee-final-storage (Step 3). Lozinke su u .local/demo-accounts.md, postojeće nisu resetovane.
- Provjereno: 19 integracijskih testova, 8 unit testova, lint i TypeScript provjera.

### Preostala razrada iz šireg plana

- Namjenske tablice istorije i upozorenja za Step 2/3, izvan postojećih detalja hale/sobe.
- Povezivanje metričkih kartica s preciznim filterima; trenutno vode na radnu listu područja.
- Potpuno praćenje porijekla skladišnih količina i rezervacija pri transferu zahtijeva zasebnu doradu postojećeg skladišnog modela. Ova verzija provjerava pristup i prelaze stanja; ne uvodi novi model zaliha.
- Vizuelna provjera u browseru za sve širine i sve račune nije završena u ovoj sesiji. Provjereni su lokalni API i serversko učitavanje dozvoljenih ruta.

Gornje faze ostaju specifikacija šireg razvoja; ovaj zapis precizira šta je stvarno isporučeno.

## Dodatak: istorija i pregled uslova

Dodani su `/pre-storage/history`, `/pre-storage/alerts`, `/final-storage/history` i `/final-storage/alerts`, s linkovima iz početne i radnih stranica. Istorija razdvaja mjerenja, prijeme i transfere; server vraća maksimalno 10 redova po stranici. Filteri lokacije provjeravaju pripadnost organizaciji. Pre-storage transferi se ne filtriraju po hali jer postojeći model nema tu vezu.

Pregled uslova koristi posljednje mjerenje po lokaciji, postojeću funkciju `getConditionLevel` i postojeće raspone. Prikazuje vrijeme mjerenja, warning/danger i lokacije bez mjerenja. Nije live sensor feed. Starija odstupanja ostaju u istoriji, ali se ne prikazuju kao trenutno upozorenje nakon novog urednog mjerenja.

Istorija transfera prikazuje trenutno stanje i datum kreiranja zahtjeva: postojeća baza nema vremenski dnevnik svih prelaza niti vrijeme prijema. To je izričito navedeno na stranici. Novi prikazi ne mijenjaju zalihe, pragove ili stare demo podatke.

Provjera: 20 integracijskih testova prolazi, kao i lint i TypeScript. Vizuelna provjera browserom i dalje nije izvršena u ovoj sesiji.

## Dodatak: povezivanje brojača s radnim listama

Brojači početne stranice sada sadrže konkretne destinacije. Shipping lista čita `view` iz URL-a; historija skladišta čita tip prikaza i status transfera. Step 2 ima paginiranu listu profila koji čekaju prijem, s porijeklom, količinom i referencom pošiljke. Link vodi u halu čiji konfigurirani Waste Profile odgovara profilu; ako podudaranje ne postoji, ekran prikazuje objašnjenje. Time se ne mijenjaju pravila prihvatanja ili podaci skladišta.

Browser provjera je pokušavana, ali trenutni browser runtime referencira nepostojeći `browser-service.mjs` iz stare verzije plugina. Nije izvršena vizuelna potvrda niti je mijenjana konfiguracija korisnikovih plugina.
