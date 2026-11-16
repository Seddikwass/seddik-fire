// Football Tunisia 2026 — données de base (modifiables via le panneau d'administration /admin.html)
//
// SOURCES ET VÉRIFICATION (16/11/2026)
//  - Liste des 16 clubs de Ligue 1 2026-27 : classement 2026-27 (thestatsapi.com, consulté le 16/11/2026),
//    croisé avec le classement final 2025-26 et les montées de Ligue 2 (rsssf.org « Tunisia 2025/26 ») :
//    relégués 2025-26 : JS Kairouanaise, AS Soliman, AS Gabès ; promus : ES Hammam-Sousse, PS Sakiet Eddaïer,
//    CS Hammam-Lif (barrage). Format : 16 clubs, 30 journées aller/retour, 3 pts victoire.
//  - Coupe de Tunisie 2025-26 : finale Espérance de Tunis 1-0 ES Zarzis (31 mai 2026).
//  - Qualifiés CAF 2026-27 : Ligue des Champions = Club Africain, Espérance ; Coupe de la Confédération =
//    CS Sfaxien + 2e place « À VÉRIFIER » (Stade Tunisien, 4e, mis par défaut).
//  - Ligue 2 : groupes 2025-26 sans promus/relégués + relégués de L1. Liste PROVISOIRE (à vérifier, montées de L3 inconnues).
//
// DONNÉES FICTIVES / PROVISOIRES — clairement étiquetées :
//  - Tous les JOUEURS, entraîneurs et membres du staff sont FICTIFS (générés), aucun effectif réel n'est reproduit.
//  - Écussons : dessins géométriques originaux générés. Couleurs et stades des petits clubs : provisoires.
//  - Noms de clubs réels utilisés comme données de démonstration : licence à obtenir avant publication commerciale.
//  - Clubs africains (CAF) : noms réels, niveaux de force ESTIMÉS (indicatifs).

export const DATA_VERSION = '2026.11.16';
export const SEASON_LABEL = '2026-2027';
export const VERIFIED_ON = '16/11/2026';

export const RULES = {
  pointsWin: 3, pointsDraw: 1,
  tiebreak: ['points', 'goalDiff', 'goalsFor', 'name'],            // à confirmer selon règlement LNFP 2026-27
  relegated: 3, relegatedNote: '3 relégués en 2025-26 — nombre 2026-27 à confirmer',
  promoted: 3,
  clSlots: 2, ccSlots: 2,          // Tunisie : 2 places C1 + 2 places C2 (dont vainqueur de coupe)
  yellowSuspension: 4,             // 4 cartons jaunes = 1 match (paramétrable, à vérifier)
  awayGoals: false,                // la CAF n'applique plus la règle des buts à l'extérieur (à vérifier)
};

// rep = réputation 1-100 (estimée d'après le classement 2025-26), budget en dinars (TND, fictif)
export const CLUBS = [
  { id: 'est',  name: 'Espérance Sportive de Tunis', short: 'EST',  city: 'Tunis',          stadium: 'Stade Hammadi-Agrebi (Radès)', capacity: 60000, colors: ['#d4141c', '#f7c600'], away: ['#ffffff', '#d4141c'], rep: 90, div: 1 },
  { id: 'ca',   name: 'Club Africain',               short: 'CA',   city: 'Tunis',          stadium: 'Stade Hammadi-Agrebi (Radès)', capacity: 60000, colors: ['#e30613', '#ffffff'], away: ['#ffffff', '#e30613'], rep: 88, div: 1 },
  { id: 'css',  name: 'Club Sportif Sfaxien',        short: 'CSS',  city: 'Sfax',           stadium: 'Stade Taïeb-Mhiri',            capacity: 22000, colors: ['#111111', '#ffffff'], away: ['#ffffff', '#111111'], rep: 84, div: 1 },
  { id: 'ess',  name: 'Étoile Sportive du Sahel',    short: 'ESS',  city: 'Sousse',         stadium: 'Stade Olympique de Sousse',    capacity: 28000, colors: ['#c8102e', '#ffffff'], away: ['#ffffff', '#c8102e'], rep: 82, div: 1 },
  { id: 'st',   name: 'Stade Tunisien',              short: 'ST',   city: 'Le Bardo',       stadium: 'Stade Hédi-Enneifer',          capacity: 12000, colors: ['#b5121b', '#0f7b3c'], away: ['#ffffff', '#0f7b3c'], rep: 74, div: 1 },
  { id: 'usm',  name: 'US Monastirienne',            short: 'USM',  city: 'Monastir',       stadium: 'Stade Mustapha-Ben-Jannet',    capacity: 20000, colors: ['#1d4fa3', '#ffffff'], away: ['#ffffff', '#1d4fa3'], rep: 72, div: 1 },
  { id: 'esz',  name: 'ES Zarzis',                   short: 'ESZ',  city: 'Zarzis',         stadium: 'Stade Abdessalem-Kazouz',      capacity: 7000,  colors: ['#f2c400', '#0a5aa8'], away: ['#0a5aa8', '#f2c400'], rep: 66, div: 1 },
  { id: 'esm',  name: 'ES Métlaoui',                 short: 'ESM',  city: 'Métlaoui',       stadium: 'Stade municipal de Métlaoui',  capacity: 8000,  colors: ['#0b8a3e', '#ffffff'], away: ['#ffffff', '#0b8a3e'], rep: 62, div: 1 },
  { id: 'jso',  name: 'JS El Omrane',                short: 'JSO',  city: 'Tunis',          stadium: 'Stade Chedly-Zouiten',         capacity: 18000, colors: ['#7a1020', '#f2f2f2'], away: ['#f2f2f2', '#7a1020'], rep: 60, div: 1 },
  { id: 'usbg', name: 'US Ben Guerdane',             short: 'USBG', city: 'Ben Guerdane',   stadium: 'Stade du 7-Mars',              capacity: 10000, colors: ['#ffd400', '#151515'], away: ['#151515', '#ffd400'], rep: 63, div: 1 },
  { id: 'asm',  name: 'AS Marsa',                    short: 'ASM',  city: 'La Marsa',       stadium: 'Stade Abdelaziz-Chtioui',      capacity: 6500,  colors: ['#f4c20d', '#1a1a1a'], away: ['#1a1a1a', '#f4c20d'], rep: 58, div: 1 },
  { id: 'cab',  name: 'CA Bizertin',                 short: 'CAB',  city: 'Bizerte',        stadium: 'Stade 15-Octobre',             capacity: 20000, colors: ['#111111', '#f5d000'], away: ['#f5d000', '#111111'], rep: 61, div: 1 },
  { id: 'ob',   name: 'Olympique de Béja',           short: 'OB',   city: 'Béja',           stadium: 'Stade Boujemaa-Kmiti',         capacity: 15000, colors: ['#e2231a', '#1b3f8b'], away: ['#ffffff', '#e2231a'], rep: 55, div: 1 },
  { id: 'eshs', name: 'ES Hammam-Sousse',            short: 'ESHS', city: 'Hammam Sousse',  stadium: 'Stade Bouaoula',               capacity: 6000,  colors: ['#d71f26', '#ffffff'], away: ['#ffffff', '#222222'], rep: 50, div: 1 },
  { id: 'psse', name: 'PS Sakiet Eddaïer',           short: 'PSSE', city: 'Sakiet Eddaïer', stadium: 'Stade municipal de Sakiet Eddaïer', capacity: 5000, colors: ['#0d6e3a', '#f0f0f0'], away: ['#f0f0f0', '#0d6e3a'], rep: 50, div: 1 },
  { id: 'cshl', name: 'CS Hammam-Lif',               short: 'CSHL', city: 'Hammam-Lif',     stadium: 'Stade Bou Kornine',            capacity: 8000,  colors: ['#0b7a3b', '#ffffff'], away: ['#ffffff', '#0b7a3b'], rep: 54, div: 1 },
  // ---- Ligue 2 (liste PROVISOIRE, structure extensible) ----
  { id: 'jsk',  name: 'JS Kairouanaise',   short: 'JSK',  city: 'Kairouan',     stadium: 'Stade Hamda-Laouani', capacity: 15000, colors: ['#1c3f94', '#ffffff'], away: ['#ffffff', '#1c3f94'], rep: 48, div: 2 },
  { id: 'ass',  name: 'AS Soliman',        short: 'ASS',  city: 'Soliman',      stadium: 'Stade municipal de Soliman', capacity: 6000, colors: ['#e95b0c', '#1a1a1a'], away: ['#ffffff', '#e95b0c'], rep: 44, div: 2 },
  { id: 'asg',  name: 'AS Gabès',          short: 'ASG',  city: 'Gabès',        stadium: 'Stade municipal de Gabès', capacity: 15000, colors: ['#0a64b4', '#f3d100'], away: ['#f3d100', '#0a64b4'], rep: 42, div: 2 },
  { id: 'ust',  name: 'US Tataouine',      short: 'UST',  city: 'Tataouine',    stadium: 'Stade Nejib-Khattab', capacity: 5000, colors: ['#f0a500', '#1b1b1b'], away: ['#ffffff', '#f0a500'], rep: 45, div: 2 },
  { id: 'stg',  name: 'Stade Gabésien',    short: 'SG',   city: 'Gabès',        stadium: 'Stade municipal de Gabès', capacity: 15000, colors: ['#0e8a47', '#ffffff'], away: ['#ffffff', '#0e8a47'], rep: 44, div: 2 },
  { id: 'ask',  name: 'AS Kasserine',      short: 'ASK',  city: 'Kasserine',    stadium: 'Stade municipal de Kasserine', capacity: 8000, colors: ['#d81e1e', '#ffffff'], away: ['#ffffff', '#d81e1e'], rep: 40, div: 2 },
  { id: 'srs',  name: 'Sfax Railways Sports', short: 'SRS', city: 'Sfax',       stadium: 'Stade Sfax Railways', capacity: 5000, colors: ['#2b5fa8', '#ffffff'], away: ['#ffffff', '#2b5fa8'], rep: 40, div: 2 },
  { id: 'scba', name: 'SC Ben Arous',      short: 'SCBA', city: 'Ben Arous',    stadium: 'Stade municipal de Ben Arous', capacity: 6000, colors: ['#e2001a', '#000000'], away: ['#ffffff', '#e2001a'], rep: 38, div: 2 },
  { id: 'ock',  name: 'OC Kerkennah',      short: 'OCK',  city: 'Kerkennah',    stadium: 'Stade de Kerkennah', capacity: 3000, colors: ['#00a3e0', '#ffffff'], away: ['#ffffff', '#00a3e0'], rep: 36, div: 2 },
  { id: 'csc',  name: 'CS Chebba',         short: 'CSC',  city: 'Chebba',       stadium: 'Stade municipal de Chebba', capacity: 4000, colors: ['#ff6a00', '#ffffff'], away: ['#ffffff', '#ff6a00'], rep: 38, div: 2 },
  { id: 'csms', name: "CS M'saken",        short: 'CSMS', city: "M'saken",      stadium: "Stade municipal de M'saken", capacity: 6000, colors: ['#008c45', '#ffffff'], away: ['#ffffff', '#008c45'], rep: 37, div: 2 },
  { id: 'jend', name: 'Jendouba Sport',    short: 'JS',   city: 'Jendouba',     stadium: 'Stade municipal de Jendouba', capacity: 8000, colors: ['#1f8f3a', '#f5f5f5'], away: ['#f5f5f5', '#1f8f3a'], rep: 36, div: 2 },
  { id: 'cskb', name: 'CS Korba',          short: 'CSK',  city: 'Korba',        stadium: 'Stade municipal de Korba', capacity: 4000, colors: ['#ffffff', '#1d4fa3'], away: ['#1d4fa3', '#ffffff'], rep: 35, div: 2 },
  { id: 'egsg', name: 'EGS Gafsa',         short: 'EGSG', city: 'Gafsa',        stadium: 'Stade municipal de Gafsa', capacity: 10000, colors: ['#e8202a', '#ffffff'], away: ['#ffffff', '#e8202a'], rep: 40, div: 2 },
  { id: 'emm',  name: 'EM Mahdia',         short: 'EMM',  city: 'Mahdia',       stadium: 'Stade municipal de Mahdia', capacity: 6000, colors: ['#0055a4', '#ffffff'], away: ['#ffffff', '#0055a4'], rep: 35, div: 2 },
  { id: 'asa',  name: 'AS Ariana',         short: 'ASA',  city: 'Ariana',       stadium: 'Stade municipal de l\'Ariana', capacity: 5000, colors: ['#5b2c83', '#ffffff'], away: ['#ffffff', '#5b2c83'], rep: 34, div: 2 },
];

// Clubs africains (noms réels, force ESTIMÉE — à valider)
export const CAF_CLUBS = [
  { id: 'ahly', name: 'Al Ahly SC', short: 'AHL', country: 'EGY', colors: ['#c8102e', '#ffffff'], rep: 92 },
  { id: 'zam',  name: 'Zamalek SC', short: 'ZAM', country: 'EGY', colors: ['#ffffff', '#d40000'], rep: 84 },
  { id: 'pyr',  name: 'Pyramids FC', short: 'PYR', country: 'EGY', colors: ['#0b2a5b', '#ffffff'], rep: 86 },
  { id: 'mam',  name: 'Mamelodi Sundowns', short: 'MSU', country: 'RSA', colors: ['#ffd200', '#0b6e3a'], rep: 90 },
  { id: 'orl',  name: 'Orlando Pirates', short: 'ORL', country: 'RSA', colors: ['#111111', '#ffffff'], rep: 80 },
  { id: 'wac',  name: 'Wydad AC', short: 'WAC', country: 'MAR', colors: ['#d50000', '#ffffff'], rep: 85 },
  { id: 'rca',  name: 'Raja CA', short: 'RCA', country: 'MAR', colors: ['#0a8f3c', '#ffffff'], rep: 83 },
  { id: 'fus',  name: 'FUS Rabat', short: 'FUS', country: 'MAR', colors: ['#003da5', '#ffffff'], rep: 78 },
  { id: 'rsb',  name: 'RS Berkane', short: 'RSB', country: 'MAR', colors: ['#f39200', '#111111'], rep: 82 },
  { id: 'mca',  name: 'MC Alger', short: 'MCA', country: 'ALG', colors: ['#d71920', '#0a8f3c'], rep: 79 },
  { id: 'crb',  name: 'CR Belouizdad', short: 'CRB', country: 'ALG', colors: ['#c8102e', '#ffffff'], rep: 78 },
  { id: 'usma', name: 'USM Alger', short: 'USMA', country: 'ALG', colors: ['#c8102e', '#111111'], rep: 77 },
  { id: 'jsk2', name: 'JS Kabylie', short: 'JSKa', country: 'ALG', colors: ['#f6e000', '#0a8f3c'], rep: 74 },
  { id: 'tpm',  name: 'TP Mazembe', short: 'TPM', country: 'COD', colors: ['#000000', '#ffffff'], rep: 80 },
  { id: 'asv',  name: 'AS Vita Club', short: 'ASV', country: 'COD', colors: ['#0a8f3c', '#111111'], rep: 70 },
  { id: 'yng',  name: 'Young Africans', short: 'YAN', country: 'TAN', colors: ['#ffd200', '#0a8f3c'], rep: 77 },
  { id: 'sim',  name: 'Simba SC', short: 'SIM', country: 'TAN', colors: ['#d50000', '#ffffff'], rep: 76 },
  { id: 'pet',  name: 'Petro de Luanda', short: 'PET', country: 'ANG', colors: ['#0055a4', '#ffd200'], rep: 76 },
  { id: 'sml',  name: 'Stade Malien', short: 'SMA', country: 'MLI', colors: ['#003da5', '#ffffff'], rep: 68 },
  { id: 'asfa', name: 'ASEC Mimosas', short: 'ASEC', country: 'CIV', colors: ['#f39200', '#ffffff'], rep: 74 },
  { id: 'hor',  name: 'Horoya AC', short: 'HOR', country: 'GUI', colors: ['#d40000', '#ffffff'], rep: 70 },
  { id: 'enh',  name: 'Enyimba FC', short: 'ENY', country: 'NGA', colors: ['#0a8f3c', '#ffffff'], rep: 66 },
  { id: 'rvs',  name: 'Rivers United', short: 'RIV', country: 'NGA', colors: ['#0055a4', '#ffffff'], rep: 65 },
  { id: 'hil',  name: 'Al Hilal Omdurman', short: 'HIL', country: 'SUD', colors: ['#0055a4', '#ffffff'], rep: 74 },
  { id: 'mer',  name: 'Al Merreikh', short: 'MER', country: 'SUD', colors: ['#d40000', '#ffd200'], rep: 66 },
  { id: 'apr',  name: 'APR FC', short: 'APR', country: 'RWA', colors: ['#ffffff', '#111111'], rep: 64 },
  { id: 'dms',  name: 'Dreams FC', short: 'DRM', country: 'GHA', colors: ['#5a2d82', '#ffffff'], rep: 62 },
  { id: 'jwk',  name: 'Jwaneng Galaxy', short: 'JWG', country: 'BOT', colors: ['#0055a4', '#ffffff'], rep: 60 },
  { id: 'nk',   name: 'Nouadhibou FC', short: 'FCN', country: 'MTN', colors: ['#ffd200', '#0a8f3c'], rep: 60 },
  { id: 'ojf',  name: 'Al Ittihad Tripoli', short: 'ITT', country: 'LBY', colors: ['#d40000', '#ffffff'], rep: 66 },
  { id: 'zsc',  name: 'Zesco United', short: 'ZES', country: 'ZAM', colors: ['#f39200', '#111111'], rep: 60 },
];

// Qualifiés CAF pour la saison de départ (2026-27)
export const START_CAF = { cl: ['ca', 'est'], cc: ['css', 'st'], ccNote: 'Stade Tunisien : place à vérifier' };
export const START_CUP_HOLDER = 'est';
export const START_CHAMPION = 'ca';

// Prénoms / noms pour générer des joueurs FICTIFS (combinaisons aléatoires, aucune personne réelle visée)
export const FIRST = ['Ahmed','Mohamed','Youssef','Amine','Seifeddine','Hamza','Oussama','Aziz','Firas','Bilel','Wassim','Skander','Iheb','Rayen','Yassine','Nour','Ghaith','Ayoub','Khalil','Mehdi','Achraf','Anis','Haythem','Malek','Zied','Fedi','Moez','Oussema','Taha','Wael','Karim','Sami','Dali','Nouh','Haroun','Mazen','Arafet','Hedi','Slim','Rami','Chiheb','Aymen','Elyes','Montassar','Kais','Saber','Houssem','Jasser','Omar','Adem','Selim','Marouane','Nidhal','Tarek','Walid','Lotfi','Riadh','Bassem','Ilyes','Mootez'];
export const LAST = ['Ben Salah','Trabelsi','Jaziri','Mejri','Gharbi','Hamdi','Ayari','Chaabane','Bouazizi','Dridi','Khemiri','Ferjani','Sassi','Mathlouthi','Ben Amor','Jlassi','Belhadj','Abdelli','Zitouni','Hammami','Laabidi','Mansouri','Rekik','Bouguerra','Saidi','Ouni','Chebbi','Kchaou','Ben Romdhane','Masmoudi','Ghanmi','Fakhfakh','Karoui','Tlili','Selmi','Nasri','Baccar','Chouchane','Mzoughi','Boukhris','Jemai','Hnid','Khalfaoui','Brahmi','Zouari','Daoud','Mekki','Toumi','Habbassi','Khalfalli','Lahmar','Souissi','Bejaoui','Hosni','Romdhani','Ezzine','Ben Youssef','Marzouki','Haddad','Charfi'];
export const FOREIGN_FIRST = ['Ibrahima','Moussa','Kwame','Samuel','Emmanuel','Oumar','Cheick','Abdoulaye','Kofi','Mamadou','Junior','Christian','Yao','Didier','Seydou'];
export const FOREIGN_LAST = ['Diallo','Traoré','Koné','Mensah','Ouédraogo','Camara','Sissoko','Okafor','Boateng','Ndiaye','Kamara','Touré','Bamba','Keita','Sow'];
export const FOREIGN_NAT = ['CIV','MLI','SEN','NGA','GHA','CMR','BFA','GUI','ALG','LBY'];

export const STAFF_ROLES = [
  { id: 'head',      fr: 'Entraîneur principal',         ar: 'المدرب الرئيسي',        count: 1, base: 18000 },
  { id: 'assistant', fr: 'Entraîneur adjoint',           ar: 'مساعد المدرب',          count: 2, base: 6000 },
  { id: 'fitness',   fr: 'Préparateur physique',         ar: 'المعد البدني',          count: 1, base: 5000 },
  { id: 'gkcoach',   fr: 'Entraîneur des gardiens',      ar: 'مدرب الحراس',           count: 1, base: 4500 },
  { id: 'sportdir',  fr: 'Directeur sportif',            ar: 'المدير الرياضي',        count: 1, base: 9000 },
  { id: 'findir',    fr: 'Directeur financier',          ar: 'المدير المالي',         count: 1, base: 7000 },
  { id: 'doctor',    fr: 'Médecin-chef',                 ar: 'رئيس الطاقم الطبي',     count: 1, base: 7000 },
  { id: 'physio',    fr: 'Kinésithérapeute',             ar: 'أخصائي العلاج الطبيعي', count: 2, base: 3500 },
  { id: 'scout',     fr: 'Recruteur / scout',            ar: 'كشاف',                  count: 2, base: 3000 },
  { id: 'academy',   fr: 'Responsable centre de formation', ar: 'مسؤول مركز التكوين', count: 1, base: 5000 },
];

export const INFRA = [
  { id: 'stadium',  fr: 'Stade (capacité & confort)', ar: 'الملعب', cost: 900000 },
  { id: 'pitch',    fr: 'Pelouse',                    ar: 'العشب',  cost: 250000 },
  { id: 'lights',   fr: 'Éclairage',                  ar: 'الإنارة', cost: 300000 },
  { id: 'training', fr: "Centre d'entraînement",       ar: 'مركز التدريب', cost: 600000 },
  { id: 'academy',  fr: 'Académie',                   ar: 'الأكاديمية', cost: 550000 },
  { id: 'medical',  fr: 'Centre médical',             ar: 'المركز الطبي', cost: 450000 },
];

export const FORMATIONS = {
  '4-3-3':   [[-48,0],[-34,-22],[-36,-7],[-36,7],[-34,22],[-18,-12],[-20,0],[-18,12],[-4,-22],[-2,0],[-4,22]],
  '4-4-2':   [[-48,0],[-34,-22],[-36,-7],[-36,7],[-34,22],[-18,-22],[-20,-7],[-20,7],[-18,22],[-4,-7],[-4,7]],
  '4-2-3-1': [[-48,0],[-34,-22],[-36,-7],[-36,7],[-34,22],[-24,-8],[-24,8],[-10,-20],[-10,0],[-10,20],[-2,0]],
  '3-5-2':   [[-48,0],[-36,-14],[-37,0],[-36,14],[-18,-26],[-22,-9],[-24,0],[-22,9],[-18,26],[-4,-7],[-4,7]],
  '5-3-2':   [[-48,0],[-32,-26],[-37,-13],[-38,0],[-37,13],[-32,26],[-20,-12],[-22,0],[-20,12],[-4,-7],[-4,7]],
  '4-1-4-1': [[-48,0],[-34,-22],[-36,-7],[-36,7],[-34,22],[-26,0],[-14,-22],[-16,-7],[-16,7],[-14,22],[-2,0]],
};
// postes attendus par case de formation
export const FORMATION_POS = {
  '4-3-3':   ['GK','DD','DC','DC','DG','MC','MDC','MC','AD','BU','AG'],
  '4-4-2':   ['GK','DD','DC','DC','DG','MD','MC','MC','MG','BU','BU'],
  '4-2-3-1': ['GK','DD','DC','DC','DG','MDC','MDC','MD','MOC','MG','BU'],
  '3-5-2':   ['GK','DC','DC','DC','MD','MC','MDC','MC','MG','BU','BU'],
  '5-3-2':   ['GK','DD','DC','DC','DC','DG','MC','MDC','MC','BU','BU'],
  '4-1-4-1': ['GK','DD','DC','DC','DG','MDC','MD','MC','MC','MG','BU'],
};
export const POS_GROUP = { GK: 'G', DD: 'D', DC: 'D', DG: 'D', MDC: 'M', MC: 'M', MD: 'M', MG: 'M', MOC: 'M', AD: 'A', AG: 'A', BU: 'A' };
