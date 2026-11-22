// SEDDIK LEAGUE — historique des compositions par match (archive non destructive).
// Chaque entrée garde les noms tels que publiés (raw) et la source. Le dernier onze de chaque club (REAL_XI) n'écrase pas l'historique.
// Statut : « publié » = composition publiée par un média ou fournisseur de données ; « vérifié » seulement après contrôle de la feuille FTF.
import { REAL_XI } from './data.js';

const LA_PRESSE = 'La Presse de Tunisie';
const BIBLE = 'Master Production Bible SEDDIK LEAGUE (22/11/2026)';
// Matchs antérieurs au dernier onze connu (sources : presse et dossier de production).
const EARLIER = [
  { id: '2026-10-23-usbg-st', date: '23/10/2026', comp: 'Ligue 1 2026-27', home: 'usbg', away: 'st', score: '1-0',
    sides: { usbg: { raw: ['Ayoub Ben Mcharek', 'Ghazi Ayadi', 'Jassem Abcha', 'Lassad Hammami', 'Salah Harrabi', 'Nassim Chachia', 'Oussema Amri', 'M’Ghezzi Bakhouche Abdelouahab', 'Daniel Oboh', 'Mohamed Cherif Camara', 'Prince Agbanou'], source: 'Football Tunisien' } } },
  { id: '2026-11-03-st-ca', date: '03/11/2026', comp: 'Ligue 1 2026-27', home: 'st', away: 'ca', score: null,
    sides: {
      ca: { raw: ['Abdelmouhib Chamakh', 'Ghassen Mahersi', 'Yassine Bouabid', 'Hamza Khadhraoui', 'Ghaith Zaalouni', 'Phillippe Kinzumbi', 'Saido Khan', 'Motaz Zaddem', 'Osama Elsharimi', 'Ismaila Simpara', 'Sadok Kadida'], source: `${LA_PRESSE} ; ${BIBLE} (S21)` },
      st: { raw: ['Aziz Saihi', 'Skander Sghaier', 'Wael Ouerghemmi', 'Youssef Dabou Saafi', 'Amadou Dia N’Diaye', 'Youssouf Oumarou', 'Baraket Hmidi', 'Youssouf Touré', 'Noureddine Farhati', 'Rayed Derbali', 'Mame Thioune'], source: `${BIBLE} (S21)` } } },
  { id: '2026-11-07-est-usm', date: '07/11/2026', comp: 'Ligue 1 2026-27', home: 'est', away: 'usm', score: '1-0',
    sides: { usm: { raw: ['Yassine Amri', 'Ahmed Slimane', 'Mahmoud Ghorbel', 'Rayane Azzouz', 'Raed Bouchniba', 'Salah Barhoumi', 'Youssef Herch', 'Ousmane Diané', 'Mazen Slama', 'Rayan Boukadida', 'Béchir Yacoub'], source: `${BIBLE} (S18-S19)` } } },
  { id: '2026-11-07-ess-css', date: '07/11/2026', comp: 'Ligue 1 2026-27', home: 'ess', away: 'css', score: null,
    sides: {
      ess: { raw: ['Sabri Ben Hassen', 'Boubacar Diarra', 'Ambrose Ochigbo', 'Najeh Ferjani', 'Wajdi Kechrida', 'Ousmane Diakité', 'Oussama Abid', 'Rayane Anane', 'Achraf Ben Dhiaf', 'Abdallah Amri', 'Oscar Wellington'], source: LA_PRESSE },
      css: { raw: ['Aymen Dahmen', 'Kevin Mondeko', 'Hamza Mathlouthi', 'Ali Maâloul', 'Mohamed Salah Mhadhebi', 'Jack Mbe', 'Mohamed Trabelsi', 'Louay Traii', 'Jamal Mutyaba', 'Iyad Belouafi', 'Josna Loulendo'], source: LA_PRESSE } } },
  { id: '2026-11-08-esm-esz', date: '08/11/2026', comp: 'Ligue 1 2026-27', home: 'esm', away: 'esz', score: '2-1', sides: {} },
];

const parseDate = d => { const [dd, mm, yy] = String(d).split('/').map(Number); return new Date(yy, mm - 1, dd).getTime(); };

// Historique d'un club, du plus récent au plus ancien : dernier onze (REAL_XI) + matchs antérieurs archivés.
export function lineupHistory(cid) {
  const out = [];
  const R = REAL_XI[cid];
  if (R) out.push({ date: R.date, match: R.match, xi: R.xi, source: R.source, url: R.url, status: 'publié', latest: true, note: R.note || '' });
  for (const m of EARLIER) {
    const side = m.sides[cid]; if (!side) continue;
    if (R && R.date === m.date) continue;
    out.push({ date: m.date, match: `${m.home.toUpperCase()} – ${m.away.toUpperCase()}${m.score ? ' ' + m.score : ''}`, xi: side.raw, source: side.source, url: '', status: 'publié', latest: false, note: '' });
  }
  return out.sort((a, b) => parseDate(b.date) - parseDate(a.date));
}
export const LINEUP_MATCHES = EARLIER;
