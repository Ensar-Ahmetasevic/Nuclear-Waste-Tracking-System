# Plan unapređenja UI/UX-a i animacija

Status: prijedlog za narednu implementaciju; ovaj dokument ne mijenja aplikaciju.
Datum: 13.09.2026.
Povezani dokument: [Radna područja za tri koraka](./STEP-WORKSPACES-PLAN.md).

## 1. Cilj

Radnik treba brzo i bez nedoumice odgovoriti na četiri pitanja:

1. Gdje trenutno radim?
2. Šta čeka moju obradu?
3. Nad kojim kontejnerima, transportom ili lokacijom radim?
4. Da li je moja akcija stvarno spremljena?

Za Administratora i Supervision dodati pitanje: gdje proces zahtijeva njihovu intervenciju?

Animacije trebaju objasniti promjenu i zadržati osjećaj kontinuiteta. Ne smiju služiti kao dokaz da je akcija izvršena, prikriti grešku, usporavati čest rad ili odvlačiti pažnju od podataka.

## 2. Polazno stanje i granice

Već postoje radna područja, zaštita API-ja, početne stranice, statusni filteri, najviše 10 zapisa po stranici, istorija skladišnih zapisa i pregled posljednjih mjerenja. Brojači su povezani s odgovarajućim listama. Ove funkcije unaprijediti, ne praviti paralelne verzije.

Trenutna ograničenja bitna za dizajn:

- Istorija transfera sadrži trenutni status i datum kreiranja zahtjeva, ne kompletnu istoriju prelaza.
- Nije dovršen model veze između izvornog tereta, pre-storage zalihe i final-storage transfera.
- Postojeći izbor odgovarajuće hale koristi tekstualno podudaranje konfiguracije i Waste Profile naziva; nije trajna veza po ID-u niti dovoljan dokaz kompatibilnosti.
- Postojeće osobe označene kao responsible employee nisu automatski povezane s login računima.
- Prikaz uslova koristi posljednje uneseno mjerenje, ne potvrđeni kontinuirani tok senzora.
- Vizuelna provjera svih uloga i širina ekrana još nije završena.

Plan ne uvodi nove fizičke postupke rukovanja otpadom, sigurnosne pragove ili regulatorna pravila. Takva pravila moraju doći iz odobrenih procedura organizacije. UI ne treba predstavljati „within configured range“ kao potvrdu ukupne sigurnosti lokacije.

## 3. Uloge i odgovornosti

| Korisnik | Primarni fokus | Istaknute radnje |
|---|---|---|
| Employee · Step 1 | Dolasci i stanje transporta | Evidentiraj dolazak, pregledaj IN transport, evidentiraj izlazak prema postojećim pravilima |
| Employee · Step 2 | Prijem i predaja iz pre-storage | Pregledaj dolazni profil, potvrdi/odbij prijem, obradi zahtjev za predaju, unesi mjerenje |
| Employee · Step 3 | Transfer i finalni prijem | Kreiraj zahtjev, pregledaj odgovor, potvrdi prijem, unesi mjerenje |
| Supervision | Obrada izuzetaka i nadzor sva tri koraka | Kreiraj Container Profile, pregledaj zadatke i upozorenja, kreiraj Employee račun s područjem |
| Administrator | Prava, konfiguracija i korekcije | Upravljaj računima, dodijeli područje, upravljaj definicijama, evidentiraj obrazloženu korekciju |

Zadržati postojeća ograničenja: Employee radi u jednom području, Container Profile uređuju upravljačke uloge, korekcije nakon OUT ostaju Administratoru. Animacija, skriveno dugme i frontend provjera nikad ne zamjenjuju serversku autorizaciju.

## 4. Radna početna: „Moji zadaci“

### 4.1. Raspored

1. Zaglavlje: radno područje, korisnik i stanje veze/posljednjeg osvježavanja.
2. Jedna glavna akcija karakteristična za područje.
3. Tri do četiri brojača sa direktnim linkom na filter.
4. Radna lista zadataka.
5. Sekundarni linkovi: lokacije, istorija i uslovi.

Upravljački pregled koristi isti jezik statusa, uz izbor koraka i pregled izuzetaka. Ne zatrpavati ga svim zadacima svih radnika odjednom.

### 4.2. Sadržaj zadatka

- Tip: dolazak, profil za obradu, prijem, predaja, korekcija ili pregled upozorenja.
- Stabilna referenca: ID transporta/profila/zahtjeva.
- Lokacija i tip otpada; količina kada je poznata.
- Vrijeme nastanka i trajanje čekanja; jasno navesti šta vrijeme predstavlja.
- Trenutni status, odgovorna uloga/područje i dozvoljena sljedeća akcija.
- Jedan glavni CTA: „Review receipt“, „Create Container Profile“, „Review transfer“.

„Moji zadaci“ u prvoj verziji znači zadaci dodijeljenog područja, ne lično preuzeti zadaci. To označiti kao „Work area tasks“. Lično preuzimanje uvoditi tek uz podatak o vlasniku zadatka i pravila za preuzimanje/oslobađanje.

### 4.3. Redoslijed i istovremeni rad

- Odvojiti upozorenja koja traže obradu od običnog reda prijema.
- Unutar reda čekanja najstariji neobrađeni zadaci prvi, uz mogućnost sortiranja.
- Shipping istorija zadržava najnoviji unos prvi; red zadataka i istorija imaju različitu namjenu i vidljivu oznaku sortiranja.
- Najviše 10 stavki po stranici, filteri u URL-u i reset stranice pri promjeni filtera.
- Ne premještati redove ispod pokazivača niti mijenjati red dok korisnik bira akciju. Prikazati „New updates available“ i osvježiti kontrolisano.
- Ako je drugi radnik završio zadatak, prikazati „Already processed“ nakon provjere servera i ponuditi osvježeni zapis.

## 5. Ekran pregleda i potvrde akcije

### 5.1. Predloženi tok prijema

1. Otvori zadatak.
2. Pregledaj referencu, izvor, Waste Profile, Container Type, količinu i odredište.
3. Unesi samo potrebne podatke; sistem unaprijed popunjava poznate reference.
4. Potvrdi sažetak.
5. Prikaži rezultat tek nakon uspješnog odgovora servera.

Na desktopu sažetak može biti uz formu; na uskom ekranu ide iznad završnog dugmeta. Izbjegavati modal unutar modala i višestruke drawere.

### 5.2. Tekst dugmadi i potvrde

| Općenito | Predloženi tekst |
|---|---|
| Save | Record arrival / Save measurement |
| Accept | Confirm receipt of 12 containers |
| Reject | Reject receipt / Return for revision |
| Delete | Delete draft, samo ako zapis zaista ima taj životni ciklus |
| Update | Save correction |

Dodatna potvrda pripada važnim završnim promjenama, a ne svakom polju i jednostavnom spremanju. Sažetak mora pokazati šta će se promijeniti. Ne uvoditi „Undo“ ako backend nema stvarno podržan i dozvoljen povrat.

### 5.3. Stanja spremanja

- Idle: forma je spremna, jasna glavna akcija.
- Invalid: poruka uz polje, sažetak grešaka i fokus na prvo problematično polje.
- Submitting: dugme zadržava širinu, prikazuje „Saving…“ i onemogućava ponovljeni submit.
- Success: sačuvana referenca, sažetak i link „Open record“; forma se zatvara samo nakon potvrde servera.
- Rejected/conflict: sačuvati unos, objasniti da se zapis promijenio i ponuditi pregled aktualnog stanja.
- Network timeout: „Save could not be confirmed“, ne automatski „Not saved“. Server je možda već završio zahtjev; provjeriti ishod prije ponavljanja.

Za ponavljanje važnih mutacija predvidjeti idempotency ključ i serversku provjeru očekivane verzije/stanja. Frontend blokada dugmeta sama nije zaštita od duplog zapisa.

## 6. Praćenje kroz tri koraka

### 6.1. Vizuelni prikaz

Na detaljima prikazati sažet vremenski tok:

- Arrival recorded.
- Container Profile prepared.
- Pre-storage receipt recorded.
- Transfer requested / approved.
- Final storage receipt recorded.

Svaka stavka ima datum, vrijeme, izvršioca, referencu i status. Buduće stavke prikazati kao „Not recorded“, bez izmišljenog vremena i procenta dovršenosti. Odbijanje i povrat na korekciju moraju biti vidljivi, ne nestati iz toka.

### 6.2. Preduslovi podataka

Prije kompletnog timelinea uvesti događaje nastale u istoj transakciji kao poslovna promjena, sa organizacijom, korisnikom, vremenom servera i referencama. Predvidjeti djelimične prijeme, razdvajanje količina i više transfera iz istog profila.

Za postojeće zapise prikazati samo dokazive događaje. Migracija ne smije predstaviti createdAt zahtjeva kao vrijeme fizičkog prijema niti pripisati radnju osobi bez evidencije.

Zaposleniku prikazati minimalan kontekst prethodnog koraka potreban za njegov posao. Ne otvarati mogućnost uređivanja tuđeg područja.

## 7. Upozorenja i mjerenja

### 7.1. Kartica upozorenja

Prikazati: lokaciju, parametar, izmjerenu vrijednost i jedinicu, korišteni raspon, vrijeme mjerenja, status obrade i link na detalje.

Razdvojiti dvije dimenzije:

- stanje mjerenja: unutar raspona, warning, izvan raspona, nema podatka, zastarjelo;
- stanje obrade: novo, pregledano, dodijeljeno, zatvoreno prema pravilima.

„Pregledano“ ne znači da je odstupanje nestalo. Novo uredno mjerenje ne smije brisati istorijski zapis odstupanja.

### 7.2. Neophodne odluke prije implementacije obrade

- Koliko dugo mjerenje vrijedi za svaku lokaciju/parametar?
- Ko može potvrditi pregled, dodijeliti i zatvoriti upozorenje?
- Da li se i kada eskalira Supervisionu?
- Šta razlikuje duplikat, novo odstupanje i nastavak istog odstupanja?

Do definisanja ovih pravila zadržati postojeći pregled posljednjih mjerenja s jasnim vremenom. Ne izmišljati rokove, automatsko zatvaranje ili proceduru intervencije.

## 8. Administrativne korekcije i evidencija

Za dozvoljene korekcije prikazati prije/poslije, razlog, korisnika i vrijeme. Za OUT transport eksplicitno označiti da se radi o korekciji završenog zapisa.

Predvidjeti neizmjenjivu evidenciju događaja za aplikacione korisnike, odvojenu od trenutnog stanja zapisa. Poslovna izmjena i događaj moraju uspjeti zajedno. Ne zapisivati lozinke, tokene ili nepotrebne lične podatke.

Za promjenu uloge ili područja prikazati posljedicu: „User will need to sign in again“. Tek nakon serverske potvrde promijeniti oznaku računa. Na ekranu za kreiranje korisnika zadržati jednostavan izbor uloge i, za Employee, obavezni Step.

Ne predstavljati ovaj plan kao dokaz regulatorne usklađenosti; zahtjevi čuvanja i izvoza evidencija ostaju zasebna poslovna odluka.

## 9. Animacije kao podrška radu

### 9.1. Pravila

- Kretanje objašnjava promjenu, ne dekorira svaki element.
- Isti događaj koristi isti stil u svim ulogama.
- Status mora ostati razumljiv bez animacije, boje i zvuka.
- Ne prikazivati animirani uspjeh prije potvrde servera.
- Bez treperenja, beskonačnih ping/pulse efekata na upozorenjima, parallaxa, konfeta i odbijanja kartica.
- Ne usporavati interakciju radi dovršavanja animacije. Korisnik može nastaviti čim je radnja dostupna.
- Animacije brojača ne smiju prolaziti kroz izmišljene međuvrijednosti: broj kontejnera se odmah mijenja na potvrđenu vrijednost.

### 9.2. Predloženi obrasci

Trajanja su početni dizajnerski parametri za testiranje, ne pravila poslovnog procesa.

| Situacija | Vizuelno ponašanje | Trajanje | Reduced motion |
|---|---|---|---|
| Hover/fokus dugmeta | Promjena obruba i podloge, bez skakanja dimenzija | 100–150 ms | Trenutna promjena ili blagi fade |
| Otvaranje menija | Fade i pomak do 4 px | 120–160 ms | Bez pomaka |
| Otvaranje modala | Fade podloge, mali pomak sadržaja do 8 px | 160–200 ms | Trenutno ili samo fade |
| Otvaranje drawera na mobilnom | Kratak pomak bočnog panela, bez promjene širine pozadine | 180–220 ms | Trenutno prikazivanje |
| Promjena filtera | Označiti izabrani filter; sadržaj bez izlazne animacije koja odgađa rad | 100–150 ms | Trenutno |
| Učitavanje liste | Statični skeleton približnih dimenzija ili tekst loading | Bez obaveznog ciklusa | Isti statični prikaz |
| Spremanje | Mala ikona aktivnosti uz tekst; stabilna širina dugmeta | Dok zahtjev traje | Tekst „Saving…“, bez rotacije |
| Potvrđeno spremanje | Jednokratni fade oznake i trajna poruka uz zapis | 150–200 ms | Trenutno |
| Završen zadatak | Označiti rezultat, zatim osvježiti listu; ne nestaje prije potvrde | Do 200 ms | Trenutno ažuriranje |
| Nova vrijednost brojača | Kratko naglasiti podlogu bez brojanja od nule | Do 200 ms | Statična vrijednost |
| Novi događaj u timelineu | Fade samo novog događaja | 150–200 ms | Trenutno |
| Upozorenje | Statična ikona, tekst i istaknut obrub; bez ponavljajuće animacije | Nema | Isto |
| Promjena prava računa | Kratko naglasiti potvrđenu oznaku područja/uloge | 150 ms | Trenutno |

### 9.3. Primjena po ulozi

Employee: minimalno kretanje, naglasak na unosu, spremanju i sljedećoj akciji. Bez animiranja svakog reda tokom ponovljenog osvježavanja.

Supervision: diskretno označiti da je nastao novi zadatak ili da se broj promijenio. Pregled izuzetaka ostaje stabilan dok ga korisnik čita.

Administrator: animacije promjene panela, otvaranja sažetka korekcije i potvrđenog spremanja. Promjenu prava objasniti tekstom, ne samo animacijom oznake.

### 9.4. Tehnička izvedba

- Prvo CSS/Tailwind transition i mali zajednički skup tokena: fast, normal, panel.
- Za jednostavne slučajeve animirati opacity i transform; izbjegavati ponovljeno animiranje veličine cijelih lista i teške filter efekte.
- Centralno podržati `prefers-reduced-motion`; ponuditi opciju „Reduce interface motion“ koja može dodatno smanjiti kretanje, ali ne nadjačati sistemsko smanjenje većim kretanjem.
- Ne dodavati novu animation biblioteku dok konkretan obrazac ne zahtijeva mogućnost koju CSS ne pokriva jednostavno.
- Ne čekati animationend za spremanje podataka, navigaciju, čišćenje zaključavanja ili vraćanje fokusa.
- Prekinuta animacija, promjena taba ili unmount ne smiju ostaviti overlay, zaključan scroll ili neaktivno dugme.

### 9.5. Postojeći elementi za reviziju

Provjeriti `components/shared/indicator.js` (animate-ping), `components/shared/warningMessage.js` (animate-pulse) i `components/shared/back-button.js` (hover povećanje). Popisati iste obrasce u ostalim ekranima, zatim ih zamijeniti zajedničkim pravilima. Ne pretpostaviti da su sadašnji efekti dosljedni ili prikladni za dug rad.

## 10. Pristupačnost i rad na terenu

- Ciljati klikabilne kontrole približno 44 × 44 CSS px ili veće gdje je to potrebno za rad dodirom; provjeriti stvarnu opremu radnika.
- Fokus uvijek vidljiv; kompletan tok dostupan tastaturom.
- Modal zadržava fokus, Escape zatvara kada nema neobrađene posljedice, zatvaranje vraća fokus na smislen element.
- Ako završena stavka nestane, fokus prelazi na stabilno zaglavlje liste ili sljedeći zadatak, ne na početak dokumenta bez objašnjenja.
- Statusne poruke preko aria-live, bez neprekidnog čitanja cijele liste. role=alert rezervisati za relevantne nove greške.
- Običan tooltip nije jedino mjesto s važnim informacijama; upozorenja i posljedice akcije vidljivi su i na touch uređajima.
- Ne oslanjati se na hover, crvenu/zelenu boju ili animaciju kao jedini signal.
- Provjeriti 200% zoom, duge nazive, velike vrijednosti i raspored bez horizontalnog skrolanja cijele stranice.
- Za skraćeni tekst osigurati dostupan puni sadržaj. Jedinice uvijek ostaju uz vrijednosti.

## 11. Veza, nacrti i oporavak od greške

- Razlikovati browser offline signal od dostupnosti API-ja i potvrde spremanja.
- Prikazati posljednje uspješno osvježavanje; ne označavati stare podatke kao svježe.
- Pri prolaznoj grešci sačuvati unos u aktivnoj formi. Automatsko trajno čuvanje osjetljivih podataka u localStorage nije podrazumijevano.
- Prvu verziju ograničiti na nacrt u memoriji. Serverske nacrte dodati tek uz pravila pristupa, trajanja i čišćenja.
- Ne uvoditi automatski offline red za prijeme i transfere bez rješavanja konflikata i duplih zahtjeva.
- Pri promjeni računa/područja ukloniti podatke i nacrte prethodne sesije.

## 12. Redoslijed implementacije i zavisnosti

| Faza | Isporuka | Preduslov / provjera |
|---|---|---|
| A | Inventar ekrana, stanja i postojećih efekata; jezik statusa; osnovni motion tokeni | Browser provjera mora biti dostupna za vizuelno prihvatanje |
| B | Work area tasks i pregled prijema za Step 2/3 | Serverski izvori zadataka, stvarno dozvoljene akcije i konfliktna stanja |
| C | Jedinstvena stanja forme, potvrda i oporavak od greške | Idempotentnost i transakcije za važne mutacije |
| D | Male animacije navigacije, formi i potvrda | Pristupačne osnovne komponente, reduced motion; bez promjene ovlaštenja |
| E | Evidencija događaja i razlog korekcije | Migracija, serversko bilježenje izvršioca, prije/poslije i atomsko spremanje |
| F | Timeline pošiljke/profila | Pouzdane veze i količine između koraka; ne prikazivati izmišljene stare događaje |
| G | Obrada i eskalacija upozorenja | Poslovno definisana svježina, odgovornosti i pravila zatvaranja |
| H | Provjera na ciljnoj opremi i dorada | Uključiti radnike sva tri koraka i upravljačke uloge |

Za početak isporučiti A–D na jednom kompletnom toku prijema. Tek nakon provjere isti obrazac prenijeti na ostale forme. Ne čekati timeline ili novi model upozorenja da bi se poboljšala svakodnevna navigacija.

## 13. Predložene komponente i mjesta promjena

- WorkAreaTaskList: lista, filteri, paginacija, prazno stanje i ažuriranja.
- ActionReview: sažetak prije potvrde, prilagođen konkretnoj poslovnoj akciji.
- SaveFeedback: submitting, success, error i nepoznat ishod zahtjeva.
- RecordTimeline: dokazivi događaji s referencama i izvršiocima.
- ConditionNotice: parametar, vrijeme, stanje mjerenja i zasebno stanje obrade.
- CorrectionReview: razlog i prije/poslije prikaz.
- Zajednički modal/drawer i motion stilovi u postojećem shared sloju.

Nazivi su prijedlog, ne nalog da se odmah napravi svaka komponenta. Izdvojiti zajednički kod kada se zaista koristi u više tokova.

Glavne postojeće tačke: `app/page.js`, `components/navbar/navbar.js`, `components/shared/`, forme prijema Step 2/3, `lib/server/api-route.js`, skladišni API-ji, Prisma schema/migracije i integracijski testovi.

## 14. Test scenariji

### Funkcionalno

- Login za Employee sva tri koraka, Supervision, Administrator i neraspoređen račun.
- Zadatak → sažetak → potvrda → spremljeni zapis → istorija.
- Odbijanje, povrat na korekciju, OUT ograničenje i dozvoljena administrativna korekcija.
- Dva korisnika obrađuju isti zadatak; dupli klik; ponavljanje nakon prekida odgovora.
- Promjena prava tokom otvorene forme; strani organization ID; direktan URL/API pokušaj.
- Nema podataka, duga lista, brisanje posljednjeg reda na stranici i nevažeći filter.

### Vizuelno i pristupačnost

- Mobilni portret približno 360–390 px, tablet i desktop; 200% zoom.
- Tastatura, čitač ekrana, dugi tekstovi i prikaz bez hovera.
- Normal motion i reduced motion na svakom obrascu.
- Spora mreža, API greška, offline, ponovno povezivanje i server uspjeh uz izgubljen odgovor.
- Brzo otvaranje/zatvaranje panela, promjena rute tokom animacije i više uzastopnih spremanja.
- Nema beskonačnog bljeskanja, pomjeranja fokusiranog reda, skakanja layouta ili uspjeha prije potvrde servera.

Automatski testovi trebaju provjeravati poslovno stanje, prava i oporavak; ne vezivati ih za tačno trajanje CSS animacije. Vizuelnu provjeru ne zamjenjuje uspješan TypeScript ili HTTP odgovor.

## 15. Kriteriji prihvatanja

- [ ] Radnik na početnoj može prepoznati područje, zadatak i sljedeću akciju bez otvaranja općeg menija.
- [ ] Svaka završna akcija prikazuje identitet zapisa, količinu i odredište kada su relevantni.
- [ ] Podaci se ne predstavljaju kao spremljeni prije potvrde servera; nepoznat ishod zahtjeva je jasno označen.
- [ ] Ponavljanje ne pravi duplikate, a konflikt ne prepisuje tuđi rad.
- [ ] Bez kretanja svi ekrani ostaju razumljivi i funkcionalni.
- [ ] Nema beskonačnih animacija upozorenja ni animiranog brojanja operativnih količina.
- [ ] Fokus, Escape, povratak na listu i najave statusa rade tastaturom i čitačem ekrana.
- [ ] Korekcije i timeline prikazuju samo stvarno evidentirane događaje.
- [ ] Pregled upozorenja razlikuje mjerenje od obrade i nedostajući podatak od urednog stanja.
- [ ] Postojeća prava i izolacija organizacija ostaju očuvani.
- [ ] Provjereni su stvarni prikazi za sve uloge na mobilnom i desktopu.

## 16. Kako procijeniti poboljšanje

Prije i poslije promjene, na istim demo zadacima, uporediti vrijeme do pronalaska zadatka, broj koraka do završetka, broj pogrešnih izbora i potrebu za pomoći. Zabilježiti da li radnik može vlastitim riječima objasniti šta je spremljeno i šta slijedi.

Ne uvoditi rangiranje zaposlenika po brzini ili automatsko praćenje njihovog rada kroz ovaj UX zadatak. Povratne informacije koristiti za poboljšanje interfejsa. Cilj nije najviše animacija niti najmanje klikova po svaku cijenu, već jasan tok s manje grešaka.

## Zapis implementacije: prvi tok prijema

Implementiran je prvi dio faza A–D za Step 2:

- Radna lista dolaznih profila označena je kao Work area tasks, s najstarijim čekanjem prvim; istorija ostaje najnovija prva.
- Pregled prijema pokazuje transport, profil, porijeklo, ambalažu, količinu i odredišnu halu, uz odvojen izbor odgovorne osobe.
- Završno dugme imenuje tačnu količinu. Količina se ne mijenja u ovom toku; odstupanje se vraća na pregled.
- Prijem ima edit/review/saving/success/error/unknown stanja. Potvrđeni rezultat pokazuje broj i vrijeme prijema; ne zatvara se automatski.
- Spremanje dobija receiptKey i fingerprint. Ponovljen isti zahtjev vraća isti sačuvani prijem; promijenjeni podaci pod istim ključem daju konflikt. Backend transakcija zadržava provjeru količine, kapaciteta i trenutnog statusa.
- Kod timeouta prikazuje se nepoznat ishod i Check save result, koji koristi isti zahtjev. Unos ostaje u memoriji; nema offline reda niti skladištenja poslovnih podataka u browser storage.
- Native dialog koristi top layer, fokus pri otvaranju, Escape i povratak fokusa. Završetak osvježava radnu listu nakon što korisnik pročita potvrdu.
- Dodani su motion tokeni i kratki efekti ulaska/potvrde, smanjeno kretanje kroz sistemsku postavku i dodatna opcija u My account za ovaj browser.
- U zajedničkim Indicator/WarningMessage komponentama uklonjeno je ponavljajuće pulsiranje; Back dugme više ne skače u veličini i ima pristupačnu oznaku.

Provjereno: 21 integracijski test, uključujući isti pokušaj prijema i konflikt izmijenjenog zahtjeva; lint i TypeScript provjera. Nova migracija primijenjena je na lokalnu demo bazu, bez resetovanja podataka.

Ovo nije završetak cijelog plana. Potrebni su vizuelna provjera dijaloga, fokusa, mobile i reduced-motion prikaza, zatim primjena potvrđenog obrasca na Step 3 i ostale forme. Evidencija korekcija, kompletan timeline i životni ciklus upozorenja ostaju kasnije faze sa navedenim preduslovima.

### Zapis implementacije: potvrda transfera u Step 3

- Lista transfera sada otvara pregled prije potvrde prijema ili vraćanja na doradu. Pregled pokazuje odredište, količinu, konfiguraciju prostorije i evidentiranog podnosioca zahtjeva.
- Prijem i vraćanje imaju eksplicitnu potvrdu, stanje snimanja, potvrđen rezultat i odvojeno stanje kada rezultat zbog prekida veze nije poznat. Ponavljanje koristi isti identifikator radnje.
- Server provjerava pregledanu verziju transfera. Zastarjeli pregled dobija konflikt i zahtijeva ponovno učitavanje. Promjena statusa i zapis radnje izvršavaju se u jednoj transakciji.
- Zapis radnje sadrži korisnika iz sesije, vrijeme, količinu i razlog vraćanja (obavezno 3–1000 znakova). Ponovno slanje iste potvrde vraća postojeći rezultat bez duplikata.
- Dijalog koristi postojeće kratke animacije, poštuje smanjeno kretanje, upravlja fokusom i blokira zatvaranje tokom snimanja.
- Provjera: 22 integracijska testa prolaze, uključujući ponavljanje, konflikt verzije, razlog vraćanja i izolaciju organizacija. Typecheck, lint i lint novih UI komponenti prolaze. Migracija je primijenjena lokalno; postojeći podaci su sačuvani.
- Vizuelna provjera u browseru još nije izvršena zbog nedostupnog browser alata. Ova isporuka ne dodaje kompletan timeline niti mijenja postojeći obračun fizičkih zaliha; to ostaje naredni dio plana.


### Zapis implementacije: administrativna korekcija podataka OUT transporta

- Edit shipment details sada ima unos → pregled prije/poslije → eksplicitno spremanje → rezultat. OUT transport je jasno označen kao završeni zapis koji administrator koriguje.
- Za kompaniju, vozača i tablice na OUT transportu server zahtijeva razlog, pregledano prethodno stanje i jedinstveni identifikator potvrde. Provjera obuhvata i status transporta; zastarjeli pregled ne prepisuje novije podatke.
- Izmjena i ShippingCorrection zapis nastaju u istoj transakciji. Evidentiraju se stvarne vrijednosti prije/poslije, korisnik iz sesije, razlog i vrijeme servera. Ponovljena ista korekcija vraća originalni rezultat. Aplikacija ne izlaže API za izmjenu/brisanje ovih zapisa.
- Administrator na detaljima transporta vidi posljednjih 10 korekcija tih polja. Identitet izvršioca je stabilni ID korisnika. Zapisi nisu vezani kaskadnim brisanjem za transport; to nije kompletna politika čuvanja/izvoza evidencije.
- Forma koristi native dialog, postojeće motion stilove, fokus na naslov, Escape i vraćanje fokusa na dugme Edit. Ispravljen je i nevažeći JSX uslov za Add Containers pronađen pri provjeri ovog ekrana.
- Provjereno: 23 integracijska testa, TypeScript i lint. Browser alat ponovo radi: vizuelno provjeren pregled korekcije u trenutnom viewportu (~607 px), Escape i vraćanje fokusa, bez spremanja probnih izmjena u lokalnu bazu. Kompletna provjera širina, čitača ekrana i svih uloga ostaje otvorena.
- Granice ove isporuke: evidencija se odnosi na navedena tri polja OUT transporta. Korekcije statusa/datuma, kontejnera, prava korisnika i drugih entiteta još nisu obuhvaćene. IN izmjene imaju pregled i provjeru prethodnog stanja, ali ne koriste evidenciju OUT korekcija.

### Trenutni status faza (ažurirano 21.09.2026.)

| Faza | Status |
|---|---|
| A–D | Većina glavnih tokova ima pregled, potvrdu i oporavak: dolazak/izlazak, prijem, transfer, mjerenja i korisnički računi. Preostale stare forme i sistematska provjera ostaju otvorene. |
| E | Evidentirani su prijemi/transferi, dolazak/izlazak, korekcije podataka/statusa/datuma transporta, promjene prava i kreiranje računa. Ostale korekcije, uključujući kontejnere, ostaju. |
| F | Postoje veze prijema/izvora transfera/finalnog prijema, timeline i usklađen obračun zaliha. Transfer iz više izvora je implementiran i ciljano provjeren. Usklađivanje legacy podataka i puni obuhvat istorije ostaju otvoreni. |
| G | Pregled mjerenja je unaprijeđen; obrada i eskalacija ostaju otvorene uz odluke iz 7.2. |
| H | Obavljene su ciljane browser provjere i 36 integracijskih testova. Matrica svih uloga, opreme, mrežnih grešaka i pristupačnosti još nije završena. |

### Zapis implementacije: osvježavanje i URL filteri

- Početna, lista transporta i zajednički skladišni pregledi prikazuju vrijeme posljednjeg uspješnog učitavanja podataka i ručni Refresh. Browser offline signal je posebno označen i ne predstavlja dokaz dostupnosti API-ja.
- Isključeno je automatsko osvježavanje tih upita pri povratku u prozor i ponovnom povezivanju. Nakon povratka na tab korisnik dobija poziv da provjeri promjene, bez tvrdnje da novi podaci sigurno postoje. Eksplicitne poslovne mutacije i navigacija i dalje mogu osvježiti podatke.
- Greška osvježavanja ne uklanja prethodno učitane podatke; poruka upozorava da mogu biti zastarjeli. Početna greška ima mogućnost ponovnog pokušaja. Zahtjevi imaju timeout od 20 sekundi. Ovo nije automatski offline red niti trajno čuvanje poslovnih podataka.
- Shipping pretraga, filter i stranica sada su u URL-u; skladišni tip zapisa, status, lokacija i stranica također. Promjena filtera resetuje stranicu, a promjena vrste zapisa uklanja neprimjenjive filtere.
- Browser provjera: OUT izbor sačuvan nakon reload-a, ručni Refresh mijenja vrijeme i zadržava izbor; skladišni status iz URL-a i prazno stanje pravilno prikazani. Vizuelno provjeren desktop i popravljeno prelamanje kontrola statusa/lokacije.
- Granice: nije uvedena pozadinska detekcija novih događaja, lično preuzimanje zadataka niti rok zastarijevanja mjerenja. Vrijeme osvježavanja označava prijem odgovora u browseru, ne vrijeme mjerenja. Sve veličine ekrana i scenariji prekida veze još zahtijevaju sistematsku provjeru.

### Zapis implementacije: pregled događaja transfera (14.09.2026.)

- Dodan je Transfer events tab u istoriju Step 2/3. Prikazuje samo postojeće TransferAction zapise: potvrdu finalnog prijema ili povrat na doradu, vrijeme događaja, količinu, referencu transfera, ID korisnika i razlog.
- Najnoviji događaji su prvi, uz 10 stavki po stranici i postojeće ručno osvježavanje/URL paginaciju. Step 3 može filtrirati po lokaciji; Step 2 ne dobija link za uređivanje Step 3 niti izmišljenu vezu s pre-storage halom.
- API bira samo polja za prikaz; interni fingerprint i ključ ponavljanja nisu uključeni. Postojeća organizacijska i radna ograničenja ostaju na API-ju.
- Dodan je integracijski scenario za paginaciju, razloge, uloge i strane lokacije. Novo izvršavanje integracijskih testova blokirano je automatskom provjerom odobrenja zbog interne nekompatibilnosti nakon sažimanja konteksta; uspjeh novog scenarija nije potvrđen. Vizuelna provjera ove isporuke nije završena.
- Ovo je pregled evidentiranih akcija transfera, ne kompletan timeline transporta kroz sva tri koraka. Nisu rekonstruisani događaji za stare zapise.

### Dopuna provjere događaja transfera (14.09.2026.)

Prethodna blokada alata je otklonjena. Svih 24 integracijskih testova prolazi, uključujući novi scenario za razloge, paginaciju i prava pristupa događajima. U korisnikovom browseru provjeren je Final storage → Transfer events u viewportu 622 × 702: odabran tab, filter lokacije, prazno stanje i uspješan Refresh uz promjenu vremena. Nisu dodavani probni događaji u demo bazu; prikaz popunjenih podataka provjeren je integracijskim testom, ne vizuelno. Kompletna provjera svih veličina i uloga ostaje otvorena.


### Zapis implementacije: događaji zahtjeva i odluka Step 2 (14.09.2026.)

- Novi zahtjev za transfer sada u istoj transakciji bilježi TRANSFER_REQUESTED, količinu, korisnika iz sesije i vrijeme servera.
- Odobrenje i odbijanje u pre-storage bilježe PRE_STORAGE_ACCEPT_REQUEST / PRE_STORAGE_REJECT_REQUEST zajedno s promjenom statusa. Neuspjela promjena ne ostavlja događaj. Ponovni pokušaj već obrađene odluke zaustavlja provjera trenutnog statusa.
- Transfer events prikazuje nazive za sve navedene događaje uz postojeće finalne potvrde i povrate. Za stare transfere nisu rekonstruisani nedostajući događaji.
- Provjera: 25 integracijskih testova prolazi, uključujući tok kreiranje → odobrenje → prijem, odbijanje, neispravnu odgovornu osobu uz rollback i ponovljeno odobrenje. Typecheck i lint prolaze. U browseru provjeren ažurirani tekst pregleda; demo baza nije popunjavana probnim događajima.
- Granice: ovo ne povezuje fizičke količine od izvornog profila do konačne lokacije. Kreiranje zahtjeva i Step 2 forme još trebaju isti pregled, obavezni razlog odbijanja i oporavak pomoću identifikatora pokušaja kao završni prijemi. Automatski dodijeljeni ključ događaja nije zaštita od ponovnog kreiranja cijelog zahtjeva.

### Preostali prioriteti (ažurirano 15.09.2026.)

Pregled i pouzdano ponavljanje kreiranja transfera i odluka Step 2 su implementirani; ne tretirati starije zapise ispod kao trenutnu listu preostalih zadataka.

1. Pregled završnih radnji Step 1 i jedinstvena stanja preostalih formi, uključujući mjerenja.
2. Proširena evidencija preostalih administrativnih korekcija: statusi/datumi, kontejneri i prava korisnika.
3. Model pouzdanih veza i količina između profila, pre-storage prijema i transfera za puni timeline.
4. Poslovne odluke za obradu upozorenja: rok važenja mjerenja, odgovornosti, eskalacija i zatvaranje.
5. Sistematska provjera svih uloga, širina, tastature, čitača ekrana i smanjenog kretanja; provjera scenarija sporog/izgubljenog odgovora.
6. Pozadinska detekcija dostupnih ažuriranja bez automatskog premještanja radnih redova.

### Zapis implementacije: pregled i ponavljanje odluka Step 2 (14.09.2026.)

- Odobrenje transfera sada ide kroz unos količine i odgovorne osobe, pa pregled prije eksplicitne potvrde. Prikaz razlikuje traženu i odobrenu količinu. Odobrenje nije označeno kao fizički prijem.
- Odbijanje koristi pregled i obavezan razlog od 3–1000 znakova koji se sprema u događaj. Step 2 i Step 3 koriste zajednički dijalog sa stanjima snimanja, potvrđenog rezultata, konflikta i nepoznatog ishoda.
- Sve odluke transfera na PUT endpointu zahtijevaju actionKey i expectedVersion. Isti pokušaj vraća postojeći rezultat; izmijenjeni podaci pod istim ključem i zastarjela verzija daju konflikt. Količina i odgovorna osoba uključene su u fingerprint odobrenja.
- Pre-storage izvor zahtjeva vraća version. Pri otvaranju pregleda čuva se kopija odabranog zahtjeva. Podaci se osvježavaju nakon zatvaranja potvrđenog rezultata.
- Lista zahtjeva zamjenjuje bočni panel s pulsiranjem: najstariji zahtjev prvi, najviše 10 po stranici, pristupačna dugmad za pregled odobrenja/odbijanja.
- Provjera: svih 25 integracijskih testova prolazi uz proširene provjere replay-a, promijenjene količine, konflikta verzije, rollback-a i sačuvanog razloga. Typecheck i lint prolaze. Vizuelni tok s popunjenim zahtjevom još treba provjeriti.
- Preostalo: isti obrazac kreiranja novog zahtjeva u Step 3, šira evidencija korekcija, pouzdano povezivanje zaliha i puni timeline, pravila upozorenja i sistematska pristupačnost. Ova isporuka ne mijenja model fizičkih zaliha.

### Zapis implementacije: kreiranje transfera Step 3 (15.09.2026.)

- Forma ima unos količine i odgovorne osobe, pregled odredišta i podataka, eksplicitno slanje i potvrđen rezultat s brojem zahtjeva. Jasno razlikuje zahtjev od transporta i fizičkog prijema.
- POST zahtijeva actionKey. Isti korisnik i isti podaci vraćaju originalni transfer i događaj; izmijenjeni podaci pod istim ključem daju konflikt. Provjerava se naziv pregledanog odredišta, a reference ostaju organizacijski ograničene.
- Slanje i događaj su atomski. Timeout prikazuje nepoznat ishod i nudi ponavljanje istog zahtjeva. Forma čuva unos u memoriji, podržava povratak na unos prije slanja i ne zatvara potvrdu automatski.
- Svih 25 integracijskih testova prolazi, uključujući ponovljeno kreiranje bez duplikata, promijenjenu količinu, zastarjeli naziv odredišta i neispravnog zaposlenika bez kreiranja transfera. Typecheck i lint prolaze.
- Port 3000 je pri provjeri koristio drugi projekat. Razvojni launcher sada podržava NWTS_DEV_PORT (podrazumijevano 3000), uz usklađen NEXTAUTH_URL i lokalne upute. NWTS je pokrenut na 3001; browser potvrđuje ekran prijave, ali popunjeni tok forme nije vizuelno provjeren u ovoj sesiji.
- Preostale cjeline plana: proširene administrativne korekcije, stvarne veze količina kroz sva tri koraka i puni timeline, poslovna pravila upozorenja i sistematska vizuelna/pristupačna provjera.


### Zapis implementacije: dokazivo vrijeme finalnog prijema (15.09.2026.)

- Final storage → Receipts prikazuje datum iz događaja FINAL_STORAGE_ACCEPT_RESPONSE, broj potvrde i izvršioca. Datum kreiranja zahtjeva ostaje zasebno označen.
- Stari primljeni transferi bez potvrde imaju null vrijeme/izvršioca i vidljivo objašnjenje nedostajuće evidencije. Ne dodaju se izmišljeni događaji niti se datum zahtjeva koristi kao zamjena.
- Količina potvrđenog prijema dolazi iz sačuvanog događaja. Za legacy zapis ostaje postojeća količina uz napomenu da potvrda nedostaje.
- Lista zadržava paginaciju po najnovijem zahtjevu i to izričito navodi. Transfer events ostaje pregled po vremenu događaja.
- Ova izmjena ispunjava dio zahtjeva za tačnim istorijskim prikazom, ali ne završava puni timeline niti model zaliha.
- Provjera ove isporuke: svih 26 integracijskih testova prolazi, uključujući različite datume zahtjeva/prijema i legacy zapis bez potvrde. Typecheck i lint prolaze. Vizuelna provjera popunjenih kartica nije izvršena.

### Zapis implementacije: pregled izlaska kamiona Step 1 (15.09.2026.)

- OUT dugme otvara pregled transporta, kompanije, vozača i tablica, s objašnjenjem da Employee/Supervision nakon izlaska imaju read-only zapis.
- Završna potvrda ima stanja snimanja, uspjeha, konflikta i nepoznatog ishoda. Potvrđeni rezultat ostaje otvoren do Done. Native dialog koristi zajedničke motion stilove, fokus i Escape.
- Novi organizacijski ograničen POST /api/shipping-informations/departure zahtijeva actionKey i pregledane podatke. Isti pokušaj istog korisnika vraća originalni izlazak; izmijenjeni ili već obrađeni zapis daje konflikt. Događaj i OUT status/exitDateTime snimaju se zajedno; vrijeme dolazi sa servera.
- ShipmentDeparture bilježi korisnika, vrijeme i snimak podataka pri izlasku. Na detaljima se prikazuje posljednji evidentirani izlazak. Ne rekonstruiše se istorija starih OUT zapisa. Administratorska korekcija datuma/statusa ostaje odvojena nedovršena cjelina evidencije; stari PATCH je sada ograničen na administratore.
- Svih 27 integracijskih testova prolazi, uključujući replay radnika nakon OUT, nepromijenjeno vrijeme izlaska, zastarjeli pregled, prava područja i izolaciju organizacije. Typecheck i lint prolaze. Popunjeni dijalog još nije vizuelno provjeren.
- Migracija je dodata bez brisanja postojećih podataka; lokalni NWTS koristi port 3001.

### Zapis implementacije: unos mjerenja Step 2 i Step 3 (16.09.2026.)

- Oba područja koriste zajednički native dialog za unos mjerenja: validacija uz polje, zadržavanje unosa nakon greške, stanje spremanja i potvrđen rezultat s brojem zapisa, vremenom evidentiranja i izvršiocem. Pregled uključuje lokaciju i odgovornu osobu. Dijalog koristi postojeće motion stilove i vraća fokus na okidač pri zatvaranju.
- Nula više nije tretirana kao prazno polje. Vlažnost zadržava decimale; pritisak u Step 3 također. Step 2 zadržava postojeći cjelobrojni model pritiska i jasno traži cijeli hPa. Postojeći rasponi ocjene uslova nisu mijenjani.
- POST zahtijeva submissionKey. Isti pokušaj istog korisnika vraća postojeći zapis, a izmijenjeni podaci pod istim ključem daju konflikt. Nakon prekida veze UI omogućava provjeru istog pokušaja. Ispravka nakon potvrđene greške validacije radi i pri slanju tipkom Enter.
- Izvršilac dolazi iz prijavljenog računa na serveru. Migracija dodaje nullable submissionKey i recordedById bez izmišljanja izvršioca za ranija mjerenja.
- Provjera: svih 28 integracijskih testova prolazi, uključujući nulu, decimale, replay bez duplikata, konflikt, nedozvoljene vrijednosti i ograničenje područja rada. Typecheck, API lint i ciljano lintiranje nove forme prolaze. Migracija je primijenjena lokalno; NWTS je pokrenut na http://localhost:3001. Popunjeni dijalog još nije vizuelno provjeren.
- Preostalo: ostali stari obrasci, šira evidencija korekcija, povezivanje stvarnih zaliha kroz tri koraka, pravila obrade upozorenja i sistematske vizuelne/pristupačne provjere. Cjelokupan plan još nije završen.

### Zapis implementacije: miran i čitljiv pregled mjerenja (16.09.2026.)

- Step 2 i Step 3 koriste zajednički pregled zadnjeg mjerenja. Svaka kartica ima vrijednost, jedinicu i tekstualni status; status ne zavisi od boje ili animacije. Uklonjeno je ponavljajuće pulsiranje i ping upozorenja, uključujući preostali indikator zahtjeva iz Entry dijela.
- Rasponi su dostupni preko native details/summary kontrole koja radi na dodir i tastaturu. Dugme za novo mjerenje ne skače niti mijenja veličinu na hover.
- Odgovorna osoba odvojena je od korisnika koji je evidentirao zapis. Uklonjeni su lažna demo fotografija i naslov koji je odgovornu osobu prikazivao kao izvršioca. Nedostajuća osoba, vrijeme ili vrijednost prikazuju se kao nedostajući podatak; nula ostaje vidljiva.
- Objašnjenje razlikuje klasifikaciju mjerenja od obrade upozorenja. Postojeća funkcija klasifikacije i poslovni rasponi nisu mijenjani.
- Ciljani lint i typecheck prolaze. Pretraga komponenti i app direktorija više ne nalazi animate-ping/animate-pulse. Vizuelna provjera popunjenih ekrana i sistematska provjera pristupačnosti još ostaju otvorene.

### Zapis implementacije: pregled dolaska kamiona Step 1 (16.09.2026.)

- Unos kompanije, vozača i tablica sada vodi na pregled prije eksplicitne potvrde dolaska. Validacija odbija praznine i predugačke vrijednosti uz poruku pored polja. Native dialog podržava fokus, Escape i postojeće motion postavke.
- Spremanje ima zasebno stanje, potvrđen rezultat ostaje otvoren do Done, a prekid veze nudi provjeru istog pokušaja. Podaci se ne brišu niti se forma zatvara prije potvrde servera. Rezultat prikazuje transport, originalni snimak podataka, vrijeme i izvršioca te upućuje na unos kontejnera.
- POST /api/shipping-informations zahtijeva actionKey. ShipmentArrival i transport nastaju u istoj transakciji. Isti pokušaj vraća originalnu potvrdu; promijenjeni podaci pod istom oznakom daju konflikt. Evidencija dolaska opstaje nakon izmjene ili brisanja transporta, pa replay ne stvara zamjenski transport.
- Migracija ne mijenja postojeće transporte i ne dodaje izmišljene dolaske za stare zapise.
- Svih 29 integracijskih testova prolazi, uključujući validaciju, isti pokušaj nakon promjene/brisanja i podudaranje vremena dolaska. Typecheck, lint i ciljano lintiranje obrasca prolaze. Lokalni NWTS je ponovo pokrenut na portu 3001 s novom migracijom. Vizuelna provjera popunjenog dijaloga ostaje otvorena.
- Ova isporuka završava obrazac novog dolaska; preostali obrasci, šira evidencija korekcija, zalihe/timeline, obrada upozorenja i sistematske UI provjere još nisu završeni.

### Zapis implementacije: administratorske korekcije statusa i datuma (16.09.2026.)

- Detalji transporta izlažu zasebnu administratorsku akciju Correct status or dates. Unos koristi lokalno vrijeme s oznakom vremenske zone, pregled prije/poslije i obavezan razlog. Potvrđen rezultat ostaje otvoren; nepoznat ishod omogućava provjeru istog pokušaja.
- PATCH više ne mijenja status/datume bez evidencije. Zahtijeva pregledane vrijednosti, actionKey i razlog. ShippingCorrection čuva prethodne i nove datume/status, korisnika i vrijeme; izmjena i događaj snimaju se zajedno. Replay vraća originalnu potvrdu, a zastarjeli pregled daje konflikt.
- IN zahtijeva prazan datum izlaska; OUT zahtijeva datum izlaska koji nije prije dolaska. Vraćanje OUT na IN u pregledu izričito objašnjava ponovno omogućavanje dozvoljenih radničkih akcija. Korekcija ne stvara novi događaj fizičkog dolaska/izlaska.
- Postojeći pregled posljednjih deset korekcija prikazuje i status/datume. Prava se provjeravaju na serveru; Employee i Supervision nemaju pristup akciji.
- Svih 30 integracijskih testova prolazi, uključujući audit, replay, konflikt, neispravne datume, vraćanje IN i izolaciju organizacije. Typecheck, lint i ciljane provjere komponenti prolaze. Nije potrebna nova migracija. Popunjeni dijalog još nije vizuelno provjeren.
- Preostali obim plana i dalje uključuje ostale obrasce/korekcije, povezivanje zaliha, puni timeline, obradu upozorenja i sistematske UI/pristupačne provjere.

### Zapis implementacije: promjene korisničkih prava (16.09.2026.)

- Edit account sada otvara native dijalog s pregledom promijenjenih vrijednosti, obaveznim razlogom i eksplicitnom potvrdom. Promjena uloge/područja objašnjava novu prijavu, a deaktivacija gubitak pristupa. Oznake na listi osvježavaju se nakon serverske potvrde i zatvaranja rezultata.
- PUT /api/users zahtijeva pregledano stanje i actionKey. Promjena računa i AccountChange zapisuju se zajedno. Zastarjeli pregled i promijenjen sadržaj istog pokušaja daju konflikt; replay ne opoziva sesiju drugi put.
- Evidencija čuva prije/poslije za role/workArea/active, nazive svih izmijenjenih polja, razlog, korisnika i vrijeme. Ne kopira lozinke, tokene, email ili ime u audit snimke. Lične vrijednosti prikazuju se samo u pregledu otvorene izmjene. Fingerprint se ne izlaže u listi istorije.
- Administrator vidi posljednjih 20 događaja organizacije u Users. Supervision ne dobija ovu evidenciju; postojeća hijerarhija kreiranja računa ostaje. Događaji za stare izmjene nisu rekonstruisani.
- Svih 31 integracijskih testova prolazi, uključujući audit bez tajni, zastarjeli pregled, isti pokušaj i jednokratno povećanje verzije sesije. Typecheck, lint i ciljano lintiranje UI-ja prolaze. Migracija primijenjena lokalno; NWTS radi na 3001.
- Popunjeni dijalog još nije vizuelno provjeren. Kreiranje novog računa ostaje postojeći obrazac i zasebna preostala stavka; ova isporuka pokriva izmjene postojećih računa.

### Zapis provjere: browser, dolazak i Step 2 mjerenja (16.09.2026.)

Provjera na lokalnom portu 3001 s postojećom Supervision sesijom, bez spremanja probnih poslovnih zapisa:

- Dolazak: prazna obavezna polja prikazuju poruke i fokus ide na Company name. Popunjeni pregled s dugim nazivom kompanije prikazuje podatke i eksplicitni Confirm arrival. Escape vraća fokus na Add arrival. Pregled provjeren u početnom viewportu (~633 px), a forma i na 390 × 844 px.
- Step 2 mjerenja: prazna forma prikazuje sažetak i poruke uz sva obavezna polja; fokus ide na Temperature. Escape vraća fokus na Record new measurement. Provjeren prikaz na 390 × 844 i 1280 × 900 px, bez horizontalnog prelivanja dijaloga (scrollWidth jednak clientWidth). Na desktopu tastatura ulazi u prvo polje s vidljivim fokusom.
- Usklađenost sačuvanih vrijednosti i oporavak zahtjeva ostaju pokriveni postojećim integracijskim testovima; ova browser provjera nije slala validan zahtjev za spremanje.
- Viewport je vraćen na prvobitnu postavku, a browser na listu transporta. U ovoj provjeri nisu pronađeni problemi koji zahtijevaju izmjenu koda.
- Ovo zatvara dio prethodno otvorene vizuelne provjere navedenih formi, ne cijelu fazu H. Ostaju Step 3, administratorski dijalozi, ostale uloge, kompletno kruženje fokusa, čitač ekrana, 200% zoom, reduced motion i simulirani mrežni prekidi.

### Zapis provjere i dorade: Step 3 i povratak fokusa (17.09.2026.)

- U browseru s postojećom Supervision sesijom provjeren zahtjev za transfer na 390 × 844 px: unos količine/osobe, pregled odredišta, povratak na unos i Escape. Nije poslan probni zahtjev.
- Pronađen i ispravljen problem: Back to edit uklanja fokusirano dugme, pa je fokus odlazio na BODY. Nakon izmjene i ponovnog učitavanja potvrđeno da fokus prelazi na Requested quantity i da podaci ostaju sačuvani. Escape vraća fokus na Send New Request.
- Isti prelaz faza dobija eksplicitno upravljanje fokusom u obrascima dolaska i korekcije transporta. Njihova nova izmjena fokusa nije zasebno ponovo vizuelno provjerena.
- Kod potvrđene greške Step 3 zahtjeva postoji Back to edit; novi pregled dobija novi pokušaj spremanja. Nepoznat ishod zadržava originalni payload i Check request result. Poslovna API pravila nisu mijenjana.
- Step 3 mjerenja: na 390 px prazna forma daje poruke i fokus na prvo polje; Escape vraća fokus na Record new measurement. Dijalog nema horizontalno prelivanje. Nisu spremljena mjerenja.
- Typecheck i ciljano lintiranje tri promijenjene komponente prolaze. Viewport vraćen na prvobitnu postavku. Faza H i dalje ostaje otvorena za ostale uloge, administratorske dijaloge, reduced motion, čitač ekrana, zoom i simulirane mrežne greške.

### Zapis implementacije: vremenska linija transporta i veze prijema (17.09.2026.)

- Na detaljima transporta dodat Shipment timeline, do 50 posljednjih događaja po vremenu. Prikazuje sačuvane dolaske/izlaske, kreiranje postojećih Container Profile zapisa bez izmišljenog izvršioca, povezane pre-storage prijeme i administratorske korekcije (samo Administratoru).
- Novi ReceiptAllocation zapis povezuje svaki profil u prijemu s transportom, prijemom, halom, količinom profila, odgovornom osobom, prijavljenim izvršiocem i serverskim vremenom prijema. Nastaje u istoj transakciji kao prijem i promjene statusa; ponavljanje postojeće potvrde ne dodaje veze. Scalar reference čuvaju evidentirani događaj nezavisno od kasnijeg brisanja operativnog profila.
- Stari pre-storage prijemi nisu retroaktivno povezani: postojeća tabela nema dovoljno podataka za dokazivu vezu. Vremenska linija izričito razlikuje nedostajuću vezu od tvrdnje da se događaj nije desio. Tekući datumi transporta nisu pretvoreni u događaje dolaska/izlaska.
- Ovo je dio faze F, ne kompletna implementacija: povezivanje količina s transferima/finalnim prijemom, djelimični prijemi i razdvajanje zaliha ostaju. Postojeći model obračuna kapaciteta nije promijenjen.
- Svih 32 integracijska testa prolazi. Proširena provjera prijema potvrđuje jednokratnu vezu i prikaz tačne količine/vremena; novi test provjerava legacy zapis bez događaja, izolaciju organizacije i vidljivost korekcija. Typecheck, lint i ciljano lintiranje komponente prolaze.
- Migracija primijenjena lokalno. Browser sa Supervision sesijom prikazuje novu sekciju i upozorenja o nepotpunoj evidenciji na postojećem transportu. Geometrija na 390 px ostaje unutar širine stranice; viewport vraćen na početnu postavku. Nisu kreirani probni lokalni prijemi.

### Zapis implementacije: izvor transfera i finalni prijem (20.09.2026.)

- Novo pre-storage odobrenje zahtijeva izbor konkretnog ReceiptAllocation izvora. UI prikazuje prijem, profil, halu i količinu koja nije dodijeljena povezanim transferima. Sažetak prije odobrenja uključuje transport/profil/halu. Bez dokazivog izvora novo odobrenje nije moguće; postojeći nepovezani podaci nisu retroaktivno povezani.
- TransferSource čuva izvor, količinu, odredište i reference na događaje odobrenja i odluke finalnog skladišta. Jedno odobrenje koristi jedan izvor; isti izvor može biti raspoređen kroz više transfera. Sabiranje reserved/completed dodjela u transakciji sprečava prekomjernu dodjelu, uključujući dva istovremena odobrenja.
- Vraćanje zahtjeva na doradu označava dodjelu kao released; reodobrenje pravi novu evidentiranu dodjelu. Finalni prijem je completed i ostaje vezan za događaj potvrde. Ove oznake predstavljaju dodjelu i odluku u postojećem toku, ne dodatnu potvrdu fizičkog povratnog transporta.
- Step 3 detalji sada vraćaju sažetak povezanog izvora, a pregled finalne odluke ga prikazuje. Stariji odobreni transferi bez veze ostaju označeni kao nepovezani. Vremenska linija transporta prikazuje povezana odobrenja, vraćanja i finalne prijeme s originalnim količinama i događajima.
- Svih 33 integracijska testa prolazi. Novi test provjerava konkurentnu dodjelu, replay bez duplikata, raspoloživi ostatak, otpuštanje dodjele pri doradi, ponovno odobrenje, finalni prijem i timeline; dodatno provjerava strani/nepostojeći izvor i izvor u odgovoru Step 3 detalja. Typecheck, lint i ciljano lintiranje UI-ja prolaze. Migracija primijenjena lokalno; NWTS radi na 3001.
- Preostalo u fazi F: objedinjavanje više izvora u jednom odobrenju, potpun model fizičkih zaliha i usklađivanje postojećih ukupnih kapaciteta/statistika s povezanim kretanjima, trag kreiranja/odbijanja zahtjeva prije odabira izvora i postupak provjere legacy zaliha. Ne tvrditi da zbir unallocated predstavlja ukupno fizičko stanje skladišta. Novi popunjeni izbor izvora/finalni pregled još nije vizuelno provjeren.

### Zapis implementacije: usklađen obračun evidentiranih zaliha (20.09.2026.)

- Liste lokacija, detalji i /api/stats koriste zajednički storageBalances obračun. Pre-storage je zbir evidentiranih prijema umanjen za povezane completed transfere; final-storage je postojeća spremljena količina uvećana za povezane completed transfere. Reserved/pending dodjela se još računa u pre-storage jer nema zasebne potvrde fizičke otpreme.
- Potvrđen povezani finalni prijem premješta količinu između prikazanih stanja jednom, a ukupni broj ostaje isti. ReceiptAllocation i originalne količine prijema ostaju istorijski zapisi; nisu prepisani radi prikaza trenutnog stanja.
- Serverska provjera novog pre-storage prijema koristi isti obračun. Potvrda povezanog finalnog prijema provjerava izvor i slobodnu površinu odredišta u transakciji. Nedostatak mjesta daje konflikt bez promjene verzije, događaja ili dodjele. Cijeli broj mjesta u detaljima računa se zaokruživanjem naniže.
- Detalji objašnjavaju sastav evidentiranog stanja. Stariji završeni transferi bez izvora ne dodaju se automatski postojećoj finalnoj količini jer nije dokazivo jesu li već uključeni. Prikazuje se njihov broj i potreba usklađivanja. Izvorna finalStorageLocation.quantity ostaje postojeće spremljeno stanje; ne mijenja se migracijom.
- Neslaganje kada povezana kretanja premašuju prijeme vidljivo je označeno; novi prijem na takvoj lokaciji traži prethodnu provjeru. Ovaj obračun predstavlja evidentirano stanje, ne potvrdu fizičke inventure.
- Preostalo: provjera i usklađivanje legacy podataka, objedinjavanje više izvora u transferu, zasebna evidencija fizičke otpreme/povrata ako se uvede, vizuelna provjera novih objašnjenja i preostale faze C–H. Nema nove migracije u ovoj isporuci.
- Provjera ove isporuke: svih 34 integracijska testa prolazi, uključujući očuvanje ukupne količine, jednako stanje na listama/detaljima, kapacitet i rollback finalnog prijema, replay i odvojeno legacy stanje bez dvostrukog sabiranja. Typecheck, lint i ciljani lint nove komponente prolaze. Integracijski testovi izvršeni su uz odobreno pokretanje lokalnih portova nakon što je sandbox blokirao PostgreSQL socket; postojeća korisnička baza nije korištena za testiranje.

### Zapis implementacije: pregled i pouzdano kreiranje računa (20.09.2026.)

- Kreiranje računa sada ima pregled imena, korisničkog imena, emaila, uloge i Step-a prije potvrde. Lozinka se ne prikazuje u sažetku; nema pozivnica. Employee zahtijeva Step, a Supervision i dalje kreira samo Employee račune.
- Novi `AccountCreation` zapis nastaje u istoj transakciji kao račun i pamti izvršioca, vrijeme, identitet računa i početni pristup. Ne bilježi lozinku, njen hash niti kopije ličnih polja u audit zapisu. Prikaz navodi najnovijih 20 kreiranja; Supervision vidi svoje, Administrator cijelu organizaciju. Starije račune ne predstavljamo kao dokazive događaje kreiranja.
- Potvrda koristi jedinstveni `actionKey`. Ponavljanje vraća originalnu potvrdu i nikada ne postavlja lozinku ponovo, čak ni ako je korisnik u međuvremenu promijenio. Fingerprint veže pregledane podatke i izvršioca, bez lozinke. Za promjenu lozinke ostaje zaseban postojeći tok.
- Neuspjela provjera/spremanje ne briše unos. Kod nepoznatog ishoda moguće je provjeriti isti pokušaj, ili zatvoriti dijalog i nastaviti ga preko dugmeta dok je stranica otvorena. Nova kreiranja i izmjene u toj stranici tada su onemogućeni dok se pokušaj ne razriješi. Nacrt i lozinka ostaju samo u memoriji, ne u localStorage; napuštanje/ponovno učitavanje stranice ih uklanja.
- Migracija `20260920150000_account_creation` primijenjena je na lokalni demo; server je restartovan na portu 3001. Postojeći računi i podaci ostali su sačuvani.
- Provjera: 35/35 integracijskih testova prolazi. Novi test pokriva istovremeno kreiranje, replay, obaveznu potvrdu/Step, konflikt imena, izolaciju organizacija, vidljivost evidencije i očuvanje naknadno promijenjene lozinke. Typecheck i lint prolaze.
- Browser: Supervision obrazac i popunjen pregled provjereni na 390×844 i 1280×900, bez horizontalnog preljeva dijaloga. Prazan obrazac fokusira prvo obavezno polje, dijalog fokusira naslov, Tab prelazi na akcije, Escape vraća fokus na dugme za pregled i čuva unos. Za vizuelni test nije kreiran novi račun u demo bazi; unos je nakon provjere uklonjen reloadom. Smanjeno kretanje, čitač ekrana i browser simulacija izgubljenog odgovora još nisu provjereni za ovaj tok.
- Ovo završava jednu preostalu cjelinu faza C/E. Cjelokupni plan još nije završen; gornji status zamjenjuje raniju zastarjelu tabelu.

### Zapis implementacije i provjere: transfer iz više izvora (20–21.09.2026.)

- Step 2 podržava do 100 različitih izvora po odobrenju, pojedinačne cijele količine, raspoloživu količinu po izvoru i ukupan zbir. Isti izvor se ne može odabrati dvaput. Pregled prikazuje svaki izvor, pojedinačnu količinu, ukupan broj, odredište i odgovornog zaposlenika. Povratak „Back to sources“ čuva odabir i unos.
- Server provjerava sve izvore u istoj transakciji: organizaciju, postojeći prijem, raspoložive količine i jednakost zbira odobrenoj količini. Ako jedna stavka ne prođe, ne nastaje nijedna rezervacija ni odobrenje. Redoslijed izvora ne mijenja identitet potvrde pri ponavljanju. Raniji zahtjevi s jednim `receiptAllocationId` ostaju podržani i njihove potvrde ostaju ponovljive.
- Jedno odobrenje/razrješenje sada može imati više `TransferSource` redova. Migracija `20260920170000_multiple_transfer_sources` zamjenjuje pojedinačna jedinstvena ograničenja odgovarajućim složenim indeksom, bez brisanja postojećih podataka. Primijenjena je na lokalni demo 20.09.
- Step 3 prikazuje sve izvore odobrenog transfera. Finalni prijem provjerava i zbir po izvornoj hali, zbir prema zahtjevu i odredište. Povrat na reviziju oslobađa sve rezervacije zajedno; finalni prijem ih završava zajedno. To i dalje nije zaseban dokaz fizičke otpreme/povrata niti automatska potvrda kompatibilnosti otpada i prostorije.
- Događaji vremenske linije imaju jedinstveni ključ po akciji i izvoru, pa više profila istog transporta ne dijeli React ključ niti gubi svoju pojedinačnu količinu.
- Integracijska provjera 20.09: 36/36 testova prolazi, uključujući prazne/duple izvore, nejednak zbir, strani izvor, nedovoljnu količinu u jednoj stavci bez djelimičnog upisa, konkurentna odobrenja, ponavljanje s obrnutim redoslijedom, oslobađanje svih izvora, ponovno odobrenje, zbirnu provjeru hale i očuvanje ukupne zalihe. Typecheck, lint i ciljani lint promijenjenih komponenti ponovo prolaze 21.09.
- Browser 20.09: u odvojenoj testnoj bazi provjereni su izbor dva izvora (3 + 5), fokus novog selektora, povratak iz pregleda sa sačuvanim podacima i odobrenje. Test nije mijenjao korisničku demo bazu.
- Browser 21.09: finalni pregled dva izvora provjeren na 1280×900 i 390×844 bez horizontalnog prelijevanja. Potvrđen testni prijem od 8 kontejnera; finalna zaliha prikazuje 8, izvorna hala 4 od početnih 12. Nakon spremanja fokus ostaje na naslovu potvrde, a nakon „Done“ prelazi na naslov prostorije. Privremeni preview i testna baza su ugašeni, viewport vraćen.
- Preostalo: provjera/usaglašavanje legacy zaliha, širi obuhvat formi i korekcija, odluke za obradu upozorenja iz 7.2 i preostala matrica pristupačnosti/mrežnih grešaka. Ova isporuka ne zatvara cijele faze F/H.
