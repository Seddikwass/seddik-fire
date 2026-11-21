// Commentaire de match : phrases originales en français, anglais et arabe (touches de derja
// tunisienne), choisies selon le contexte du jeu, sans répétition immédiate.

export const LINES = {
  fr: {
    kickoff: ['Coup d\'envoi ! {h} contre {a}.', 'C\'est parti au {st} !', 'L\'arbitre siffle le coup d\'envoi, {h} reçoit {a}.'],
    kickoff_derby: ['Coup d\'envoi du derby de la capitale ! {h} contre {a}, toute la ville retient son souffle.', 'Le derby est lancé ! Ambiance électrique au {st}.'],
    kickoff_big: ['Grand choc du championnat : {h} contre {a}, c\'est parti !'],
    second_half: ['Début de la seconde période.', 'On repart pour la deuxième mi-temps, {h} {sh} - {sa} {a}.'],
    goal: ['BUT ! {p} trompe le gardien !', 'BUUUT pour {t} ! Signé {p} !', 'Et c\'est au fond ! {p} marque pour {t} !'],
    goal_header: ['De la tête ! {p} catapulte le ballon au fond des filets !', 'Coup de tête parfait de {p}, but pour {t} !'],
    goal_long: ['Quelle frappe de loin de {p} ! Le gardien n\'a rien pu faire !', 'Une merveille de {p} à plus de vingt-cinq mètres !'],
    goal_penalty: ['{p} transforme le penalty avec sang-froid.', 'Penalty transformé par {p}, le gardien est battu.'],
    goal_freekick: ['Coup franc direct, au-dessus du mur, et c\'est but ! Chef-d\'œuvre de {p} !', 'Quel coup franc de {p} ! La lucarne !'],
    goal_own: ['Oh non ! Contre son camp, le ballon finit dans le but !', 'But contre son camp, terrible malchance pour la défense.'],
    goal_equaliser: ['Égalisation ! {p} remet {t} dans le match ! {h} {sh} - {sa} {a}.', 'Tout est à refaire ! {p} égalise pour {t} !'],
    goal_lead: ['{t} passe devant grâce à {p} ! {h} {sh} - {sa} {a}.'],
    goal_late: ['BUT dans les dernières minutes ! {p} fait exploser le stade !', 'À la dernière minute ! {p} offre peut-être la victoire à {t} !'],
    goal_brace: ['Doublé pour {p} ! Il est intenable aujourd\'hui !'],
    goal_hattrick: ['TRIPLÉ ! {p} signe un hat-trick historique !'],
    goal_rout: ['{t} enfonce le clou, {p} alourdit le score !'],
    save: ['Superbe arrêt de {p} !', 'Le gardien {p} s\'interpose !', 'Parade décisive de {p} !'],
    save_late: ['{p} sauve son équipe en fin de match !'],
    miss: ['Juste à côté !', 'Ça passe au-dessus !', 'Pas cadré.', 'Le ballon frôle le poteau !'],
    post: ['Sur le poteau !', 'Le montant repousse le ballon !', 'La barre transversale tremble encore !'],
    foul: ['Faute de {p}.', 'Coup franc sifflé.', 'L\'arbitre arrête le jeu, faute de {p}.'],
    yellow: ['Carton jaune pour {p}.', 'Avertissement pour {p}.'],
    red: ['Carton rouge ! {p} est expulsé !', 'Expulsion ! {p} laisse son équipe à dix !'],
    corner: ['Corner pour {t}.', 'Le ballon sort, corner pour {t}.'],
    penalty: ['Penalty pour {t} !', 'L\'arbitre désigne le point de penalty ! Penalty pour {t} !'],
    half: ['C\'est la mi-temps. {h} {sh} - {sa} {a}.'],
    full: ['Coup de sifflet final ! {h} {sh} - {sa} {a}.'],
    full_draw: ['Fin du match, les deux équipes se quittent dos à dos : {sh} partout.'],
    full_win: ['C\'est terminé ! Victoire de {w}, {h} {sh} - {sa} {a}.'],
    chance: ['Grosse occasion pour {t} !', '{p} s\'infiltre dans la surface !', '{p} arme sa frappe !'],
    injury: ['{p} est touché, il reste au sol.'],
    offside: ['Hors-jeu de {p}.', 'Le drapeau se lève : {p} était hors-jeu.'],
    late: ['Plus que quelques minutes à jouer !', 'On entre dans les dernières minutes, {h} {sh} - {sa} {a}.'],
    pressure: ['{t} pousse, l\'adversaire est acculé dans sa surface.', 'Temps fort pour {t}.'],
    shootout: ['Place aux tirs au but ! Les nerfs vont parler.'],
    shootout_goal: ['{p} ne tremble pas, c\'est dedans !', 'Tir au but réussi par {p}.'],
    shootout_save: ['Arrêt du gardien {k} ! Énorme !', '{k} a deviné le côté et repousse la tentative de {p} !'],
    shootout_miss: ['{p} manque sa tentative !', 'À côté ! {p} a la tête dans les mains.'],
    shootout_win: ['{w} se qualifie aux tirs au but !'],
  },
  en: {
    kickoff: ['Kick-off! {h} against {a}.', 'We are under way at {st}!', 'The referee gets us started, {h} host {a}.'],
    kickoff_derby: ['Kick-off in the Tunis derby! {h} against {a}, the whole city is watching.', 'The derby is on! An electric atmosphere at {st}.'],
    kickoff_big: ['A heavyweight clash: {h} against {a}, here we go!'],
    second_half: ['The second half is under way.', 'Back for the second half, {h} {sh} - {sa} {a}.'],
    goal: ['GOAL! {p} beats the keeper!', 'GOAL for {t}! {p} with the finish!', 'It\'s in! {p} scores for {t}!'],
    goal_header: ['A header! {p} powers it into the net!', 'Perfect header from {p}, goal for {t}!'],
    goal_long: ['What a strike from distance by {p}! The keeper had no chance!', 'A stunner from {p} from over twenty-five metres!'],
    goal_penalty: ['{p} coolly converts the penalty.', 'Penalty scored by {p}, the keeper is beaten.'],
    goal_freekick: ['Direct free kick, over the wall, and in! A masterpiece from {p}!', 'What a free kick from {p}! Top corner!'],
    goal_own: ['Oh no! An own goal!', 'Own goal, a cruel moment for the defence.'],
    goal_equaliser: ['Equaliser! {p} brings {t} level! {h} {sh} - {sa} {a}.', 'All square! {p} equalises for {t}!'],
    goal_lead: ['{t} go in front thanks to {p}! {h} {sh} - {sa} {a}.'],
    goal_late: ['A late goal! {p} sends the stadium wild!', 'At the death! {p} might have won it for {t}!'],
    goal_brace: ['That\'s two for {p}! Unstoppable today!'],
    goal_hattrick: ['HAT-TRICK! {p} completes a historic treble!'],
    goal_rout: ['{t} pile on the misery, {p} adds another!'],
    save: ['Great save by {p}!', 'The keeper {p} stands tall!', 'A crucial stop from {p}!'],
    save_late: ['{p} rescues his side late on!'],
    miss: ['Just wide!', 'Over the bar!', 'Off target.', 'That one shaved the post!'],
    post: ['Off the post!', 'The woodwork denies him!', 'The crossbar is still shaking!'],
    foul: ['Foul by {p}.', 'Free kick given.', 'The referee stops play, foul by {p}.'],
    yellow: ['Yellow card for {p}.', 'A booking for {p}.'],
    red: ['Red card! {p} is sent off!', 'Sent off! {p} leaves his team with ten men!'],
    corner: ['Corner to {t}.', 'It goes out, corner for {t}.'],
    penalty: ['Penalty to {t}!', 'The referee points to the spot! Penalty for {t}!'],
    half: ['Half-time. {h} {sh} - {sa} {a}.'],
    full: ['Full-time! {h} {sh} - {sa} {a}.'],
    full_draw: ['Full-time, honours even: {sh} apiece.'],
    full_win: ['It\'s all over! Victory for {w}, {h} {sh} - {sa} {a}.'],
    chance: ['Big chance for {t}!', '{p} breaks into the box!', '{p} pulls the trigger!'],
    injury: ['{p} is down injured.'],
    offside: ['Offside against {p}.', 'The flag goes up: {p} was offside.'],
    late: ['Only a few minutes left!', 'Into the final minutes, {h} {sh} - {sa} {a}.'],
    pressure: ['{t} are pushing, the opposition pinned back.', 'A spell of pressure from {t}.'],
    shootout: ['It\'s down to penalties! Nerves of steel needed.'],
    shootout_goal: ['{p} makes no mistake!', 'Penalty scored by {p}.'],
    shootout_save: ['Saved by {k}! Huge!', '{k} guesses right and keeps out {p}!'],
    shootout_miss: ['{p} misses!', 'Wide! {p} can\'t believe it.'],
    shootout_win: ['{w} go through on penalties!'],
  },
  ar: {
    kickoff: ['انطلاق المباراة! {h} ضد {a}.', 'صافرة البداية في {st}!'],
    kickoff_derby: ['انطلاق دربي العاصمة! {h} ضد {a}، البلاد الكل تتفرج!', 'الدربي بدا! أجواء نار في {st}.'],
    kickoff_big: ['قمة كبيرة: {h} ضد {a}!'],
    second_half: ['انطلاق الشوط الثاني.', 'الشوط الثاني بدا، {h} {sh} - {sa} {a}.'],
    goal: ['هدف! {p} يسجل ل{t}!', 'قووول! رائع من {p}!', 'في الشباك! {p} يسجل!'],
    goal_header: ['ضربة رأسية! {p} يسكنها الشباك!'],
    goal_long: ['يا سلام! قذفة صاروخية من بعيد من {p}!'],
    goal_penalty: ['{p} ينفذ ضربة الجزاء بنجاح.'],
    goal_freekick: ['مخالفة مباشرة فوق الحائط وفي الشباك! تحفة من {p}!'],
    goal_own: ['هدف ضد مرماه! حظ سيء للدفاع.'],
    goal_equaliser: ['التعادل! {p} يعيد {t} للمباراة!'],
    goal_lead: ['{t} يتقدم بفضل {p}! {h} {sh} - {sa} {a}.'],
    goal_late: ['هدف في الدقائق الأخيرة! {p} يفجر الملعب!'],
    goal_brace: ['ثنائية ل{p}! ما ثماش كيفو اليوم!'],
    goal_hattrick: ['هاتريك! {p} يسجل ثلاثية تاريخية!'],
    goal_rout: ['{t} يواصل التسجيل، {p} يضيف هدفا آخر!'],
    save: ['تصد رائع من {p}!', 'الحارس {p} يتألق!'],
    save_late: ['{p} ينقذ فريقه في آخر الدقائق!'],
    miss: ['بجانب القائم!', 'فوق العارضة!', 'خارج الإطار.'],
    post: ['القائم!', 'العارضة ترد الكرة!'],
    foul: ['خطأ من {p}.', 'مخالفة.'],
    yellow: ['بطاقة صفراء ل{p}.'],
    red: ['بطاقة حمراء! طرد {p}!'],
    corner: ['ركنية ل{t}.'],
    penalty: ['ضربة جزاء ل{t}!'],
    half: ['نهاية الشوط الأول. {h} {sh} - {sa} {a}.'],
    full: ['نهاية المباراة! {h} {sh} - {sa} {a}.'],
    full_draw: ['نهاية المباراة بالتعادل: {sh} - {sa}.'],
    full_win: ['انتهت! فوز {w}، {h} {sh} - {sa} {a}.'],
    chance: ['فرصة خطيرة ل{t}!', '{p} يدخل منطقة الجزاء!'],
    injury: ['{p} مصاب.'],
    offside: ['تسلل على {p}.'],
    late: ['بقيت دقائق قليلة!'],
    pressure: ['ضغط كبير من {t}.'],
    shootout: ['ضربات الترجيح! الأعصاب هي اللي باش تحكم.'],
    shootout_goal: ['{p} يسجل بثقة!'],
    shootout_save: ['تصد من {k}! رائع!'],
    shootout_miss: ['{p} يضيع!'],
    shootout_win: ['{w} يتأهل بضربات الترجيح!'],
  },
  // Style « grande soirée TV » en arabe : phrases originales, rythme et emphase de retransmission.
  ar_tv: {
    kickoff: ['بسم الله نبداو! {h} في مواجهة {a}، والصافرة تعلن البداية!', 'مساء الخير وأهلا بكم في {st}، المدرجات ممتلئة والمباراة تنطلق الآن!', 'انطلقت المواجهة! {h} و{a}، تسعون دقيقة من الإثارة!'],
    kickoff_derby: ['إنه الدربي يا سادة! {h} و{a}، العاصمة كلها على أعصابها!', 'دربي النار ينطلق في {st}! لا صوت يعلو فوق صوت الجماهير!'],
    kickoff_big: ['قمة كروية من العيار الثقيل! {h} أمام {a}، انطلقنا!'],
    second_half: ['عدنا إليكم والشوط الثاني ينطلق، والنتيجة {sh} - {sa}.', 'الشوط الثاني يبدأ، كل شيء ممكن في هذه المباراة!'],
    goal: ['قووووووووول! {p}! يا سلااام! هدف ولا أروع ل{t}!', 'قووول قووول قووول! {p} يسكنها الشباك! {t} يسجل!', 'في الشباااك! {p}! ما أجملها من لقطة!'],
    goal_header: ['رأسية ولا أروع! {p} يطير في السماء ويسجل! قووووول!', 'بالرأس! {p} يرتقي فوق الجميع ويسكنها الشباك!'],
    goal_long: ['يا للهول! قذيفة صاروخية من {p}! من أين جاء بهذه الكرة؟ قووووول!', 'من بعييييد! {p} يطلق صاروخا لا يُصد ولا يُرد!'],
    goal_penalty: ['{p} يتقدم... يسدد... قووول! بكل ثقة من نقطة الجزاء!', 'ضربة جزاء محولة بنجاح! {p} لا يرتجف!'],
    goal_freekick: ['مخالفة مباشرة فوق الحائط وفي الزاوية التسعين! يا سلام يا {p}!', 'لوحة فنية من {p}! الكرة تلتف وتسكن الشباك!'],
    goal_own: ['يا للحسرة! هدف عكسي في مرماه! الكرة تخدع الجميع!'],
    goal_equaliser: ['التعااادل! {p} يعيد {t} إلى المباراة! {sh} - {sa}، كل شيء من جديد!', 'هدف التعادل! {p}! المباراة تشتعل من جديد!'],
    goal_lead: ['{t} يتقدم! {p} يمنح التقدم لفريقه! {h} {sh} - {sa} {a}!'],
    goal_late: ['في الوقت القاتل! قووووووول! {p} يفجر المدرجات! يا لها من نهاية!', 'هدف في الأنفاس الأخيرة! {p} يكتب اسمه بأحرف من ذهب!'],
    goal_brace: ['الثنائية! {p} يسجل من جديد! اللاعب في يوم استثنائي!'],
    goal_hattrick: ['هاتريك! ثلاثية تاريخية ل{p}! ارفعوا القبعات!'],
    goal_rout: ['{t} لا يرحم! {p} يضيف هدفا جديدا والنتيجة تتسع!'],
    save: ['ياااا سلام على الحارس! {p} يطير ويبعد الكرة!', 'تصد خرافي من {p}! أنقذ فريقه من هدف محقق!', 'الحارس {p} في الموعد! أيادٍ من ذهب!'],
    save_late: ['{p} ينقذ الموقف في آخر اللحظات! حارس عملاق!'],
    miss: ['آآآه! تمر بجانب القائم! كانت قريبة جدا!', 'فوق العارضة! ضاعت فرصة ذهبية!', 'لا لا لا! كيف ضاعت هذه؟'],
    post: ['القائم! القائم يرفض الهدف!', 'العارضة! الكرة ترتطم بالخشب وتعود!'],
    foul: ['خطأ واضح من {p}، والحكم يطلق صافرته.', 'مخالفة! الحكم يوقف اللعب.'],
    yellow: ['بطاقة صفراء ل{p}، الحكم لم يتردد.', 'إنذار ل{p}، عليه أن ينتبه الآن.'],
    red: ['بطاقة حمراء! {p} خارج الملعب! فريقه يكمل بعشرة لاعبين!', 'طرد! الحكم يشهر الحمراء في وجه {p}!'],
    corner: ['ركنية ل{t}، الجميع يصعد إلى منطقة الجزاء.', 'الكرة تخرج، ضربة ركنية ل{t}.'],
    penalty: ['ضربة جزاء! الحكم يشير إلى النقطة! ضربة جزاء ل{t}!', 'بنالتي! بنالتي ل{t}!'],
    half: ['صافرة نهاية الشوط الأول، {h} {sh} - {sa} {a}. نعود إليكم بعد الاستراحة.'],
    full: ['صافرة النهاية! {h} {sh} - {sa} {a}.'],
    full_draw: ['انتهت المباراة بالتعادل {sh} - {sa}، والنقطة لكل فريق.'],
    full_win: ['انتهى اللقاء! فوز مستحق ل{w}! {h} {sh} - {sa} {a}، شكرا لكم على المتابعة!'],
    chance: ['انتبه انتبه! {p} داخل منطقة الجزاء!', 'هجمة خطيرة ل{t}! {p} يستعد للتسديد!', 'فرصة! فرصة ل{t}!'],
    injury: ['{p} يسقط على الأرض، نتمنى ألا تكون الإصابة خطيرة.'],
    offside: ['الراية ترتفع، تسلل على {p}.'],
    late: ['الدقائق الأخيرة! الأعصاب مشدودة في المدرجات!', 'بقيت دقائق معدودة، {h} {sh} - {sa} {a}!'],
    pressure: ['{t} يضغط بكل قوة، المنافس محاصر في مناطقه!', 'سيطرة كاملة ل{t} في هذه الدقائق!'],
    shootout: ['ضربات الترجيح! لحظات لا يتحملها أصحاب القلوب الضعيفة!'],
    shootout_goal: ['{p} يسجل! بكل برودة أعصاب!'],
    shootout_save: ['الحارس {k} يصد! يا سلام! الحارس بطل اللحظة!'],
    shootout_miss: ['{p} يضيع! يا للحسرة!'],
    shootout_win: ['{w} يتأهل بضربات الترجيح! فرحة جنونية في المدرجات!'],
    analyst: ['يا له من هدف! هذه هي كرة القدم!', 'لقطة ستبقى في الذاكرة طويلا.', 'شاهدوا الإعادة، تمركز مثالي وتسديدة لا تُصد.', 'الجماهير تستحق هذه الفرحة الليلة!'],
  },
};

// Noms arabes des clubs (lus par la voix arabe à la place des sigles).
export const TEAM_AR = { est: 'الترجي', ca: 'الإفريقي', css: 'الصفاقسي', ess: 'النجم الساحلي', st: 'الملعب التونسي', usm: 'المنستيري', esz: 'جرجيس', esm: 'المتلوي', jso: 'العمران', usbg: 'بن قردان', asm: 'المرسى', cab: 'البنزرتي', ob: 'الأولمبي الباجي', eshs: 'حمام سوسة', psse: 'ساقية الداير', cshl: 'حمام الأنف' };
export const COMMENTARY_STYLES = [['auto', 'Langue du jeu'], ['fr', 'Français'], ['ar', 'Arabe (sobre)'], ['ar_tv', 'Arabe – soirée TV'], ['en', 'English']];
export function commentaryLang(setting, uiLang) { return setting && setting !== 'auto' && LINES[setting] ? setting : uiLang || 'fr'; }

// Rivalités : derby de la capitale (Espérance – Club Africain) et chocs entre grands clubs.
const BIG_CLUBS = new Set(['est', 'ca', 'ess', 'css']);
export function getMatchFlavor(homeId, awayId) {
  const pair = [homeId, awayId].sort().join('-');
  if (pair === 'ca-est') return 'derby';
  if (BIG_CLUBS.has(homeId) && BIG_CLUBS.has(awayId)) return 'big';
  return null;
}

// Clé de commentaire la plus spécifique pour un but, de la plus marquante à la plus générale.
export function getGoalCommentKeys({ own = false, scorerGoals = 1, minute = 45, scoreAfter = [1, 0], team = 0, kind = null, distance = 12 } = {}) {
  const keys = [];
  const mine = scoreAfter[team], theirs = scoreAfter[1 - team];
  if (own) return ['goal_own', 'goal'];
  if (scorerGoals === 3) keys.push('goal_hattrick');
  if (minute >= 85 && mine - theirs >= 0 && mine - theirs <= 1) keys.push('goal_late');
  if (scorerGoals === 2) keys.push('goal_brace');
  if (mine === theirs) keys.push('goal_equaliser');
  if (kind === 'penalty') keys.push('goal_penalty');
  if (kind === 'freekick') keys.push('goal_freekick');
  if (kind === 'header') keys.push('goal_header');
  if (distance >= 24) keys.push('goal_long');
  if (mine - theirs === 1) keys.push('goal_lead');
  if (mine - theirs >= 3) keys.push('goal_rout');
  keys.push('goal');
  return keys;
}

// Choix d'une phrase : la clé la plus spécifique disponible, en évitant la dernière phrase dite.
export function pickLine(lang, keys, roll = Math.random, memory = null) {
  const table = LINES[lang] || LINES.fr;
  const list = Array.isArray(keys) ? keys : [keys];
  const key = list.find(k => table[k]?.length) || list.find(k => LINES.fr[k]?.length);
  if (!key) return null;
  const lines = table[key] || LINES.fr[key];
  let index = Math.floor(roll() * lines.length) % lines.length;
  const last = memory?.get(key);
  if (lines.length > 1 && last === index) index = (index + 1) % lines.length;
  memory?.set(key, index);
  return { key, text: lines[index] };
}

export function fillLine(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? '');
}
