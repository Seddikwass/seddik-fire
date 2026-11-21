# Demande d'autorisation — commentaires audio SEDDIK LEAGUE

Modèle à envoyer à chaque commentateur (et, si les enregistrements existants appartiennent à un diffuseur, au diffuseur concerné). **Aucune voix n'est clonée, imitée ou synthétisée à partir de retransmissions publiques** : sans contrat écrit couvrant explicitement ces usages, le jeu utilise une voix originale (synthèse non imitatrice).

Destinataires souhaités (liste de négociation, aucune participation confirmée) : Issam Chaouali, Raouf Khelif, Hafid Derraji, Youssef Seif — contacts à vérifier via leurs représentants (voir références du cahier des charges, §18).

---

Objet : Proposition de collaboration — commentaires du jeu vidéo SEDDIK LEAGUE

Madame, Monsieur,

Nous développons SEDDIK LEAGUE, un jeu de football consacré au championnat tunisien (navigateur et Android). Nous souhaiterions vous proposer d'enregistrer les commentaires du jeu.

Nous proposons :
1. l'enregistrement en studio de nouvelles phrases de commentaire (environ 1 500 à 3 000 répliques courtes : coup d'envoi, passes, tirs, arrêts, buts, cartons, VAR, mi-temps, fin de match, noms des clubs et des joueurs) ;
2. l'utilisation de votre nom et d'une image promotionnelle validée par vous ;
3. l'intégration et la distribution de ces enregistrements dans le jeu (web et mobile) et ses mises à jour.

Points à définir ensemble : durée, territoires, langues (arabe standard, dialecte tunisien, français), monétisation et publicité, exclusivité éventuelle, renouvellement, droit de retrait, rémunération, sous-traitants techniques. Toute utilisation de synthèse vocale ou d'IA à partir de votre voix ne serait possible qu'avec une clause écrite spécifique ; à défaut, elle est exclue.

Nous restons à votre disposition pour un échange.

Cordialement,
[Nom, fonction, coordonnées]

---

## Intégration technique prévue (déjà prête côté jeu)
- Sélection du commentateur dans les réglages (`Commentaire du match`) ; aujourd'hui : français, arabe sobre, arabe « soirée TV », anglais (synthèse non imitatrice).
- Moteur d'événements avec priorités, anti-répétition et intonation selon l'action (`public/js/commentary.js`, `public/js/audio.js`).
- Prochaine étape après signature : lecteur d'enregistrements par événement (fichiers audio par réplique) avec repli automatique sur la synthèse.
