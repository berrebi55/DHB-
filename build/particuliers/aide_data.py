# -*- coding: utf-8 -*-
"""Base d'aide GRAND PUBLIC — DHB Particuliers.
Questions réelles que tapent les particuliers, réponses simples et rassurantes.
Chaque fiche finit par un CTA vers l'abonnement / l'aide.
"""

CATEGORIES = {
    "ordi": "Ordinateur (lenteur, panne)",
    "internet": "Internet, box & Wi-Fi",
    "securite": "Sécurité & arnaques",
    "donnees": "Photos & données",
    "email": "Email & comptes",
    "mobile": "Smartphone & tablette",
    "impression": "Imprimante",
    "conseil": "Conseils & achat",
}

CAT_ICON = {
    "ordi": "💻", "internet": "📶", "securite": "🛡️", "donnees": "📷",
    "email": "✉️", "mobile": "📱", "impression": "🖨️", "conseil": "💡",
}

A = [
    # ---------- ORDINATEUR ----------
    {"slug": "ordinateur-maison-tres-lent", "cat": "ordi",
     "q": "Mon ordinateur est devenu très lent, que faire ?",
     "sym": "Votre ordinateur met une éternité à démarrer et rame à chaque clic ? C'est frustrant, mais dans la majorité des cas, ça se répare sans en racheter un.",
     "causes": ["Disque dur ancien et saturé", "Trop de programmes qui se lancent au démarrage", "Un virus ou des logiciels indésirables", "Pas assez de mémoire (RAM)"],
     "check": ["Redémarrez complètement l'ordinateur", "Faites un peu de place (supprimez ce qui ne sert plus)", "Désinstallez les logiciels que vous n'utilisez pas", "Lancez une analyse antivirus"],
     "call": "Souvent, ajouter un disque SSD ou nettoyer la machine lui redonne une seconde jeunesse pour peu cher. On peut regarder ça ensemble, à distance ou chez vous."},
    {"slug": "ordinateur-ne-sallume-plus-maison", "cat": "ordi",
     "q": "Mon ordinateur ne s'allume plus du tout",
     "sym": "Vous appuyez sur le bouton et rien ne se passe : pas de lumière, pas de bruit.",
     "causes": ["Chargeur ou batterie en cause (portable)", "Prise ou câble d'alimentation défectueux", "Composant interne défaillant"],
     "check": ["Testez une autre prise électrique", "Vérifiez que le chargeur est bien branché et que son voyant s'allume", "Sur un portable, laissez-le charger 15 minutes avant de réessayer"],
     "call": "Si rien n'y fait, c'est une panne matérielle — mais vos photos et documents sont presque toujours récupérables. On établit un diagnostic clair avant toute chose."},
    {"slug": "ordinateur-chauffe-ventilateur-bruyant", "cat": "ordi",
     "q": "Mon ordinateur chauffe et le ventilateur fait beaucoup de bruit",
     "sym": "La machine devient chaude et bruyante, parfois elle ralentit ou s'éteint toute seule.",
     "causes": ["Poussière accumulée dans les aérations", "Ordinateur posé sur une surface molle (lit, canapé)", "Trop de programmes ouverts en même temps"],
     "check": ["Posez l'ordinateur sur une surface dure et plane", "Vérifiez que les grilles d'aération ne sont pas bouchées", "Fermez les programmes inutiles"],
     "call": "Un nettoyage interne et le remplacement de la pâte thermique règlent souvent le problème. On s'en occupe proprement, sans risque pour vos données."},

    # ---------- INTERNET ----------
    {"slug": "plus-dinternet-a-la-maison", "cat": "internet",
     "q": "Je n'ai plus Internet à la maison, comment faire ?",
     "sym": "Plus de connexion sur aucun appareil ? Avant d'appeler l'opérateur (et d'attendre), quelques gestes simples résolvent souvent la panne.",
     "causes": ["Box à redémarrer", "Câble débranché", "Coupure chez votre opérateur", "Box en panne ou mal configurée"],
     "check": ["Regardez les voyants de la box (un voyant rouge = souvent une coupure opérateur)", "Débranchez la box, attendez 30 secondes, rebranchez et patientez 3-5 minutes", "Vérifiez que les câbles sont bien en place"],
     "call": "Si Internet ne revient pas, on vous aide à identifier si ça vient de la box, des câbles ou de l'opérateur — souvent réglé en quelques minutes à distance."},
    {"slug": "wifi-faible-dans-la-maison", "cat": "internet",
     "q": "Le Wi-Fi ne capte pas bien dans certaines pièces",
     "sym": "La connexion est bonne près de la box mais faible ou inexistante dans les chambres ou à l'étage.",
     "causes": ["Box mal placée (au sol, dans un meuble)", "Murs épais ou étage qui bloquent le signal", "Box ancienne", "Trop d'appareils connectés"],
     "check": ["Placez la box en hauteur et à découvert", "Rapprochez-vous pour vérifier que le problème vient bien de la couverture", "Redémarrez la box"],
     "call": "Souvent, un répéteur Wi-Fi ou un système adapté couvre toute la maison. On vous conseille la solution la plus simple et on l'installe."},
    {"slug": "box-internet-clignote-rouge", "cat": "internet",
     "q": "La box clignote en rouge / orange, est-ce grave ?",
     "sym": "Un voyant anormal sur la box inquiète, mais il indique surtout quoi vérifier.",
     "causes": ["Coupure de la ligne (opérateur)", "Synchronisation en cours après un redémarrage", "Câble fibre ou téléphone débranché", "Box en défaut"],
     "check": ["Prenez en photo les voyants (utile pour le support)", "Redémarrez la box et patientez quelques minutes", "Vérifiez les branchements"],
     "call": "Chaque box a son code couleur. On vous dit en un coup d'œil ce que signifient vos voyants et comment rétablir la connexion."},
    {"slug": "tv-streaming-qui-rame", "cat": "internet",
     "q": "Netflix / la TV connectée rame ou se coupe",
     "sym": "Les vidéos se mettent en pause, se chargent sans fin ou affichent une mauvaise qualité.",
     "causes": ["Wi-Fi trop faible jusqu'à la TV", "Connexion Internet insuffisante", "Trop d'appareils qui regardent en même temps", "Appareil (TV, box TV) à redémarrer"],
     "check": ["Redémarrez la TV / le boîtier de streaming", "Rapprochez l'appareil de la box ou utilisez un câble", "Mettez en pause les autres téléchargements"],
     "call": "On optimise votre réseau pour que le streaming soit fluide dans toute la maison, sans coupure."},

    # ---------- SÉCURITÉ ----------
    {"slug": "pubs-partout-ordinateur", "cat": "securite",
     "q": "J'ai des publicités partout et une page d'accueil bizarre",
     "sym": "Des fenêtres de pub surgissent, votre moteur de recherche a changé : votre navigateur est « détourné ».",
     "causes": ["Logiciel publicitaire installé par mégarde", "Extension indésirable dans le navigateur", "Programme gratuit avec des modules cachés"],
     "check": ["Ne cliquez sur aucune de ces publicités", "Vérifiez et supprimez les extensions que vous ne connaissez pas", "Désinstallez les programmes récents suspects"],
     "call": "Un nettoyage sérieux supprime tout ça et sécurise votre ordinateur. On vérifie aussi qu'il n'y a rien de plus grave derrière."},
    {"slug": "faux-virus-arnaque-microsoft", "cat": "securite",
     "q": "Un message dit que mon PC est infecté et me demande d'appeler un numéro",
     "sym": "Une page plein écran affiche une alerte alarmante et un numéro à appeler « d'urgence ». C'est une arnaque très répandue.",
     "causes": ["Fausse alerte affichée par une page web piégée", "Publicité malveillante", "Aucune infection réelle, dans la plupart des cas"],
     "check": ["N'appelez JAMAIS le numéro affiché", "Ne donnez aucun accès ni information bancaire", "Fermez le navigateur (ou éteignez l'ordinateur)"],
     "call": "Si vous avez appelé ou donné un accès, faites vérifier l'ordinateur et vos comptes sans attendre. On sécurise tout et on vous explique les bons réflexes."},
    {"slug": "compte-facebook-email-pirate", "cat": "securite",
     "q": "Mon compte (email, Facebook…) a été piraté",
     "sym": "Vous ne pouvez plus vous connecter, ou vos contacts reçoivent des messages étranges en votre nom.",
     "causes": ["Mot de passe trop simple ou réutilisé", "Hameçonnage (vous avez cliqué sur un faux lien)", "Fuite de mot de passe sur un autre site"],
     "check": ["Changez le mot de passe depuis un appareil sûr", "Activez la double authentification", "Prévenez vos contacts de ne pas cliquer sur les messages suspects"],
     "call": "On vous aide à reprendre le contrôle de vos comptes, à les sécuriser et à éviter que ça recommence."},
    {"slug": "reconnaitre-arnaque-sms-colis", "cat": "securite",
     "q": "Comment reconnaître une arnaque par SMS ou email (colis, banque…) ?",
     "sym": "Un SMS « votre colis est bloqué » ou un email « votre compte va être suspendu » avec un lien : ce sont des pièges très courants.",
     "causes": ["Faux message imitant un livreur, une banque, un service public", "Lien qui mène à un faux site pour voler vos informations", "Urgence créée pour vous faire agir sans réfléchir"],
     "check": ["Ne cliquez jamais sur le lien du message", "Vérifiez en allant directement sur le site officiel (sans passer par le lien)", "Une administration ne demande pas vos données bancaires par SMS"],
     "call": "Dans le doute, envoyez-nous le message : on vous dit si c'est une arnaque et on vous aide si vous avez cliqué."},
    {"slug": "mot-de-passe-oublie-aide", "cat": "securite",
     "q": "J'ai oublié mes mots de passe et je m'y perds",
     "sym": "Vous ne retrouvez plus vos mots de passe, vous les notez sur des papiers partout, ou vous utilisez le même partout.",
     "causes": ["Trop de comptes différents", "Mots de passe notés de façon peu sûre", "Même mot de passe réutilisé (risqué)"],
     "check": ["Évitez d'utiliser le même mot de passe partout", "Préférez des phrases longues faciles à retenir", "Pensez à un gestionnaire de mots de passe"],
     "call": "On met en place une solution simple et sûre pour ne plus jamais galérer avec vos mots de passe — et on vous montre comment l'utiliser."},

    # ---------- PHOTOS & DONNÉES ----------
    {"slug": "recuperer-photos-supprimees", "cat": "donnees",
     "q": "J'ai supprimé des photos / fichiers importants, sont-ils récupérables ?",
     "sym": "Des souvenirs effacés par erreur ? Souvent, tout n'est pas perdu — mais il faut agir vite et bien.",
     "causes": ["Suppression et corbeille vidée", "Carte mémoire ou clé USB formatée", "Appareil ou support endommagé"],
     "check": ["Cessez d'utiliser l'appareil ou la carte concernée", "Regardez dans la corbeille et dans le cloud (Google Photos, iCloud…)", "N'installez pas de logiciel « miracle » qui pourrait tout écraser"],
     "call": "Plus vous agissez vite, plus les chances sont grandes. On tente la récupération avec les bons outils, sans aggraver la situation."},
    {"slug": "sauvegarder-ses-photos-souvenirs", "cat": "donnees",
     "q": "Comment sauvegarder mes photos et souvenirs pour ne jamais les perdre ?",
     "sym": "Vos photos ne sont que sur votre téléphone ou votre PC ? Une casse, un vol ou une panne, et tout disparaît. Voici comment dormir tranquille.",
     "causes": ["Photos stockées à un seul endroit", "Pas de sauvegarde automatique", "Téléphone/PC qui peut tomber en panne"],
     "check": ["Activez une sauvegarde automatique (cloud)", "Gardez aussi une copie sur un disque externe", "Ne comptez pas sur un seul support"],
     "call": "On met en place une sauvegarde automatique et simple pour vos photos et documents : vous n'y pensez plus, c'est protégé."},
    {"slug": "cle-usb-disque-non-reconnu-maison", "cat": "donnees",
     "q": "Ma clé USB ou mon disque externe n'est pas reconnu",
     "sym": "Vous branchez votre clé ou disque et rien n'apparaît, ou l'ordinateur propose de le « formater ».",
     "causes": ["Port USB défectueux", "Support endommagé", "Problème de reconnaissance par l'ordinateur"],
     "check": ["Testez un autre port USB et un autre ordinateur", "SURTOUT ne formatez pas si on vous le propose (vous perdriez tout)", "Écoutez si le disque fait un bruit anormal"],
     "call": "Si des données importantes sont dessus, ne tentez rien de risqué : on maximise les chances de tout récupérer."},

    # ---------- EMAIL & COMPTES ----------
    {"slug": "creer-adresse-mail-aide", "cat": "email",
     "q": "Comment créer une adresse email (et bien la gérer) ?",
     "sym": "Besoin d'une adresse email, ou envie d'y voir plus clair dans la vôtre ? On vous accompagne pas à pas.",
     "causes": ["Pas encore d'adresse email", "Boîte encombrée et mal organisée", "Difficulté à s'y retrouver"],
     "check": ["Choisissez un fournisseur fiable et gratuit", "Notez bien vos identifiants en lieu sûr", "Activez la double authentification pour la sécurité"],
     "call": "On vous crée une adresse, on vous montre comment l'utiliser sereinement, et on sécurise le tout. Idéal aussi pour les démarches en ligne."},
    {"slug": "boite-mail-pleine-de-spams", "cat": "email",
     "q": "Ma boîte mail est envahie de spams / courriers indésirables",
     "sym": "Vous recevez des dizaines de messages publicitaires ou suspects chaque jour.",
     "causes": ["Adresse utilisée sur de nombreux sites", "Inscriptions à des newsletters oubliées", "Adresse ayant fuité"],
     "check": ["Marquez les messages comme indésirables (le filtre apprend)", "Désinscrivez-vous des newsletters que vous ne lisez plus", "Ne répondez jamais à un spam"],
     "call": "On nettoie et on configure votre boîte pour réduire fortement les spams, et on vous montre les bons gestes."},

    # ---------- SMARTPHONE ----------
    {"slug": "smartphone-lent-ou-plein", "cat": "mobile",
     "q": "Mon téléphone est lent ou affiche « stockage plein »",
     "sym": "Votre smartphone rame, ne prend plus de photos ou refuse les mises à jour faute de place.",
     "causes": ["Mémoire saturée (photos, vidéos, applis)", "Trop d'applications en arrière-plan", "Cache et fichiers temporaires accumulés"],
     "check": ["Supprimez les applis que vous n'utilisez pas", "Transférez vos photos vers un cloud ou un ordinateur", "Redémarrez le téléphone"],
     "call": "On libère de l'espace, on sauvegarde vos photos et on accélère votre téléphone — sans rien perdre."},
    {"slug": "transferer-donnees-nouveau-telephone", "cat": "mobile",
     "q": "Comment transférer mes données vers un nouveau téléphone ?",
     "sym": "Nouveau téléphone, mais la peur de perdre contacts, photos, applis et messages ?",
     "causes": ["Changement de téléphone (même marque ou différente)", "Crainte de perdre des données", "Transfert qui semble compliqué"],
     "check": ["Sauvegardez d'abord l'ancien téléphone", "Notez vos identifiants de comptes (Google, Apple)", "Ne vous débarrassez pas de l'ancien avant d'avoir vérifié le transfert"],
     "call": "On transfère tout proprement vers votre nouveau téléphone (contacts, photos, applis, messages) et on vérifie que rien ne manque."},

    # ---------- IMPRIMANTE ----------
    {"slug": "imprimante-maison-nimprime-plus", "cat": "impression",
     "q": "Mon imprimante n'imprime plus",
     "sym": "Rien ne sort, ou l'imprimante apparaît « hors ligne » alors qu'elle est allumée.",
     "causes": ["Imprimante déconnectée du Wi-Fi", "Document bloqué dans la file d'attente", "Cartouche vide ou mal placée", "Pilote à réinstaller"],
     "check": ["Vérifiez l'encre, le papier et les voyants", "Éteignez puis rallumez l'imprimante", "Vérifiez qu'elle est bien connectée au Wi-Fi"],
     "call": "Les soucis d'imprimante se règlent presque toujours sans la changer. On la remet en marche, souvent à distance."},

    # ---------- CONSEIL / ACHAT ----------
    {"slug": "quel-ordinateur-acheter", "cat": "conseil",
     "q": "Quel ordinateur acheter (sans se faire avoir) ?",
     "sym": "Face aux dizaines de modèles et au jargon, difficile de savoir quoi choisir pour son budget et ses besoins.",
     "causes": ["Usage mal défini (bureautique, photos, jeux ?)", "Jargon technique difficile à décoder", "Risque de payer pour de l'inutile ou l'inverse"],
     "check": ["Définissez d'abord votre usage principal", "Privilégiez un disque SSD et assez de mémoire", "Méfiez-vous des offres « trop belles »"],
     "call": "On vous conseille le bon ordinateur pour votre budget et vos besoins, et on peut l'installer et transférer vos données pour vous."},
    {"slug": "aider-un-proche-age-a-distance", "cat": "conseil",
     "q": "Comment aider un proche âgé avec son informatique ?",
     "sym": "Un parent qui galère avec son ordinateur, sa tablette ou ses démarches en ligne, et vous n'êtes pas toujours là pour l'aider ?",
     "causes": ["Difficultés avec les outils numériques", "Peur des arnaques en ligne", "Besoin d'aide régulière et patiente"],
     "check": ["Simplifiez et sécurisez son appareil", "Mettez en place une aide à distance (avec son accord)", "Notez les démarches importantes"],
     "call": "On accompagne vos proches avec patience et pédagogie, à domicile ou à distance. L'abonnement sérénité est idéal pour une aide régulière."},
]


def by_category():
    out = {k: [] for k in CATEGORIES}
    for a in A:
        out[a["cat"]].append(a)
    return out


def get(slug):
    for a in A:
        if a["slug"] == slug:
            return a
    return None
