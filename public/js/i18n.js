// Traductions : la clé est le texte français ; l'arabe et l'anglais sont des dictionnaires.
// Architecture prête pour d'autres langues : ajouter un dictionnaire dans DICTS.
const AR = {
  'Accueil': 'الرئيسية', 'Carrière': 'المسيرة', 'Match': 'مباراة', 'Effectif': 'التشكيلة', 'Tactique': 'الخطة',
  'Transferts': 'الانتقالات', 'Staff': 'الطاقم', 'Finances': 'المالية', 'Infrastructures': 'المنشآت', 'Compétitions': 'المسابقات',
  'Classements': 'الترتيب', 'Paramètres': 'الإعدادات', 'Médical': 'الطبي', 'Président': 'الرئيس', 'Supporters': 'الجماهير',
  'Nouvelle carrière': 'مسيرة جديدة', 'Continuer': 'متابعة', 'Match rapide': 'مباراة سريعة', 'Jouer': 'العب', 'Simuler': 'محاكاة',
  'Prochain match': 'المباراة القادمة', 'Choisir un club': 'اختر ناديا', 'Créer un club fictif': 'إنشاء ناد خيالي',
  'Difficulté': 'الصعوبة', 'Facile': 'سهل', 'Normal': 'عادي', 'Difficile': 'صعب', 'Légende': 'أسطوري',
  'Objectif': 'الهدف', 'Maintien': 'البقاء', 'Qualification africaine': 'التأهل الإفريقي', 'Podium': 'المراكز الثلاثة الأولى', 'Titre': 'اللقب',
  'Valider': 'تأكيد', 'Annuler': 'إلغاء', 'Retour': 'رجوع', 'Fermer': 'إغلاق', 'Sauvegarder': 'حفظ', 'Acheter': 'شراء', 'Vendre': 'بيع',
  'Prêter': 'إعارة', 'Prolonger': 'تمديد', 'Recruter': 'انتداب', 'Licencier': 'إقالة', 'Négocier': 'تفاوض', 'Améliorer': 'تطوير',
  'Budget': 'الميزانية', 'Trésorerie': 'الخزينة', 'Masse salariale': 'كتلة الأجور', 'Revenus': 'المداخيل', 'Dépenses': 'المصاريف',
  'Ligue 1': 'الرابطة المحترفة الأولى', 'Coupe de Tunisie': 'كأس تونس', 'Ligue des Champions CAF': 'رابطة أبطال إفريقيا',
  'Coupe de la Confédération CAF': 'كأس الكونفدرالية الإفريقية', 'Supercoupe': 'الكأس الممتازة', 'Amical': 'ودية',
  'Passe': 'تمرير', 'Profondeur': 'بينية', 'Tir': 'تسديد', 'Sprint': 'جري', 'Tacle': 'افتكاك', 'Changer': 'تبديل', 'Pressing': 'ضغط',
  'Pause': 'إيقاف', 'Reprendre': 'استئناف', 'Quitter': 'خروج', 'Mi-temps': 'نهاية الشوط الأول', 'Fin du match': 'نهاية المباراة', 'BUT !': '! هدف',
  'Ralenti': 'إعادة', 'Langue': 'اللغة', 'Son': 'الصوت', 'Commentaires vocaux': 'التعليق الصوتي', 'Qualité graphique': 'جودة الرسوم', 'Caméra': 'الكاميرا', 'Tutoriel': 'الدرس التعليمي',
  'Durée du match': 'مدة المباراة', 'Assistance passe/tir': 'مساعدة التمرير/التسديد', 'Images/seconde': 'الإطارات/ثانية',
  'Élections': 'الانتخابات', 'Satisfaction': 'الرضا', 'Confiance': 'الثقة', 'Réputation': 'السمعة', 'Moral': 'المعنويات', 'Forme': 'الجاهزية',
  'Blessé': 'مصاب', 'Suspendu': 'موقوف', 'Titulaires': 'الأساسيون', 'Remplaçants': 'الاحتياط', 'Capitaine': 'القائد',
  'Entraînement': 'التدريب', 'Formation': 'الرسم التكتيكي', 'Mentalité': 'العقلية', 'Largeur': 'العرض', 'Ligne défensive': 'خط الدفاع',
  'Compte': 'الحساب', 'Connexion': 'تسجيل الدخول', 'Inscription': 'إنشاء حساب', 'Déconnexion': 'تسجيل الخروج', 'Synchroniser': 'مزامنة',
  'Hors ligne': 'غير متصل', 'En ligne': 'متصل', 'Saison': 'الموسم', 'Journée': 'الجولة', 'Semaine': 'الأسبوع', 'Avancer': 'تقدم',
  'Avancer au prochain match': 'انتقل إلى المباراة القادمة', 'Actualités': 'الأخبار', 'Calendrier': 'الرزنامة', 'Statistiques': 'الإحصائيات',
  'Buteurs': 'الهدافون', 'Joueurs fictifs': 'لاعبون خياليون', 'Regarder une pub (récompense)': 'شاهد إعلانا (مكافأة)',
  'Démissionner': 'الاستقالة', 'Programme électoral': 'البرنامج الانتخابي', 'Candidats': 'المترشحون', 'Résultats': 'النتائج',
  'Offres reçues': 'العروض الواردة', 'Marché des transferts': 'سوق الانتقالات', 'Mes offres': 'عروضي', 'Historique': 'السجل',
  'Contrats': 'العقود', 'À traiter': 'مهام عاجلة', 'Club': 'النادي', 'Cohésion': 'الانسجام', 'Mercato': 'الميركاتو', 'Jeunes': 'الشبان', 'Réserve': 'الاحتياطي', 'Diagnostic': 'التشخيص', 'Traitement': 'العلاج',
};
const EN = {
  'Accueil': 'Home', 'Caméra': 'Camera', 'Tutoriel': 'Tutorial', 'Carrière': 'Career', 'Effectif': 'Squad', 'Tactique': 'Tactics', 'Transferts': 'Transfers', 'Finances': 'Finances',
  'Infrastructures': 'Facilities', 'Compétitions': 'Competitions', 'Classements': 'Standings', 'Paramètres': 'Settings', 'Médical': 'Medical',
  'Nouvelle carrière': 'New career', 'Continuer': 'Continue', 'Match rapide': 'Quick match', 'Jouer': 'Play', 'Simuler': 'Simulate',
  'Passe': 'Pass', 'Profondeur': 'Through', 'Tir': 'Shoot', 'Tacle': 'Tackle', 'Changer': 'Switch', 'Valider': 'Confirm', 'Annuler': 'Cancel', 'Retour': 'Back',
};
const DICTS = { fr: {}, ar: AR, en: EN };
let lang = 'fr';
export function setLang(l) {
  lang = DICTS[l] ? l : 'fr';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
export const getLang = () => lang;
export const t = s => (DICTS[lang] && DICTS[lang][s]) || s;
