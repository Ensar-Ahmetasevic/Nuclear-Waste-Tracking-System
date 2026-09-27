# NWTS — Sprechernotizen

Nutzen Sie Folien 1–10 für das Hauptgespräch. Folien 11–14 dienen vertiefenden Fragen. Die Live-Demonstration kann dem Szenario auf Folie 14 folgen.

## 1. Nuclear Waste Tracking System

NWTS verbindet Sendungsdaten mit den Abläufen im Zwischen- und Endlager. Diese Präsentation stellt den aktuellen Softwareprototyp und einen möglichen Pilotansatz vor. Das Titelbild ist eine konzeptionelle Illustration. Es zeigt weder eine reale Anlage noch technische Behälterspezifikationen.

## 2. Betriebsinformationen im Zusammenhang

Beginnen Sie mit den betrieblichen Fragen, bevor Sie einzelne Funktionen zeigen. NWTS führt Datensätze aus drei Arbeitsbereichen innerhalb einer Organisation zusammen. Mitarbeitende arbeiten in ihrem zugewiesenen Bereich. Aufsicht und Administration können alle drei Bereiche überblicken. Der angestrebte Nutzen liegt in einer einfacheren Abstimmung und einem besseren Überblick über offene Aufgaben. Messbare Zeit- oder Kosteneinsparungen werden nicht behauptet. Fragen Sie, welche dieser Informationen heute am schwersten verfügbar ist.

## 3. Drei verbundene Arbeitsbereiche

Erläutern Sie die drei Arbeitsbereiche nacheinander. Schritt 1 erfasst den LKW und seine Ladung. Schritt 2 dokumentiert die Annahme in einer Halle und bearbeitet die Übergabe aus dem Zwischenlager. Schritt 3 fordert einen Transfer an und bestätigt die Annahme. Die LKW-Abfahrt ist ein eigenes Ereignis: OUT bedeutet, dass der LKW die Entladezone verlassen hat. Daraus folgt keine bestätigte Endlagerung. Das Anwendungsbild zeigt den Prozessüberblick mit Demonstrationswerten.

## 4. Schritt 1: Sendungsdaten

Nutzen Sie die Beispielsendung mit 27 Containern. Ein Mitarbeiter im Bereich Sendungen erfasst Ankunft und LKW-Daten. Aufsicht oder Administration legt die Containerprofile anhand vorhandener Stammdaten an. Ein Profil fasst mehrere Container mit gemeinsamen Merkmalen zusammen. Es ist kein Seriennachweis für jeden einzelnen physischen Container. Nach der Abfahrt darf nur die Administration die zulässigen Sendungskorrekturen durchführen. Die Erfassung der Ladung bestätigt noch keine physische Annahme.

## 5. Schritt 2: Zwischenlager

Zeigen Sie die Hallenübersicht und öffnen Sie anschließend eine Halle. Unterscheiden Sie zwischen der Ankunft auf dem Gelände und der Annahme im Lager. Verknüpfte Annahmedatensätze verbinden Containerprofile mit einer Halle. Für Transfers nutzt die Anwendung erfasste Quellen und Mengen. Kapazitätswerte beruhen auf konfigurierter Grundfläche und Containerstellfläche. Sie sind Planungshinweise und kein validierter Belegungsplan. Die gezeigten Zähler gehören zum aktuellen Demodatensatz und nicht zum vollständig durchgespielten Beispielszenario.

## 6. Schritt 3: Endlager

Erklären Sie die Richtung des Transfers. Der Bereich Endlager erstellt die Anfrage, das Zwischenlager antwortet, anschließend bestätigt das Endlager die Annahme. Die Software prüft zulässige Statuswechsel und erfasste Mengen. Dieser Ablauf dokumentiert den Endlagerprozess in der Anwendung. Er bescheinigt weder die physische Einlagerung noch die Erfüllung standortspezifischer Annahmebedingungen. Nutzen Sie in einer Live-Demonstration kompatible Demostammdaten und eine kleine Menge aus einer verknüpften Annahme.

## 7. Lagerbedingungen und Nachverfolgung

Ein Benutzer erfasst einen Messwert. Die Anwendung vergleicht ihn mit den konfigurierten Bereichen. Alarme können Quittierung, Notizen, Rückkehr in den Sollbereich und Abschluss dokumentieren. Kritische Alarme dürfen nur Aufsicht oder Administration unter den vorgesehenen Bedingungen schließen. Regelversionen enthalten einen Freigabeverweis. Standardwerte der Demo sind keine betrieblichen Grenzwerte. Eskalationen werden bei Nutzung der Anwendung ausgewertet. Ein dauerhaft laufender Benachrichtigungsdienst und eine Sensoranbindung gehören nicht zur aktuellen Implementierung.

## 8. Rollen und Verantwortlichkeiten

Unterscheiden Sie Rolle und Arbeitsbereich. Ein Mitarbeiter ist den Sendungen, dem Zwischenlager oder dem Endlager zugeordnet. Aufsicht und Administration können alle drei Bereiche aufrufen, haben aber unterschiedliche Änderungsrechte. Die Aufsicht erstellt Mitarbeiterkonten und Containerprofile. Die Administration verwaltet Stammdaten und bestehende Konten und verfügt über zusätzliche Korrekturrechte. Verantwortliche Personen einer Halle oder eines Raums sind betriebliche Datensätze und nicht automatisch Anmeldekonten. Eine ausführlichere Rechteübersicht folgt im Anhang.

## 9. Aktueller Umfang und Weiterentwicklung

Stellen Sie die Software als funktionsfähigen Prototyp vor. Der aktuelle Projektstand enthält zusätzlich zum älteren Konzept Bestandsprüfungen, Korrekturberichte, verknüpfte Annahmen, Transferquellen und Alarmereignisse. Diese Datensätze verbessern die Übersicht, belegen aber keinen vollständigen und unabhängig validierten Prüfpfad für jeden historischen oder physischen Container. Integrationen und Standortvalidierung benötigen einen eigenen Umfang. Behaupten Sie keine Zertifizierung, garantierte Sicherheit oder Produktionsreife. Klären Sie, welche offenen Punkte für den Partner entscheidend sind.

## 10. Ein klar abgegrenzter Pilot

Schlagen Sie einen begrenzten Pilotversuch vor. Der Partner benennt eine betrieblich verantwortliche Person und beschreibt einen typischen Ablauf. Vereinbaren Sie vorab Erfolgskriterien: Datensätze sind auffindbar, Mengen stimmen überein, berechtigte Personen können handeln und Ausnahmen bleiben sichtbar. Bereitstellung, Integrationen, Preise und Projektdauer benötigen eine gesonderte Vereinbarung. Technische Partner interessieren sich möglicherweise stärker für Schnittstellen, spätere Nutzer eher für den Arbeitsalltag.

## 11. Funktionsübersicht: Betrieb

Diese Übersicht beschreibt die aktuelle Software und keine vertraglich zugesicherten Leistungen. Ein Datensatz kann mehrere Container mit gemeinsamen Merkmalen umfassen. Neuere Annahme- und Transferverknüpfungen ermöglichen die Zuordnung zur Quelle. Älteren Daten können solche Verknüpfungen fehlen. Die Anwendung weist auf diese Grenzen hin. Die Sendungsaktivität zeigt ausgewählte Ereignistypen mit begrenzten Ergebnislisten. Sie ist kein universelles unveränderbares Auditprotokoll. Verbindliche Abnahmekriterien werden für den Pilot vereinbart.

## 12. Funktionsübersicht: Aufsicht

Vertiefen Sie nur die für das Publikum relevanten Funktionen. Der Bestandsabgleich vergleicht eine erfasste Zählung mit der Systemmenge und ermöglicht einen Korrekturbericht durch die Administration. Er bestätigt nicht die physische Zählung. Eine unterstützte Altverknüpfung dokumentiert eine bewusste Zuordnungsentscheidung und errät keine Herkunft. Statistiken beschreiben erfasste Bewegungen und Mengen. Die Kapazität beruht auf konfigurierter Fläche und Stellfläche. Die Oberflächensprache übersetzt keine frei eingegebenen Namen und nicht jede historische Freitextnotiz.

## 13. Berechtigungen im Überblick

Nutzen Sie diese Tabelle für vertiefende Zugriffsfragen nach dem Hauptteil. Alle Rechte gelten innerhalb der eigenen Organisation. Der Zugang zu einem Arbeitsbereich erlaubt nicht jede Aktion. Angenommene Profile, aktive Transfers und weitere Datensatzbedingungen können Änderungen einschränken. Mitarbeitende erfassen Messwerte in ihrem Bereich. Kritische Alarme dürfen nur Aufsicht oder Administration unter den geltenden Abschlussbedingungen schließen. Das derzeitige Mitarbeitermodell weist einen Arbeitsbereich zu, keine mehreren zeitweisen Vertretungsbereiche.

## 14. Demonstration: eine Sendung

Bereiten Sie die Demonstration vor dem Termin vor. Nutzen Sie eigene Teststandorte mit kompatiblen Stammdaten, ausreichender konfigurierter Kapazität und verantwortlichen Personen. Bereiten Sie fünf Demokonten vor: Administrator, Aufsicht und je einen Mitarbeiter pro Schritt. Legen Sie eine neue Sendung an, statt bestehende Beispiele zu verändern. Nehmen Sie alle 27 Container an und transferieren Sie danach 5 aus der ersten Gruppe. Bei leerem Anfangsbestand verbleiben 22 im Zwischenlager und 5 im Endlager. Die Anwendungsbilder zeigen den bestehenden Demodatensatz und behaupten keinen abgeschlossenen Durchlauf dieses Szenarios.
