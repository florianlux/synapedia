-- =============================================================================
-- Demo-Artikel: Wissenschaftliche Substanzprofile
-- Rein pharmakologisch, evidenzbasiert – keine Dosierungsempfehlungen,
-- keine Konsumanleitungen, keine Beschaffungshinweise.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tags
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO tags (id, name, slug) VALUES
  (gen_random_uuid(), 'Tryptamin',            'tryptamin'),
  (gen_random_uuid(), 'Serotonerg',           'serotonerg'),
  (gen_random_uuid(), 'Psychedelikum',        'psychedelikum'),
  (gen_random_uuid(), 'Empathogen',           'empathogen'),
  (gen_random_uuid(), 'Stimulans',            'stimulans'),
  (gen_random_uuid(), 'Dissoziativum',        'dissoziativum'),
  (gen_random_uuid(), 'NMDA-Antagonist',      'nmda-antagonist'),
  (gen_random_uuid(), 'Analgetikum',          'analgetikum'),
  (gen_random_uuid(), 'Forschungschemikalie', 'forschungschemikalie')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Sources
-- ─────────────────────────────────────────────────────────────────────────────

-- Psilocybin-Quellen
INSERT INTO sources (id, title, authors, journal, year, doi, url, source_type) VALUES
(gen_random_uuid(),
 'Psilocybin produces substantial and sustained decreases in depression and anxiety in patients with life-threatening cancer',
 'Griffiths RR, Johnson MW, Carducci MA et al.',
 'Journal of Psychopharmacology',
 2016,
 '10.1177/0269881116675513',
 'https://doi.org/10.1177/0269881116675513',
 'journal'),
(gen_random_uuid(),
 'Psilocybin with psychological support for treatment-resistant depression: an open-label feasibility study',
 'Carhart-Harris RL, Bolstridge M, Rucker J et al.',
 'The Lancet Psychiatry',
 2016,
 '10.1016/S2215-0366(16)30065-7',
 'https://doi.org/10.1016/S2215-0366(16)30065-7',
 'journal'),
(gen_random_uuid(),
 'Neural correlates of the psychedelic state as determined by fMRI studies with psilocybin',
 'Carhart-Harris RL, Erritzoe D, Williams T et al.',
 'Proceedings of the National Academy of Sciences',
 2012,
 '10.1073/pnas.1119598109',
 'https://doi.org/10.1073/pnas.1119598109',
 'journal'),
(gen_random_uuid(),
 'Psilocybin can occasion mystical-type experiences having substantial and sustained personal meaning and spiritual significance',
 'Griffiths RR, Richards WA, McCann U, Jesse R',
 'Psychopharmacology',
 2006,
 '10.1007/s00213-006-0457-5',
 'https://doi.org/10.1007/s00213-006-0457-5',
 'journal'),
(gen_random_uuid(),
 'Trial of Psilocybin versus Escitalopram for Depression',
 'Carhart-Harris RL, Giribaldi B, Watts R et al.',
 'New England Journal of Medicine',
 2021,
 '10.1056/NEJMoa2032994',
 'https://doi.org/10.1056/NEJMoa2032994',
 'journal');

-- MDMA-Quellen
INSERT INTO sources (id, title, authors, journal, year, doi, url, source_type) VALUES
(gen_random_uuid(),
 'MDMA-assisted therapy for severe PTSD: a randomized, double-blind, placebo-controlled phase 3 study',
 'Mitchell JM, Bogenschutz M, Lilienstein A et al.',
 'Nature Medicine',
 2021,
 '10.1038/s41591-021-01336-3',
 'https://doi.org/10.1038/s41591-021-01336-3',
 'journal'),
(gen_random_uuid(),
 '3,4-Methylenedioxymethamphetamine (MDMA): current perspectives',
 'Kalant H',
 'Canadian Journal of Physiology and Pharmacology',
 2001,
 '10.1139/y01-044',
 'https://doi.org/10.1139/y01-044',
 'journal'),
(gen_random_uuid(),
 'The pharmacology and toxicology of "ecstasy" (MDMA) and related drugs',
 'Green AR, Mechan AO, Elliott JM et al.',
 'Pharmacological Reviews',
 2003,
 '10.1124/pr.55.3.3',
 'https://doi.org/10.1124/pr.55.3.3',
 'journal'),
(gen_random_uuid(),
 'MDMA-assisted psychotherapy for PTSD: Are memory reconsolidation and fear extinction the mechanisms of therapeutic action?',
 'Feduccia AA, Mithoefer MC',
 'Progress in Neuro-Psychopharmacology and Biological Psychiatry',
 2018,
 '10.1016/j.pnpbp.2017.06.033',
 'https://doi.org/10.1016/j.pnpbp.2017.06.033',
 'journal');

-- Ketamin-Quellen
INSERT INTO sources (id, title, authors, journal, year, doi, url, source_type) VALUES
(gen_random_uuid(),
 'A randomized controlled trial of intranasal ketamine in major depressive disorder',
 'Lapidus KAB, Levitch CF, Perez AM et al.',
 'Biological Psychiatry',
 2014,
 '10.1016/j.biopsych.2014.03.026',
 'https://doi.org/10.1016/j.biopsych.2014.03.026',
 'journal'),
(gen_random_uuid(),
 'A single infusion of ketamine improves depression scores in patients with anxious bipolar depression',
 'Ionescu DF, Luckenbaugh DA, Niciu MJ et al.',
 'Journal of Clinical Psychiatry',
 2015,
 '10.4088/JCP.14m09049',
 'https://doi.org/10.4088/JCP.14m09049',
 'journal'),
(gen_random_uuid(),
 'Ketamine and the future of rapid-acting antidepressants',
 'Krystal JH, Abdallah CG, Sanacora G et al.',
 'Biological Psychiatry',
 2019,
 '10.1016/j.biopsych.2019.01.006',
 'https://doi.org/10.1016/j.biopsych.2019.01.006',
 'journal'),
(gen_random_uuid(),
 'Antidepressant efficacy of ketamine in treatment-resistant major depression: a two-site randomized controlled trial',
 'Murrough JW, Iosifescu DV, Chang LC et al.',
 'American Journal of Psychiatry',
 2013,
 '10.1176/appi.ajp.2013.13030392',
 'https://doi.org/10.1176/appi.ajp.2013.13030392',
 'journal'),
(gen_random_uuid(),
 'Glutamate and GABA systems as targets for novel antidepressant and mood-stabilizing treatments',
 'Sanacora G, Zarate CA, Krystal JH, Manji HK',
 'Molecular Psychiatry',
 2008,
 '10.1038/sj.mp.4002107',
 'https://doi.org/10.1038/sj.mp.4002107',
 'journal');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Artikel + Verknüpfungen (CTEs für ID-Referenzierung)
-- ─────────────────────────────────────────────────────────────────────────────

-- ======================== PSILOCYBIN =========================================
WITH ins_article AS (
  INSERT INTO articles (
    id, slug, title, subtitle, summary, category,
    status, risk_level, evidence_strength,
    published_at, content_mdx
  ) VALUES (
    gen_random_uuid(),
    'psilocybin',
    'Psilocybin',
    'Pharmakologie des klassischen Tryptamin-Psychedelikums',
    'Psilocybin ist ein natürlich vorkommendes Tryptamin-Prodrug, das nach Dephosphorylierung zu Psilocin als partieller Agonist am 5-HT₂A-Rezeptor wirkt. Es zählt zu den am intensivsten erforschten klassischen Psychedelika und wird derzeit in klinischen Studien zur Behandlung von Depression, Suchterkrankungen und existenzieller Angst untersucht.',
    'Tryptamine',
    'published',
    'moderate',
    'strong',
    now(),
    E'## Kurzfazit\n\nPsilocybin ist ein klassisches Indolalkaloid-Psychedelikum mit hoher Affinität zum 5-HT₂A-Rezeptor. Die Substanz wird seit den 2000er-Jahren erneut intensiv in klinischen Studien untersucht, insbesondere im Kontext behandlungsresistenter Depression und Angststörungen bei terminal erkrankten Patienten. Das physiologische Sicherheitsprofil ist im Vergleich zu vielen anderen psychoaktiven Substanzen günstig; die primären Risiken sind psychologischer Natur.\n\n## Was ist Psilocybin?\n\nPsilocybin (4-Phosphoryloxy-N,N-dimethyltryptamin) ist ein natürlich vorkommendes Indolalkaloid, das in über 200 Pilzarten der Gattungen *Psilocybe*, *Panaeolus* und *Gymnopilus* biosynthetisiert wird. Es handelt sich um ein Prodrug: Nach oraler Aufnahme wird Psilocybin durch alkalische Phosphatasen im Darm und in der Leber rasch zu Psilocin (4-Hydroxy-DMT) dephosphoryliert, dem eigentlichen pharmakologisch aktiven Metaboliten. Historisch wurde Psilocybin bereits in präkolumbianischen Kulturen Mesoamerikas rituell verwendet; die moderne pharmakologische Erforschung begann mit der Isolierung durch Albert Hofmann im Jahr 1958.\n\n## Chemische Struktur / Klasse\n\nPsilocybin gehört zur Klasse der substituierten Tryptamine und ist strukturell eng mit dem endogenen Neurotransmitter Serotonin (5-Hydroxytryptamin) verwandt. Die Molekülstruktur umfasst einen Indolkern mit einer Dimethylamin-Seitenkette in Position 3 und einer Phosphoryloxygruppe in Position 4. Die Summenformel lautet C₁₂H₁₇N₂O₄P mit einer molaren Masse von 284,25 g/mol. Die strukturelle Ähnlichkeit zum Serotonin erklärt die hohe Affinität zu serotonergen Rezeptoren.\n\n## Wirkmechanismus\n\nDer primäre Wirkmechanismus von Psilocin besteht in der partiellen Agonisierung des 5-HT₂A-Rezeptors, eines Gq-Protein-gekoppelten Rezeptors, der in kortikalen Pyramidenneuronen der Schicht V stark exprimiert wird. Die Aktivierung dieses Rezeptors führt zu einer erhöhten glutamatergen Transmission im präfrontalen Kortex und einer Destabilisierung kanonischer neuronaler Netzwerke, insbesondere des Default Mode Network (DMN). Bildgebungsstudien mittels fMRT zeigen eine erhöhte funktionelle Konnektivität zwischen Hirnregionen, die normalerweise wenig miteinander kommunizieren – ein Phänomen, das als „entropisches Gehirn" beschrieben wurde. Dieser Mechanismus wird als neurobiologische Grundlage der subjektiv erlebten Bewusstseinsveränderung diskutiert.\n\n## Rezeptorprofil\n\nPsilocin zeigt die höchste Bindungsaffinität am 5-HT₂A-Rezeptor (Ki ≈ 6 nM), gefolgt vom 5-HT₂C-Rezeptor (Ki ≈ 10 nM) und dem 5-HT₁A-Rezeptor (Ki ≈ 50 nM). Zusätzlich besitzt es moderate Affinität zu weiteren serotonergen Subtypen (5-HT₂B, 5-HT₆, 5-HT₇) sowie eine schwache Bindung an Dopamin-D₁-Rezeptoren. Im Gegensatz zu vielen synthetischen Psychedelika zeigt Psilocin keine relevante Aktivität am Sigma-Rezeptor oder an adrenergen Rezeptoren. Das Fehlen einer nennenswerten dopaminergen Wirkung korreliert mit dem geringen Abhängigkeitspotenzial der Substanz.\n\n## Wirkprofil\n\nDie subjektiven Effekte von Psilocybin umfassen tiefgreifende Veränderungen der Wahrnehmung, Kognition und Emotionalität. Typisch sind visuelle Phänomene wie geometrische Muster, Farbintensivierung und Synästhesien. Viele Anwender berichten über ein Gefühl der Ich-Auflösung (Ego-Dissolution), eine veränderte Zeitwahrnehmung und intensive emotionale Erlebnisse, die sowohl euphorisch als auch dysphorisch sein können. In klinischen Settings werden häufig mystische oder spirituell anmutende Erfahrungen beschrieben, die mit langfristigen Veränderungen in Persönlichkeitsmerkmalen wie Offenheit assoziiert sind. Die Wirkdauer beträgt typischerweise 4–6 Stunden.\n\n## Risiken & Nebenwirkungen\n\nDie häufigsten akuten Nebenwirkungen umfassen Übelkeit, erhöhten Blutdruck, Tachykardie, Mydriasis und Kopfschmerzen. Psychologisch besteht das Risiko intensiver Angst- oder Panikzustände (sogenannte „Bad Trips"), insbesondere bei prädisponierten Personen oder in unkontrollierten Settings. Bei Personen mit familiärer Vorbelastung für psychotische Störungen besteht ein theoretisches Risiko für die Auslösung oder Verschlimmerung psychotischer Episoden. Es gibt keine dokumentierten Fälle letaler Überdosierung durch Psilocybin allein. Das physiologische Abhängigkeitspotenzial ist nach aktuellem Kenntnisstand vernachlässigbar gering.\n\n## Interaktionen\n\nKlinisch relevante Interaktionen bestehen insbesondere mit serotonergen Substanzen. Die gleichzeitige Einnahme von MAO-Inhibitoren (z. B. Moclobemid, Phenelzin) kann die Wirkung von Psilocin erheblich verstärken und verlängern, da der oxidative Abbau durch Monoaminoxidase A gehemmt wird. Selektive Serotonin-Wiederaufnahmehemmer (SSRIs) können die psychedelische Wirkung abschwächen, da sie die 5-HT₂A-Rezeptordichte durch chronische Einnahme herunterregulieren. Lithium wird in der psychedelischen Forschung als kontraindiziert betrachtet, da Fallberichte auf ein erhöhtes Risiko für Krampfanfälle hinweisen. Trizyklische Antidepressiva können die Wirkung unvorhersehbar modulieren.\n\n## Kreuztoleranz\n\nPsilocybin zeigt eine ausgeprägte Kreuztoleranz mit anderen 5-HT₂A-Agonisten, darunter LSD, Meskalin und DMT. Die Toleranzentwicklung tritt bereits nach einmaliger Anwendung ein und ist primär auf eine rasche Internalisierung und Herunterregulierung der 5-HT₂A-Rezeptoren zurückzuführen. Die vollständige Erholung der Rezeptordichte erfolgt in der Regel innerhalb von 7–14 Tagen. Eine Kreuztoleranz mit nicht-serotonergen Substanzen wie MDMA, Ketamin oder Cannabis besteht nicht.\n\n## Rechtsstatus\n\nPsilocybin ist in Deutschland nach dem Betäubungsmittelgesetz (BtMG) als nicht verkehrsfähiger Stoff in Anlage I gelistet, was Herstellung, Handel und Besitz ohne Ausnahmegenehmigung unter Strafe stellt. In den USA wird es auf Bundesebene als Schedule-I-Substanz klassifiziert, wobei einige Städte und der Bundesstaat Oregon Ausnahmen für therapeutische oder entkriminalisierte Nutzung geschaffen haben. In den Niederlanden sind psilocybinhaltige Trüffel legal erhältlich, da sie nicht unter das dortige Opiumgesetz fallen. Klinische Forschung ist in den meisten Jurisdiktionen mit speziellen Genehmigungen möglich.\n\n## Quellenlage\n\nDie Evidenzbasis für Psilocybin hat sich seit den 2000er-Jahren erheblich erweitert. Mehrere randomisierte kontrollierte Studien (RCTs) der Phase II haben signifikante antidepressive Effekte gezeigt, darunter eine im New England Journal of Medicine publizierte Vergleichsstudie mit Escitalopram. Bildgebungsstudien mittels fMRT und PET haben die neuronalen Korrelate der psychedelischen Erfahrung detailliert kartiert. Die methodische Qualität wird durch die Schwierigkeit der Verblindung bei psychoaktiven Substanzen eingeschränkt, was ein systemimmanentes Problem psychedelischer Forschung darstellt. Phase-III-Studien sind derzeit in Planung oder laufen bereits.'
  )
  RETURNING id
),
link_tags AS (
  INSERT INTO article_tags (article_id, tag_id)
  SELECT ins_article.id, tags.id
  FROM ins_article, tags
  WHERE tags.slug IN ('tryptamin', 'serotonerg', 'psychedelikum')
),
link_src_1 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 1
  FROM ins_article, sources
  WHERE sources.doi = '10.1177/0269881116675513'
),
link_src_2 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 2
  FROM ins_article, sources
  WHERE sources.doi = '10.1016/S2215-0366(16)30065-7'
),
link_src_3 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 3
  FROM ins_article, sources
  WHERE sources.doi = '10.1073/pnas.1119598109'
),
link_src_4 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 4
  FROM ins_article, sources
  WHERE sources.doi = '10.1007/s00213-006-0457-5'
),
link_src_5 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 5
  FROM ins_article, sources
  WHERE sources.doi = '10.1056/NEJMoa2032994'
)
SELECT 1;

-- ======================== MDMA ===============================================
WITH ins_article AS (
  INSERT INTO articles (
    id, slug, title, subtitle, summary, category,
    status, risk_level, evidence_strength,
    published_at, content_mdx
  ) VALUES (
    gen_random_uuid(),
    'mdma',
    'MDMA',
    'Pharmakologie des prototypischen Empathogens',
    'MDMA (3,4-Methylendioxymethamphetamin) ist ein substituiertes Amphetamin mit primär serotonerger Wirkung, das als prototypisches Empathogen klassifiziert wird. Es bewirkt eine massive Freisetzung von Serotonin, Noradrenalin und Dopamin und wird aktuell in klinischen Phase-III-Studien als Adjuvans zur Psychotherapie bei posttraumatischer Belastungsstörung (PTBS) untersucht.',
    'Empathogen',
    'published',
    'high',
    'strong',
    now(),
    E'## Kurzfazit\n\nMDMA ist ein synthetisches Empathogen-Entaktogen mit ausgeprägter serotonerger Wirkkomponente. Die Substanz unterscheidet sich pharmakologisch grundlegend von klassischen Psychedelika durch ihren Wirkmechanismus als Monoamin-Releaser. Das neurotoxische Potenzial bei wiederholter Anwendung und die kardiovaskulären Risiken erfordern eine differenzierte Risikobewertung, insbesondere im Kontext der aktuellen klinischen Forschung zur PTBS-Behandlung.\n\n## Was ist MDMA?\n\nMDMA (3,4-Methylendioxymethamphetamin) ist ein synthetisches Phenethylamin und substituiertes Amphetamin, das erstmals 1912 von der Firma Merck als Zwischenprodukt bei der Synthese von Hydrastinin patentiert wurde. Die psychoaktiven Eigenschaften wurden erst in den 1970er-Jahren durch Alexander Shulgin systematisch untersucht und beschrieben. MDMA wird als Empathogen-Entaktogen klassifiziert – eine Substanzklasse, die sich durch die Induktion von Empathie, emotionaler Offenheit und einem Gefühl innerer Verbundenheit auszeichnet und sich damit sowohl von klassischen Stimulanzien als auch von Psychedelika abgrenzt.\n\n## Chemische Struktur / Klasse\n\nMDMA gehört zur Klasse der substituierten Methylendioxy-Phenethylamine und ist strukturell sowohl mit Amphetamin als auch mit Meskalin verwandt. Die Molekülstruktur enthält einen Phenethylamin-Grundkörper mit einer Methylendioxybrücke am aromatischen Ring (Positionen 3 und 4) sowie einer N-Methylgruppe. Die Summenformel lautet C₁₁H₁₅NO₂ mit einer molaren Masse von 193,25 g/mol. MDMA besitzt ein Chiralitätszentrum und existiert als (S)-(+)- und (R)-(−)-Enantiomer, wobei das (S)-Enantiomer die stärkere serotonerge Aktivität aufweist.\n\n## Wirkmechanismus\n\nDer Wirkmechanismus von MDMA unterscheidet sich fundamental von dem klassischer Psychedelika. MDMA wirkt primär als Substrat-Typ-Releaser an den Monoamintransportern: Es wird über den Serotonintransporter (SERT), den Noradrenalintransporter (NET) und den Dopamintransporter (DAT) in die präsynaptische Terminale aufgenommen und kehrt dort die Transportrichtung um, was zu einer massiven nicht-exozytotischen Freisetzung der gespeicherten Monoamine in den synaptischen Spalt führt. Die Selektivität ist dabei SERT > NET > DAT. Zusätzlich hemmt MDMA die Monoaminoxidase A (MAO-A) und stimuliert die Freisetzung von Oxytocin aus dem Hypothalamus, was als neurobiologisches Korrelat der empathogenen Wirkung diskutiert wird.\n\n## Rezeptorprofil\n\nDie primäre pharmakologische Wirkung von MDMA wird nicht über direkte Rezeptorbindung, sondern über die Freisetzung endogener Monoamine vermittelt. Die Affinität zum SERT ist am höchsten (EC₅₀ ≈ 70 nM für die Serotonin-Freisetzung), gefolgt von NET und DAT. MDMA zeigt zusätzlich moderate direkte Affinität zum 5-HT₂A-Rezeptor, zum α₂-Adrenozeptor und zu Histamin-H₁-Rezeptoren. Eine schwache Affinität besteht zum M₁-Muskarinrezeptor und zu Sigma-1-Rezeptoren. Die Oxytocin-Freisetzung wird über hypothalamische 5-HT₁A-Rezeptoren vermittelt.\n\n## Wirkprofil\n\nDie subjektive Wirkung von MDMA ist durch eine Kombination aus emotional-empathogenen und mild stimulierenden Effekten gekennzeichnet. Charakteristisch sind ein intensives Gefühl emotionaler Nähe und Verbundenheit, erhöhte Gesprächsbereitschaft, Reduktion von Angst und Abwehrmechanismen sowie eine generelle Stimmungsaufhellung. Sensorische Effekte umfassen eine verstärkte Wahrnehmung von Berührungen und Musik, ohne die für klassische Psychedelika typischen Halluzinationen. Die sympathomimetische Komponente äußert sich in erhöhter Wachheit und Energie. Die Wirkdauer beträgt typischerweise 3–5 Stunden, gefolgt von einer häufig berichteten Phase verminderter Stimmung in den Folgetagen.\n\n## Risiken & Nebenwirkungen\n\nMDMA weist ein relevantes Risikoprofil auf, das sich in akute und chronische Risiken gliedert. Akut besteht die Gefahr einer Hyperthermie, die durch serotonerge Überstimulation der Thermoregulation und gleichzeitige physische Aktivität potenziert wird und in seltenen Fällen letal verlaufen kann. Hyponatriämie durch übermäßige Wasseraufnahme in Kombination mit ADH-Ausschüttung stellt ein weiteres akutes Risiko dar. Kardiovaskulär kommt es zu Tachykardie, Hypertonie und potenziell zu Arrhythmien. Hinsichtlich chronischer Risiken zeigen tierexperimentelle und einige Humanstudien Hinweise auf serotonerge Neurotoxizität bei wiederholter Exposition, wobei die klinische Relevanz und Reversibilität weiterhin kontrovers diskutiert werden. Kognitive Defizite in den Bereichen Gedächtnis und Exekutivfunktionen wurden bei chronischen Konsumenten beschrieben.\n\n## Interaktionen\n\nDie gefährlichste pharmakologische Interaktion besteht mit MAO-Inhibitoren: Da MDMA selbst ein Substrat der MAO ist und seine Metabolisierung durch MAO-Hemmung blockiert wird, kann die Kombination zu einem lebensbedrohlichen Serotoninsyndrom mit Hyperthermie, Rigidität und Multiorganversagen führen. SSRIs und SNRIs reduzieren die Wirkung von MDMA durch Blockade der Monoamintransporter, über die MDMA aufgenommen wird. CYP2D6-Inhibitoren (z. B. Fluoxetin, Paroxetin) können den Metabolismus von MDMA verlangsamen und die Plasmakonzentrationen erhöhen. Die Kombination mit anderen Stimulanzien erhöht das kardiovaskuläre Risiko additiv.\n\n## Kreuztoleranz\n\nMDMA zeigt eine rasche Akuttoleranz (Tachyphylaxie), die auf die Entleerung der präsynaptischen Serotoninspeicher zurückzuführen ist. Eine Kreuztoleranz mit klassischen Psychedelika (5-HT₂A-Agonisten) besteht nur partiell und bezieht sich auf die schwache direkte 5-HT₂A-agonistische Komponente von MDMA. Mit anderen Monoamin-Releasern wie MDA oder Methylon besteht eine ausgeprägte Kreuztoleranz. Die Regeneration der Serotoninvorräte dauert nach neueren PET-Studien mindestens mehrere Wochen.\n\n## Rechtsstatus\n\nMDMA ist in Deutschland nach dem BtMG als nicht verkehrsfähiger Stoff in Anlage I gelistet. International wird es durch die UN-Konvention von 1971 als Schedule-I-Substanz kontrolliert. In den USA und in der Europäischen Union laufen derzeit Verfahren zur möglichen Zulassung von MDMA als Adjuvans zur Psychotherapie bei PTBS. Australien hat MDMA im Jahr 2023 als erstes Land weltweit für die therapeutische Anwendung unter ärztlicher Aufsicht zugelassen. Die klinische Forschung ist in vielen Ländern mit speziellen Genehmigungen möglich.\n\n## Quellenlage\n\nDie Evidenz zur therapeutischen Wirksamkeit von MDMA bei PTBS basiert auf mehreren randomisierten kontrollierten Studien, darunter eine Phase-III-Studie, die 2021 in Nature Medicine publiziert wurde. Die Studienlage zur Neurotoxizität ist methodisch komplex, da Humanstudien überwiegend retrospektiv sind und durch Polydrug-Use und Selektion konfundiert werden. Die FDA hat MDMA-assistierte Psychotherapie als „Breakthrough Therapy" eingestuft, was ein beschleunigtes Zulassungsverfahren ermöglicht. Allerdings hat ein FDA-Beratergremium 2024 Bedenken hinsichtlich der Studienqualität geäußert. Insgesamt ist die Evidenzbasis solide, aber die Langzeitsicherheitsdaten sind noch begrenzt.'
  )
  RETURNING id
),
link_tags AS (
  INSERT INTO article_tags (article_id, tag_id)
  SELECT ins_article.id, tags.id
  FROM ins_article, tags
  WHERE tags.slug IN ('empathogen', 'stimulans', 'serotonerg')
),
link_src_1 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 1
  FROM ins_article, sources
  WHERE sources.doi = '10.1038/s41591-021-01336-3'
),
link_src_2 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 2
  FROM ins_article, sources
  WHERE sources.doi = '10.1139/y01-044'
),
link_src_3 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 3
  FROM ins_article, sources
  WHERE sources.doi = '10.1124/pr.55.3.3'
),
link_src_4 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 4
  FROM ins_article, sources
  WHERE sources.doi = '10.1016/j.pnpbp.2017.06.033'
)
SELECT 1;

-- ======================== KETAMIN ============================================
WITH ins_article AS (
  INSERT INTO articles (
    id, slug, title, subtitle, summary, category,
    status, risk_level, evidence_strength,
    published_at, content_mdx
  ) VALUES (
    gen_random_uuid(),
    'ketamin',
    'Ketamin',
    'Pharmakologie des NMDA-Rezeptor-Antagonisten',
    'Ketamin ist ein dissoziatives Anästhetikum und NMDA-Rezeptor-Antagonist, das seit den 1960er-Jahren klinisch als Narkosemittel eingesetzt wird. In subanästhetischen Dosen zeigt es eine rasche und robuste antidepressive Wirkung, die den Beginn einer neuen Ära in der Behandlung therapieresistenter Depression markiert hat.',
    'Dissoziativum',
    'published',
    'moderate',
    'strong',
    now(),
    E'## Kurzfazit\n\nKetamin ist ein NMDA-Rezeptor-Antagonist mit dissoziativen, analgetischen und rasch einsetzenden antidepressiven Eigenschaften. Es ist die einzige Substanz in dieser Übersicht, die bereits als zugelassenes Arzneimittel (in Form des S-Enantiomers Esketamin als Nasenspray) für behandlungsresistente Depression verfügbar ist. Die Forschung zur Aufklärung des antidepressiven Mechanismus hat grundlegende neue Erkenntnisse zur Neurobiologie der Depression geliefert.\n\n## Was ist Ketamin?\n\nKetamin ist ein Arylcyclohexylamin, das 1962 von Calvin Stevens bei Parke-Davis als Nachfolger des Anästhetikums Phencyclidin (PCP) synthetisiert wurde. Es wurde 1970 als Anästhetikum zugelassen und steht auf der Liste der unentbehrlichen Arzneimittel der WHO. Ketamin zeichnet sich durch eine sogenannte dissoziative Anästhesie aus, bei der Analgesie und Amnesie bei weitgehend erhaltener Spontanatmung und Schutzreflexen erreicht werden. Seit der bahnbrechenden Studie von Berman et al. (2000), die eine rasche antidepressive Wirkung nach einmaliger subanästhetischer Infusion zeigte, hat sich ein neues Forschungsfeld zur glutamatergen Modulation bei affektiven Störungen eröffnet.\n\n## Chemische Struktur / Klasse\n\nKetamin gehört zur Klasse der Arylcyclohexylamine und ist strukturell mit Phencyclidin (PCP) und Methoxetamin verwandt. Die Molekülstruktur besteht aus einem Cyclohexanonring, der über eine Aminogruppe mit einem Chlorphenylring verknüpft ist. Die Summenformel lautet C₁₃H₁₆ClNO mit einer molaren Masse von 237,73 g/mol. Ketamin besitzt ein Chiralitätszentrum und existiert als (S)- und (R)-Enantiomer; das (S)-Ketamin (Esketamin) zeigt eine etwa vierfach höhere Affinität zum NMDA-Rezeptor als das (R)-Enantiomer.\n\n## Wirkmechanismus\n\nDer primäre Wirkmechanismus von Ketamin besteht in der nicht-kompetitiven Blockade des NMDA-Rezeptors, eines ionotropen Glutamatrezeptors. Im Gegensatz zu klassischen Antidepressiva, die Wochen bis zur klinischen Wirksamkeit benötigen, setzt die antidepressive Wirkung von Ketamin innerhalb von Stunden ein. Der aktuelle Erklärungsansatz postuliert, dass die NMDA-Blockade auf GABAergen Interneuronen zu einer paradoxen Disinhibition glutamaterger Pyramidenneuronen im präfrontalen Kortex führt. Dieser Glutamat-Burst aktiviert AMPA-Rezeptoren und nachgeschaltete intrazelluläre Signalkaskaden, insbesondere den mTOR-Signalweg (mechanistic Target of Rapamycin) und die Freisetzung von BDNF (Brain-Derived Neurotrophic Factor), was innerhalb von Stunden zu einer verstärkten synaptischen Plastizität und Synaptogenese führt.\n\n## Rezeptorprofil\n\nKetamin zeigt seine höchste Affinität am NMDA-Rezeptor (Ki ≈ 0,5 μM für die Kanalblockade), wobei es als offener Kanalblocker in der Ionenpore an die PCP-Bindungsstelle bindet. Darüber hinaus besitzt Ketamin moderate Affinität zu Opioidrezeptoren, insbesondere zum μ-Opioidrezeptor und zum κ-Opioidrezeptor, was zur analgetischen Wirkung beiträgt. Es interagiert mit dem Dopamintransporter (DAT) als Wiederaufnahmehemmer, mit Sigma-Rezeptoren, HCN-Kanälen (Hyperpolarization-activated Cyclic Nucleotide-gated) und nikotinischen Acetylcholinrezeptoren. Die Metabolisierung erfolgt primär über CYP3A4 und CYP2B6 zum aktiven Metaboliten Norketamin und weiter zu Hydroxynorketamin (HNK), welches ebenfalls antidepressive Eigenschaften aufweisen könnte.\n\n## Wirkprofil\n\nIn subanästhetischen Dosierungen erzeugt Ketamin einen dissoziativen Zustand, der durch ein Gefühl der Loslösung von Körper und Umgebung charakterisiert ist. Subjektiv berichten Patienten über Derealisation, Depersonalisation, veränderte Zeitwahrnehmung und traumartige Zustände. In höheren subanästhetischen Dosen kann ein sogenanntes „K-Hole" auftreten – eine tiefe dissoziative Erfahrung mit vollständigem Verlust des Körperbewusstseins. Die analgetische Wirkung setzt bereits bei niedrigen Konzentrationen ein. Die antidepressive Wirkung wird typischerweise innerhalb von 2–4 Stunden nach Infusion manifest und hält durchschnittlich 1–2 Wochen an.\n\n## Risiken & Nebenwirkungen\n\nAkute Nebenwirkungen umfassen Dissoziation, Schwindel, Übelkeit, Blutdruckanstieg, Nystagmus und vorübergehende kognitive Beeinträchtigungen. Kardiovaskulär wirkt Ketamin sympathomimetisch und erhöht Herzfrequenz und Blutdruck, was bei Patienten mit unkontrollierter Hypertonie oder Aneurysmen relevant ist. Bei chronischer Anwendung in hohen Dosen ist das Risiko einer Ketamin-assoziierten Uropathie (ulzerative Zystitis) gut dokumentiert, die mit schwerer Blasenfibrose und Funktionsverlust einhergehen kann. Hepatotoxizität bei chronischem Gebrauch wurde in mehreren Kohortenstudien beschrieben. Das psychologische Abhängigkeitspotenzial ist moderat; eine physische Abhängigkeit mit Entzugssymptomatik ist bei hochfrequentem Konsum möglich.\n\n## Interaktionen\n\nKetamin wird hepatisch über CYP3A4 und CYP2B6 metabolisiert. CYP3A4-Inhibitoren (z. B. Ketoconazol, Grapefruitsaft, Clarithromycin) können die Plasmaspiegel erhöhen. Die Kombination mit anderen ZNS-Depressiva wie Benzodiazepinen, Opioiden oder Alkohol kann zu additiver Atemdepression und Sedierung führen. Die gleichzeitige Anwendung mit Lamotrigin – selbst ein Glutamat-Modulator – kann die psychotomimetischen Effekte von Ketamin reduzieren, möglicherweise aber auch die antidepressive Wirkung abschwächen. Sympathomimetische Substanzen können den kardiovaskulären Effekt von Ketamin potenzieren. MAO-Inhibitoren erfordern Vorsicht aufgrund der dopaminergen Wiederaufnahmehemmung durch Ketamin.\n\n## Kreuztoleranz\n\nKetamin zeigt Kreuztoleranz mit anderen NMDA-Rezeptor-Antagonisten wie Methoxetamin (MXE), Dextromethorphan (DXM) und Lachgas (N₂O). Die Toleranzentwicklung betrifft sowohl die dissoziativen als auch die analgetischen Effekte und tritt bei regelmäßiger Anwendung rasch ein. Der Mechanismus umfasst eine kompensatorische Hochregulierung von NMDA-Rezeptoren (NR2B-Untereinheiten). Eine Kreuztoleranz mit serotonergen Psychedelika oder Empatho­genen besteht nicht, da der Wirkmechanismus über ein vollständig unabhängiges Rezeptorsystem vermittelt wird.\n\n## Rechtsstatus\n\nKetamin ist in Deutschland als verschreibungspflichtiges Arzneimittel zugelassen und unterliegt nicht dem BtMG, wird jedoch von der Betäubungsmittel-Verschreibungsverordnung (BtMVV) reguliert. Esketamin-Nasenspray (Spravato®) ist seit 2019 in den USA und der EU für behandlungsresistente Depression zugelassen und muss unter ärztlicher Aufsicht verabreicht werden. International variiert der Rechtsstatus: In Großbritannien wurde Ketamin 2014 als Class-B-Substanz eingestuft, in vielen asiatischen Ländern gelten strenge Kontrollen. Die Verfügbarkeit als Anästhetikum in der Notfall- und Veterinärmedizin bleibt weltweit gewährleistet.\n\n## Quellenlage\n\nDie Evidenzbasis für die antidepressive Wirkung von Ketamin ist robust und umfasst mehrere randomisierte kontrollierte Studien sowie Meta-Analysen. Die 2019 erfolgte FDA-Zulassung von Esketamin basierte auf drei pivotalen Phase-III-Studien. Die Grundlagenforschung zum Wirkmechanismus hat wesentlich zum Verständnis der Rolle des glutamatergen Systems bei Depression beigetragen und wird in hochrangigen Fachzeitschriften publiziert. Offene Fragen betreffen die optimale Frequenz und Dauer der Erhaltungstherapie, die Langzeitsicherheit bei wiederholter Anwendung und die relative Wirksamkeit von racemischem Ketamin versus Esketamin. Die Datenlage zum Abhängigkeitspotenzial bei therapeutischer Anwendung ist noch begrenzt.'
  )
  RETURNING id
),
link_tags AS (
  INSERT INTO article_tags (article_id, tag_id)
  SELECT ins_article.id, tags.id
  FROM ins_article, tags
  WHERE tags.slug IN ('dissoziativum', 'nmda-antagonist', 'analgetikum')
),
link_src_1 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 1
  FROM ins_article, sources
  WHERE sources.doi = '10.1016/j.biopsych.2014.03.026'
),
link_src_2 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 2
  FROM ins_article, sources
  WHERE sources.doi = '10.4088/JCP.14m09049'
),
link_src_3 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 3
  FROM ins_article, sources
  WHERE sources.doi = '10.1016/j.biopsych.2019.01.006'
),
link_src_4 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 4
  FROM ins_article, sources
  WHERE sources.doi = '10.1176/appi.ajp.2013.13030392'
),
link_src_5 AS (
  INSERT INTO article_sources (article_id, source_id, citation_order)
  SELECT ins_article.id, sources.id, 5
  FROM ins_article, sources
  WHERE sources.doi = '10.1038/sj.mp.4002107'
)
SELECT 1;

COMMIT;
