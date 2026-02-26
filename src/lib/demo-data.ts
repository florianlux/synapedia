import { Article, Tag, Source } from "./types";

export const demoArticles: Article[] = [
  {
    id: "1",
    slug: "psilocybin",
    title: "Psilocybin",
    subtitle: "4-Phosphoryloxy-N,N-dimethyltryptamin",
    summary:
      "Psilocybin ist ein natürlich vorkommendes Tryptamin-Alkaloid, das in über 200 Pilzarten der Gattung Psilocybe gefunden wird. Es wird im Körper zu Psilocin dephosphoryliert und wirkt primär als Agonist am 5-HT2A-Rezeptor.",
    content_mdx: `## Kurzfazit

Psilocybin ist eines der am besten erforschten klassischen Psychedelika. Aktuelle klinische Studien zeigen vielversprechende Ergebnisse in der Behandlung von Depressionen und Angststörungen.

## Was ist Psilocybin?

Psilocybin (4-Phosphoryloxy-N,N-dimethyltryptamin) ist ein natürlich vorkommendes Indolalkaloid, das in zahlreichen Pilzarten der Gattung Psilocybe vorkommt. Es wurde erstmals 1958 von Albert Hofmann isoliert und synthetisiert. Als Prodrug wird es im Körper enzymatisch zu Psilocin dephosphoryliert, welches die eigentliche psychoaktive Substanz darstellt.

## Chemische Struktur / Klasse

Psilocybin gehört zur Klasse der Tryptamine und ist strukturell eng mit dem Neurotransmitter Serotonin (5-Hydroxytryptamin) verwandt. Es besitzt einen Indolkern mit einer Phosphoryloxygruppe an Position 4 und einer Dimethylamino-Seitenkette. Die Molekülformel lautet C₁₂H₁₇N₂O₄P.

## Wirkmechanismus

Psilocin, der aktive Metabolit, bindet primär an serotonerge Rezeptoren im zentralen Nervensystem. Der Hauptwirkmechanismus beruht auf der partiellen Agonistenaktivität am 5-HT2A-Rezeptor, was zu einer veränderten kortikalen Signalverarbeitung führt. Neuroimaging-Studien zeigen eine Reduktion der Default Mode Network (DMN) Aktivität und eine erhöhte Konnektivität zwischen normalerweise getrennten Hirnregionen.

## Rezeptorprofil

- **5-HT2A**: Hohe Affinität (primärer Wirkort)
- **5-HT2C**: Moderate Affinität
- **5-HT1A**: Moderate Affinität
- **5-HT2B**: Geringe Affinität
- Geringe Aktivität an dopaminergen Rezeptoren

## Wirkprofil

Die subjektiven Effekte umfassen veränderte visuelle Wahrnehmung, verstärkte emotionale Empfindungen, veränderte Zeitwahrnehmung und eine erhöhte introspektive Tiefe. In klinischen Settings werden häufig mystische oder bedeutsame Erfahrungen berichtet, die mit langfristigen positiven Veränderungen der Persönlichkeit korrelieren können.

## Risiken & Nebenwirkungen

- Akute Angst- und Panikzustände möglich
- Vorübergehende Blutdruckerhöhung und Tachykardie
- Übelkeit in der Anfangsphase
- Risiko der Auslösung latenter Psychosen bei prädisponierten Personen
- HPPD (Hallucinogen Persisting Perception Disorder) in seltenen Fällen
- Keine bekannte physiologische Toxizität bei üblichen Mengen

## Interaktionen

- **SSRIs/SNRIs**: Können die Wirkung abschwächen
- **MAO-Hemmer**: Potenziell starke Wirkverstärkung, erhöhtes Risiko
- **Lithium**: Kontraindiziert, Berichte über Krampfanfälle
- **Cannabis**: Potenziell synergistisch, erhöhte Unvorhersagbarkeit

## Kreuztoleranz

Es besteht eine schnell einsetzende Toleranzentwicklung sowie eine Kreuztoleranz mit anderen serotonergen Psychedelika wie LSD und Meskalin. Diese Toleranz bildet sich typischerweise innerhalb von 1–2 Wochen vollständig zurück.

## Rechtsstatus

Psilocybin ist in den meisten Ländern als kontrollierte Substanz eingestuft. In Deutschland fällt es unter das BtMG (Anlage I). In einigen Jurisdiktionen wie Oregon (USA) wurden regulierte therapeutische Programme etabliert. Die rechtliche Lage befindet sich international im Wandel. *Dieser Abschnitt dient nur der Information und stellt keine Rechtsberatung dar.*

## Quellenlage

Die Evidenzlage zu Psilocybin ist vergleichsweise stark. Mehrere randomisierte kontrollierte Studien (RCTs) wurden in hochrangigen Fachzeitschriften wie Nature Medicine, NEJM und JAMA Psychiatry publiziert.`,
    status: "published",
    risk_level: "moderate",
    evidence_strength: "strong",
    category: "Tryptamine",
    receptor: "5-HT2A-Rezeptor",
    legal_status: "BtMG Anlage I",
    substance_id: null,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    published_at: "2024-01-20T00:00:00Z",
  },
  {
    id: "2",
    slug: "mdma",
    title: "MDMA",
    subtitle: "3,4-Methylendioxymethamphetamin",
    summary:
      "MDMA ist ein synthetisches Empathogen-Entaktogen der Phenylethylamin- und Amphetamin-Klasse. Es bewirkt eine massive Ausschüttung von Serotonin, Dopamin und Noradrenalin und wird aktuell als Therapeutikum bei PTBS untersucht.",
    content_mdx: `## Kurzfazit

MDMA ist ein synthetisches Empathogen mit ausgeprägter serotonerger Wirkung. Phase-III-Studien zur MDMA-unterstützten Psychotherapie bei PTBS haben statistisch signifikante Ergebnisse gezeigt.

## Was ist MDMA?

MDMA (3,4-Methylendioxymethamphetamin) ist ein synthetisches Empathogen-Entaktogen, das erstmals 1912 von der Firma Merck synthetisiert wurde. Es gehört zur Klasse der substituierten Amphetamine und Methylendioxyphenylethylamine. MDMA wurde in den 1970er–80er Jahren in der Psychotherapie eingesetzt, bevor es in den meisten Ländern verboten wurde.

## Chemische Struktur / Klasse

MDMA ist ein substituiertes Amphetamin mit einer Methylendioxygruppe am aromatischen Ring. Es gehört zur Klasse der Phenylethylamine und ist strukturell mit Methamphetamin und dem Cathinon-Derivat Methylon verwandt. Die Molekülformel lautet C₁₁H₁₅NO₂.

## Wirkmechanismus

MDMA wirkt primär als Monoamin-Releasing-Agent. Es kehrt die Funktion der Serotonin- (SERT), Dopamin- (DAT) und Noradrenalin-Transporter (NET) um und bewirkt eine massive Freisetzung dieser Neurotransmitter in den synaptischen Spalt. Zusätzlich hemmt es die Monoaminoxidase (MAO) und stimuliert die Oxytocin-Ausschüttung.

## Rezeptorprofil

- **SERT**: Sehr hohe Affinität (primärer Wirkort)
- **NET**: Hohe Affinität
- **DAT**: Moderate Affinität
- **5-HT2A**: Geringe direkte Affinität
- **Alpha-2-Adrenorezeptoren**: Moderate Affinität
- Oxytocin-Freisetzung über hypothalamische Mechanismen

## Wirkprofil

MDMA erzeugt eine charakteristische Kombination aus emotionaler Offenheit, Empathie und prosozialem Verhalten. Weitere subjektive Effekte umfassen ein erhöhtes Wohlbefinden, gesteigerte Kommunikationsfähigkeit und eine verstärkte sensorische Wahrnehmung. Die Wirkdauer beträgt typischerweise mehrere Stunden.

## Risiken & Nebenwirkungen

- **Neurotoxizität**: Hinweise auf serotonerge Neurotoxizität bei chronischem Gebrauch
- **Hyperthermie**: Potenziell lebensbedrohliche Überhitzung
- **Hyponatriämie**: Risiko durch übermäßige Wasseraufnahme
- **Kardiovaskuläre Belastung**: Tachykardie, Hypertonie
- **Serotonin-Depletion**: Mehrtägige Erschöpfung nach Gebrauch
- **Hepatotoxizität**: Seltene Fälle von Leberschäden berichtet
- **Bruxismus**: Kieferkrämpfe und Zähneknirschen

## Interaktionen

- **SSRIs/SNRIs**: Gefahr des Serotonin-Syndroms, kontraindiziert
- **MAO-Hemmer**: Lebensbedrohliche Interaktion, absolut kontraindiziert
- **CYP2D6-Inhibitoren**: Verlangsamter Metabolismus, erhöhte Plasmaspiegel
- **Stimulanzien**: Additive kardiovaskuläre Belastung

## Kreuztoleranz

MDMA weist eine moderate Kreuztoleranz mit anderen serotonergen und stimulierenden Substanzen auf. Eine rasche Toleranzentwicklung bei wiederholtem Gebrauch wird beobachtet, was teilweise auf die Depletion der Serotoninspeicher zurückzuführen ist.

## Rechtsstatus

MDMA ist in den meisten Ländern als kontrollierte Substanz eingestuft. In Deutschland fällt es unter das BtMG (Anlage I). Die FDA hat MDMA-unterstützte Psychotherapie als "Breakthrough Therapy" eingestuft. *Dieser Abschnitt dient nur der Information und stellt keine Rechtsberatung dar.*

## Quellenlage

Die Evidenzlage ist stark, insbesondere durch Phase-III-Studien der MAPS Organisation. Publikationen in Nature Medicine, Lancet Psychiatry und Psychopharmacology belegen das therapeutische Potenzial.`,
    status: "published",
    risk_level: "high",
    evidence_strength: "strong",
    category: "Empathogen",
    receptor: "SERT / Monoamin-Transporter",
    legal_status: "BtMG Anlage I",
    substance_id: null,
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-06-15T00:00:00Z",
    published_at: "2024-02-10T00:00:00Z",
  },
  {
    id: "3",
    slug: "ketamin",
    title: "Ketamin",
    subtitle: "2-(2-Chlorphenyl)-2-(methylamino)cyclohexanon",
    summary:
      "Ketamin ist ein dissoziatives Anästhetikum und NMDA-Rezeptor-Antagonist. Es wird in der Medizin als Narkosemittel eingesetzt und zeigt in niedriger Dosierung rapid-antidepressive Eigenschaften.",
    content_mdx: `## Kurzfazit

Ketamin ist ein klinisch etabliertes Anästhetikum mit bemerkenswerter rapid-antidepressiver Wirkung. Das S-Enantiomer (Esketamin) ist als Nasenspray zur Behandlung therapieresistenter Depressionen zugelassen.

## Was ist Ketamin?

Ketamin ist ein Arylcyclohexylamin, das 1962 von Calvin Stevens synthetisiert und 1970 als Anästhetikum zugelassen wurde. Es ist ein dissoziatives Anästhetikum, das in subanästhetischen Konzentrationen antidepressive, analgetische und psychoaktive Eigenschaften aufweist. Ketamin existiert als Racemat aus S- und R-Enantiomeren.

## Chemische Struktur / Klasse

Ketamin gehört zur Klasse der Arylcyclohexylamine und ist strukturell mit PCP (Phencyclidin) verwandt. Es besitzt ein chirales Zentrum und liegt als Racemat vor. Die Molekülformel lautet C₁₃H₁₆ClNO. Das S-Enantiomer zeigt eine etwa vierfach höhere Affinität zum NMDA-Rezeptor.

## Wirkmechanismus

Ketamin wirkt primär als nicht-kompetitiver Antagonist am NMDA-Rezeptor (Glutamat-System). Es blockiert den Ionenkanal im offenen Zustand. Die antidepressive Wirkung wird auf eine nachfolgende Aktivierung von AMPA-Rezeptoren und eine erhöhte BDNF-Expression (Brain-Derived Neurotrophic Factor) zurückgeführt, was synaptische Plastizität fördert.

## Rezeptorprofil

- **NMDA-Rezeptor**: Hohe Affinität (nicht-kompetitiver Antagonist)
- **Opioid-Rezeptoren (µ, κ)**: Moderate Affinität
- **Sigma-Rezeptoren**: Moderate Affinität
- **D2-Rezeptoren**: Geringe Affinität
- **HCN1-Kanäle**: Modulatorische Wirkung
- **Monoamin-Transporter**: Schwache Wiederaufnahmehemmung

## Wirkprofil

In subanästhetischen Bereichen erzeugt Ketamin dissoziative Effekte, einschließlich eines Gefühls der Trennung von Körper und Umgebung. Weitere Effekte umfassen veränderte Raum- und Zeitwahrnehmung, analgetische Eigenschaften und eine rapid-antidepressive Wirkung. In höheren Konzentrationen wird ein Zustand vollständiger Dissoziation beschrieben.

## Risiken & Nebenwirkungen

- **Urologische Schäden**: Chronischer Gebrauch kann zu Ketamin-induzierter Zystitis führen
- **Kognitive Beeinträchtigung**: Bei chronischem Gebrauch möglich
- **Abhängigkeitspotenzial**: Psychische Abhängigkeit möglich
- **Lebertoxizität**: Bei chronischem Hochdosisgebrauch berichtet
- **Kardiovaskuläre Effekte**: Blutdruckanstieg, Tachykardie
- **Laryngospasmus**: Seltenes Risiko bei höheren Konzentrationen

## Interaktionen

- **ZNS-Depressoren**: Additive sedierende Wirkung, Atemdepression
- **Benzodiazepine**: Verstärkte Sedierung
- **MAO-Hemmer**: Potenziell erhöhte Plasmaspiegel
- **Lamotrigin**: Kann antidepressive Wirkung abschwächen

## Kreuztoleranz

Es besteht eine Kreuztoleranz zwischen Ketamin und anderen NMDA-Antagonisten wie MXE, DXM und PCP. Die Toleranz entwickelt sich bei regelmäßigem Gebrauch und kann zu einer Dosissteigerung führen.

## Rechtsstatus

Ketamin ist in Deutschland als verkehrsfähiges und verschreibungsfähiges Betäubungsmittel eingestuft (BtMG Anlage III). Es ist als Arzneimittel zugelassen. Esketamin (Spravato®) ist für therapieresistente Depression zugelassen. *Dieser Abschnitt dient nur der Information und stellt keine Rechtsberatung dar.*

## Quellenlage

Die Evidenzlage ist stark. Zahlreiche RCTs und Metaanalysen belegen die rapid-antidepressive Wirkung. Publikationen in American Journal of Psychiatry, Lancet Psychiatry und Biological Psychiatry.`,
    status: "published",
    risk_level: "moderate",
    evidence_strength: "strong",
    category: "Dissoziativum",
    receptor: "NMDA-Rezeptor",
    legal_status: "BtMG Anlage III",
    substance_id: null,
    created_at: "2024-03-01T00:00:00Z",
    updated_at: "2024-07-01T00:00:00Z",
    published_at: "2024-03-15T00:00:00Z",
  },
  {
    id: "4",
    slug: "lsd",
    title: "LSD",
    subtitle: "Lysergsäurediethylamid",
    summary:
      "LSD gehört zu den potentesten bekannten psychoaktiven Substanzen — wirksam bereits im Mikrogramm-Bereich. Die 2017 erstmals aufgeklärte Kristallstruktur des LSD-5-HT2A-Komplexes erklärte ein jahrzehntealtes Rätsel der Pharmakologie: warum die Wirkung bis zu zwölf Stunden anhält.",
    content_mdx: `## Kurzfazit

LSD ist das vielleicht am meisten polarisierende Molekül der modernen Neuropharmakologie. Seit seiner zufälligen Entdeckung im Jahr 1943 hat es die Grenzen der Bewusstseinsforschung verschoben, wurde als therapeutisches Werkzeug gefeiert, politisch instrumentalisiert und schließlich für Jahrzehnte aus der Forschung verbannt. Heute erlebt die Wissenschaft eine Renaissance: Neue klinische Studien und bahnbrechende Erkenntnisse zur Rezeptorbindung eröffnen ein differenzierteres Bild dieser außergewöhnlichen Substanz.

## Was ist LSD?

Lysergsäurediethylamid (LSD-25) ist ein halbsynthetisches Ergolinderivat, das 1938 von Albert Hofmann bei Sandoz erstmals synthetisiert wurde. Die psychoaktive Wirkung blieb zunächst unentdeckt — erst am 16. April 1943 bemerkte Hofmann bei einer erneuten Synthese zufällig ungewöhnliche Empfindungen. Drei Tage später, am 19. April 1943, unternahm er den ersten dokumentierten Selbstversuch mit 250 Mikrogramm. Dieser Tag ging als "Bicycle Day" in die Geschichte ein, da Hofmann die intensiven Effekte auf der Fahrradfahrt nach Hause erlebte.

LSD ist eine der potentesten psychoaktiven Substanzen überhaupt: Bereits Mengen von 20–30 Mikrogramm können messbare zentralnervöse Effekte hervorrufen. Zum Vergleich — die meisten pharmakologisch aktiven Substanzen werden im Milligramm-Bereich dosiert, also in tausendfach höheren Mengen.

## Chemische Struktur / Klasse

LSD gehört zur Klasse der Lysergamide und leitet sich strukturell von der Lysergsäure ab, einem Alkaloid des Mutterkornpilzes (*Claviceps purpurea*). Die Molekülformel lautet C₂₀H₂₅N₃O. Das Molekül besitzt ein tetrazyklisches Indol-Grundgerüst und zwei stereogene Zentren. Nur das (5R,8R)-Stereoisomer zeigt die volle psychoaktive Wirkung — die anderen drei Diastereomere sind pharmakologisch nahezu inaktiv. Diese ausgeprägte Stereoselektivität unterstreicht die Präzision der Rezeptorinteraktion.

## Wirkmechanismus

LSD entfaltet seine Wirkung primär über eine agonistische Bindung am serotonergen 5-HT2A-Rezeptor. Eine 2017 in *Cell* publizierte Kristallstrukturanalyse enthüllte einen bemerkenswerten Mechanismus: Nach der Bindung an den Rezeptor klappt eine extrazelluläre Schleife (ECL2) wie ein "Deckel" über das LSD-Molekül und schließt es in der Bindungstasche ein. Diese konformationelle Veränderung erklärt die ungewöhnlich lange Wirkdauer von 8–12 Stunden, da das Molekül den Rezeptor nur sehr langsam wieder verlässt.

Darüber hinaus zeigt LSD eine ausgeprägte funktionelle Selektivität (biased agonism): Am 5-HT2A-Rezeptor aktiviert es bevorzugt den β-Arrestin-2-Signalweg gegenüber dem klassischen Gq-Protein-Weg. Neuroimaging-Studien mittels fMRT demonstrieren eine erhöhte globale funktionelle Konnektivität, eine Desintegration des Default Mode Network (DMN) und eine verstärkte Entropie der kortikalen Aktivität.

## Rezeptorprofil

- **5-HT2A**: Sehr hohe Affinität (Ki ≈ 1–3 nM, primärer Wirkort)
- **5-HT2C**: Hohe Affinität (Ki ≈ 4–9 nM)
- **5-HT1A**: Moderate Affinität (partieller Agonist)
- **5-HT2B**: Moderate Affinität
- **D1-Rezeptor**: Moderate Affinität
- **D2-Rezeptor**: Moderate Affinität (partieller Agonist)
- **Alpha-2-Adrenorezeptoren**: Geringe bis moderate Affinität
- Bemerkenswert ist das breite Rezeptorprofil: LSD interagiert mit mehr als einem Dutzend verschiedener Rezeptortypen, was zur Komplexität seines Wirkprofils beiträgt.

## Wirkprofil

Die subjektiven Effekte von LSD umfassen tiefgreifende Veränderungen der visuellen Wahrnehmung (geometrische Muster, verstärkte Farben, Synästhesien), eine veränderte Zeitwahrnehmung, intensivierte emotionale Reaktionen und eine erhöhte introspektive Tiefe. Charakteristisch ist die sehr lange Wirkdauer von 8–12 Stunden, die sich deutlich von den meisten anderen serotonergen Psychedelika unterscheidet.

In kontrollierten klinischen Studien berichten Probanden häufig von mystischen oder bedeutsamen Erfahrungen, die auch Monate nach der Sitzung als persönlich relevant bewertet werden. Eine Besonderheit: Die subjektive Intensität korreliert in Studien signifikant mit der 5-HT2A-Rezeptorbesetzung, wie mittels PET-Bildgebung gezeigt wurde.

## Risiken & Nebenwirkungen

- Akute Angst- und Panikzustände ("challenging experiences"), insbesondere bei unkontrolliertem Setting
- Vorübergehende Erhöhung von Herzfrequenz und Blutdruck
- Mydriasis (Pupillenerweiterung) und Thermogenese
- Risiko der Exazerbation latenter psychotischer Störungen bei genetisch prädisponierten Personen
- HPPD (Hallucinogen Persisting Perception Disorder) in seltenen Fällen
- Keine bekannte letale Dosis beim Menschen; keine Organschädigung bei akuter Anwendung nachgewiesen
- Kein physisches Abhängigkeitspotenzial; rapide Toleranzentwicklung wirkt einer regelmäßigen Einnahme entgegen

## Interaktionen

- **SSRIs/SNRIs**: Können die Wirkung deutlich abschwächen durch kompetitive 5-HT2A-Besetzung
- **MAO-Hemmer**: Potenziell starke Wirkverstärkung, erhöhtes Risiko unvorhersehbarer Effekte
- **Lithium**: Kontraindiziert — Fallberichte über Krampfanfälle und katatone Zustände
- **Cannabis**: Synergistische Intensivierung, deutlich erhöhte Unvorhersagbarkeit des Verlaufs
- **Tramadol**: Erhöhtes Krampfrisiko in Kombination

## Kreuztoleranz

Es besteht eine ausgeprägte und schnell einsetzende Kreuztoleranz mit anderen 5-HT2A-Agonisten, insbesondere Psilocybin und Meskalin. Die Toleranz erreicht bereits nach einer einmaligen Anwendung ein signifikantes Niveau und bildet sich typischerweise innerhalb von 5–7 Tagen vollständig zurück. Dieser Mechanismus beruht vermutlich auf einer Internalisierung und Downregulation der 5-HT2A-Rezeptoren.

## Rechtsstatus

LSD ist in den meisten Ländern als kontrollierte Substanz eingestuft. In Deutschland fällt es unter das BtMG (Anlage I) — es ist weder verkehrs- noch verschreibungsfähig. International nimmt die Zahl der genehmigten klinischen Studien zu, insbesondere in der Schweiz, wo LSD-unterstützte Psychotherapie unter strengen Auflagen erforscht wird. *Dieser Abschnitt dient nur der Information und stellt keine Rechtsberatung dar.*

## Quellenlage

Die Evidenzlage zu LSD hat sich seit 2014 erheblich verbessert. Moderne placebokontrollierte Studien in Fachzeitschriften wie *PNAS*, *Cell*, *Neuropsychopharmacology* und *Biological Psychiatry* haben entscheidend zum Verständnis der Pharmakologie beigetragen. Die Studienlage zur therapeutischen Anwendung bei Angststörungen im Kontext lebensbedrohlicher Erkrankungen und zur Behandlung von Alkoholabhängigkeit wächst stetig.`,
    status: "published",
    risk_level: "moderate",
    evidence_strength: "strong",
    category: "Lysergamid",
    receptor: "5-HT2A-Rezeptor",
    legal_status: "BtMG Anlage I",
    substance_id: null,
    created_at: "2024-04-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
    published_at: "2024-04-15T00:00:00Z",
  },
];

export const demoTags: Tag[] = [
  { id: "t1", name: "Tryptamin", slug: "tryptamin" },
  { id: "t2", name: "Serotonerg", slug: "serotonerg" },
  { id: "t3", name: "Psychedelikum", slug: "psychedelikum" },
  { id: "t4", name: "Empathogen", slug: "empathogen" },
  { id: "t5", name: "Stimulans", slug: "stimulans" },
  { id: "t6", name: "Dissoziativum", slug: "dissoziativum" },
  { id: "t7", name: "NMDA-Antagonist", slug: "nmda-antagonist" },
  { id: "t8", name: "Analgetikum", slug: "analgetikum" },
  { id: "t9", name: "Forschungschemikalie", slug: "forschungschemikalie" },
  { id: "t10", name: "Lysergamid", slug: "lysergamid" },
];

export const demoArticleTags: Record<string, string[]> = {
  "1": ["t1", "t2", "t3"],
  "2": ["t4", "t5", "t2"],
  "3": ["t6", "t7", "t8"],
  "4": ["t10", "t2", "t3"],
};

export const demoSources: Record<string, Source[]> = {
  "1": [
    {
      id: "s1",
      title:
        "Psilocybin produces substantial and sustained decreases in depression and anxiety in patients with life-threatening cancer",
      authors: "Griffiths RR et al.",
      journal: "Journal of Psychopharmacology",
      year: 2016,
      doi: "10.1177/0269881116675513",
      url: null,
      source_type: "journal",
    },
    {
      id: "s2",
      title: "Trial of Psilocybin versus Escitalopram for Depression",
      authors: "Carhart-Harris R et al.",
      journal: "New England Journal of Medicine",
      year: 2021,
      doi: "10.1056/NEJMoa2032994",
      url: null,
      source_type: "journal",
    },
  ],
  "2": [
    {
      id: "s3",
      title:
        "MDMA-assisted therapy for severe PTSD: a randomized, double-blind, placebo-controlled phase 3 study",
      authors: "Mitchell JM et al.",
      journal: "Nature Medicine",
      year: 2021,
      doi: "10.1038/s41591-021-01336-3",
      url: null,
      source_type: "journal",
    },
    {
      id: "s4",
      title: "The pharmacology of MDMA",
      authors: "Green AR et al.",
      journal: "Pharmacological Reviews",
      year: 2003,
      doi: "10.1124/pr.55.3.3",
      url: null,
      source_type: "journal",
    },
  ],
  "3": [
    {
      id: "s5",
      title:
        "A Randomized Trial of an N-Methyl-d-Aspartate Antagonist in Treatment-Resistant Major Depression",
      authors: "Zarate CA et al.",
      journal: "Archives of General Psychiatry",
      year: 2006,
      doi: "10.1001/archpsyc.63.8.856",
      url: null,
      source_type: "journal",
    },
    {
      id: "s6",
      title:
        "Ketamine and Beyond: Investigations into the Disconnect Between Mechanism and Treatment",
      authors: "Zanos P, Gould TD",
      journal: "Pharmacological Reviews",
      year: 2018,
      doi: "10.1124/pr.117.015198",
      url: null,
      source_type: "journal",
    },
  ],
  "4": [
    {
      id: "s7",
      title:
        "Crystal structure of an LSD-bound human serotonin receptor",
      authors: "Wacker D et al.",
      journal: "Cell",
      year: 2017,
      doi: "10.1016/j.cell.2016.12.033",
      url: null,
      source_type: "journal",
    },
    {
      id: "s8",
      title:
        "Neural correlates of the LSD experience revealed by multimodal neuroimaging",
      authors: "Carhart-Harris RL et al.",
      journal: "Proceedings of the National Academy of Sciences",
      year: 2016,
      doi: "10.1073/pnas.1518377113",
      url: null,
      source_type: "journal",
    },
  ],
};
