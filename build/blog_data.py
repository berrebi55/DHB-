# -*- coding: utf-8 -*-
"""Contenu éditorial du blog DHB — articles réels organisés en cocon sémantique.

Chaque article pointe vers sa page service « pilier » et vers 2-3 articles frères.
"""

# Libellés de thèmes (cocon)
THEMES = {
    "A": "Pannes & dépannage",
    "B": "Données & sauvegarde",
    "C": "Sécurité",
    "D": "Messagerie & outils",
    "E": "Comprendre le métier",
}

CTA_HTML = (
    '<div class="callout"><strong>Un problème informatique dans votre entreprise ?</strong> '
    'DHB intervient sur site en Île-de-France et à distance partout en France. '
    '<a href="../../contact/">Demandez un audit gratuit</a> — sans engagement, réponse sous 24h ouvrées.</div>'
)


def _p(*paras):
    return "".join(f"<p>{x}</p>" for x in paras)


ARTICLES = [
    # ================= THÈME A — PANNES & DÉPANNAGE =================
    {
        "slug": "ordinateur-professionnel-lent-causes-solutions",
        "theme": "A",
        "title": "Mon ordinateur professionnel est très lent : 7 causes et comment y remédier",
        "excerpt": "Un PC de bureau qui rame fait perdre des heures chaque semaine. Voici les 7 causes les plus fréquentes et ce que vous pouvez vérifier vous-même.",
        "desc": "Ordinateur de bureau trop lent ? Découvrez les 7 causes les plus fréquentes d'un PC professionnel qui rame et les solutions concrètes pour le rendre à nouveau rapide.",
        "service": "depannage-assistance-informatique",
        "related": ["plus-dacces-internet-bureau-que-verifier", "ecran-bleu-pc-qui-plante-que-faire", "combien-temps-perd-pme-problemes-informatiques"],
        "body": _p(
            "Un ordinateur professionnel lent n'est pas qu'un agacement : c'est du temps de travail perdu, de la concentration cassée et, au bout du compte, de l'argent. Quand un poste met deux minutes à ouvrir une session et dix secondes à réagir à chaque clic, le coût sur une année est considérable. La bonne nouvelle : dans la grande majorité des cas, la lenteur a une cause identifiable et réparable. Voici les sept plus courantes."
        ) + "<h2>1. Le disque dur est saturé ou trop vieux</h2>" + _p(
            "C'est la cause numéro un. Un disque rempli à plus de 85 % ralentit l'ensemble du système, car Windows a besoin d'espace libre pour travailler. Pire : si votre poste tourne encore sur un disque mécanique (HDD) et non sur un disque SSD, c'est souvent lui le vrai coupable. Remplacer un vieux disque mécanique par un SSD est l'intervention qui transforme le plus radicalement un ordinateur — un poste jugé « bon à jeter » retrouve souvent une seconde vie pour un coût modéré."
        ) + "<h2>2. Trop de programmes se lancent au démarrage</h2>" + _p(
            "Chaque logiciel installé veut démarrer avec Windows : messagerie, outils de visioconférence, utilitaires d'imprimante, mises à jour en arrière-plan… Résultat, l'ordinateur passe plusieurs minutes à tout charger avant d'être utilisable. Faire le tri dans les programmes au démarrage (via le Gestionnaire des tâches, onglet « Démarrage ») libère immédiatement des ressources."
        ) + "<h2>3. La mémoire vive (RAM) est insuffisante</h2>" + _p(
            "Les logiciels professionnels et les navigateurs avec trente onglets ouverts sont gourmands. Avec seulement 4 Go de RAM, un poste moderne étouffe en permanence. Passer à 8 ou 16 Go est souvent peu coûteux et très efficace, à condition que le matériel le permette — un point à vérifier avant d'acheter."
        ) + "<h2>4. Un virus ou un logiciel indésirable tourne en arrière-plan</h2>" + _p(
            "Certaines infections ne cassent rien de visible : elles consomment simplement les ressources de la machine pour miner de la cryptomonnaie, afficher de la publicité ou espionner. Une lenteur apparue soudainement, accompagnée de fenêtres surgissantes ou d'une page d'accueil de navigateur modifiée, doit alerter. Un nettoyage sérieux et un antivirus à jour s'imposent."
        ) + "<h2>5. Le système et les pilotes ne sont pas à jour</h2>" + _p(
            "À l'inverse de l'idée reçue, des mises à jour en retard ralentissent souvent la machine et créent des conflits. Un Windows à jour, des pilotes de carte graphique et de chipset récents, corrigent de nombreux problèmes de performance et de stabilité."
        ) + "<h2>6. Le disque est fragmenté ou le profil utilisateur est corrompu</h2>" + _p(
            "Sur les disques mécaniques, la fragmentation dégrade les performances avec le temps. Par ailleurs, un profil Windows corrompu provoque des lenteurs à l'ouverture de session difficiles à diagnostiquer pour un non-spécialiste. Ce sont des cas typiques où un regard professionnel fait gagner beaucoup de temps."
        ) + "<h2>7. Le matériel chauffe et se bride</h2>" + _p(
            "Un ordinateur empoussiéré, dont les ventilateurs sont encrassés, chauffe. Pour se protéger, le processeur réduit volontairement sa vitesse : c'est le <em>throttling</em>. Un nettoyage physique et le remplacement de la pâte thermique peuvent redonner de la vivacité à une machine qui ralentit après quelques minutes d'utilisation."
        ) + "<h2>Ce que vous pouvez faire tout de suite</h2>" + (
            "<ul>"
            "<li>Redémarrer complètement le poste (pas seulement le mettre en veille).</li>"
            "<li>Vérifier l'espace disque restant et supprimer les fichiers inutiles volumineux.</li>"
            "<li>Désactiver les programmes superflus au démarrage.</li>"
            "<li>Lancer une analyse antivirus complète.</li>"
            "<li>Installer les mises à jour Windows en attente.</li>"
            "</ul>"
        ) + _p(
            "Si la lenteur persiste, le problème est probablement matériel (disque, RAM, surchauffe) ou plus profond. Plutôt que de remplacer toute la machine, un diagnostic permet souvent de la relancer pour bien moins cher."
        ) + CTA_HTML,
    },
    {
        "slug": "plus-dacces-internet-bureau-que-verifier",
        "theme": "A",
        "title": "Plus d'accès à Internet au bureau : que vérifier avant d'appeler ?",
        "excerpt": "Internet coupé, tout le monde est bloqué. Avant de paniquer, voici la check-list simple à dérouler pour identifier — et parfois résoudre — la panne.",
        "desc": "Plus d'Internet au travail ? Suivez cette check-list claire pour vérifier box, Wi-Fi et réseau avant d'appeler un professionnel, et rétablir l'accès plus vite.",
        "service": "depannage-assistance-informatique",
        "related": ["ordinateur-professionnel-lent-causes-solutions", "wifi-entreprise-instable-lent-causes", "imprimante-reseau-ne-fonctionne-plus-solutions"],
        "body": _p(
            "Quand Internet tombe au bureau, c'est souvent toute l'activité qui s'arrête : plus de messagerie, plus d'accès aux outils en ligne, plus de paiement. Avant d'appeler qui que ce soit, quelques vérifications simples permettent de localiser la panne et, dans un cas sur deux, de la régler sans intervention."
        ) + "<h2>Première question : est-ce tout le monde ou un seul poste ?</h2>" + _p(
            "C'est le réflexe à avoir. Si un seul ordinateur n'a plus Internet alors que les autres fonctionnent, le problème vient de ce poste (sa carte réseau, son Wi-Fi, son câble). Si <strong>tout le monde</strong> est coupé, le problème est en amont : box, routeur, ou la connexion de votre opérateur."
        ) + "<h2>Vérifier la box / le routeur</h2>" + (
            "<ul>"
            "<li><strong>Regardez les voyants.</strong> Un voyant Internet rouge, éteint ou clignotant anormalement indique souvent une coupure opérateur. Chaque fabricant a son code couleur : une photo des voyants aide beaucoup le technicien.</li>"
            "<li><strong>Redémarrez proprement.</strong> Débranchez la box électriquement, attendez 30 secondes, rebranchez et patientez 3 à 5 minutes le temps qu'elle se reconnecte. C'est la manipulation qui résout le plus de pannes.</li>"
            "<li><strong>Vérifiez les câbles.</strong> Un câble réseau ou la fibre débranché par un coup de pied sous un bureau est une cause bien plus fréquente qu'on ne le croit.</li>"
            "</ul>"
        ) + "<h2>Vérifier côté opérateur</h2>" + _p(
            "Beaucoup d'opérateurs proposent une page ou une application indiquant les incidents en cours dans votre secteur. Si une panne générale est signalée dans votre zone, inutile de chercher plus loin : il faut attendre le rétablissement. Notez l'heure de début de la coupure, cela sera utile en cas de réclamation."
        ) + "<h2>Si c'est un seul poste</h2>" + (
            "<ul>"
            "<li>Vérifiez l'icône réseau en bas à droite de l'écran : êtes-vous bien connecté au bon Wi-Fi, ou le câble est-il bien branché ?</li>"
            "<li>Désactivez puis réactivez le Wi-Fi, ou débranchez/rebranchez le câble réseau.</li>"
            "<li>Redémarrez l'ordinateur : cela relance la connexion réseau proprement.</li>"
            "<li>Testez un autre site : parfois ce n'est pas Internet qui est coupé, mais un seul service en ligne.</li>"
            "</ul>"
        ) + '<blockquote>Astuce : gardez à portée de main le modèle de votre box et le numéro de ligne de votre contrat. En cas d\'appel au support, vous gagnez de précieuses minutes.</blockquote>' + "<h2>Quand appeler un professionnel</h2>" + _p(
            "Si après un redémarrage de la box et la vérification des câbles l'accès ne revient pas, ou si la coupure se répète plusieurs fois par semaine, le problème est plus profond : configuration réseau, routeur défaillant, saturation, ou matériel professionnel mal paramétré. Une entreprise qui dépend d'Internet pour travailler a tout intérêt à faire fiabiliser son réseau une bonne fois, plutôt que de subir des coupures à répétition."
        ) + CTA_HTML,
    },
    {
        "slug": "ecran-bleu-pc-qui-plante-que-faire",
        "theme": "A",
        "title": "Écran bleu / PC qui plante : que faire et quand appeler un professionnel",
        "excerpt": "L'écran bleu de la mort n'est pas une fatalité. Comprendre ce qu'il signifie vous évite de perdre vos données — et parfois votre machine.",
        "desc": "Écran bleu Windows ou PC qui plante sans arrêt ? Comprenez les causes (matériel, pilotes, mémoire) et les bons réflexes pour sauver vos données.",
        "service": "depannage-assistance-informatique",
        "related": ["ordinateur-professionnel-lent-causes-solutions", "jai-supprime-fichier-important-recuperable", "plus-dacces-internet-bureau-que-verifier"],
        "body": _p(
            "L'« écran bleu de la mort » (BSOD) a de quoi inquiéter : l'ordinateur s'arrête brutalement, affiche un message cryptique et redémarre. S'il arrive une fois tous les six mois, ce n'est généralement pas grave. S'il revient régulièrement, c'est le signe d'un problème sérieux qu'il ne faut pas ignorer, surtout sur un poste de travail contenant des documents importants."
        ) + "<h2>Que signifie vraiment un écran bleu ?</h2>" + _p(
            "C'est un mécanisme de sécurité de Windows. Face à une erreur qu'il ne sait pas gérer sans risque pour vos données, le système préfère tout arrêter net plutôt que de continuer et de corrompre des fichiers. Le code affiché (par exemple <em>MEMORY_MANAGEMENT</em> ou <em>CRITICAL_PROCESS_DIED</em>) oriente vers la cause."
        ) + "<h2>Les causes les plus fréquentes</h2>" + (
            "<ul>"
            "<li><strong>La mémoire vive (RAM) défaillante</strong> : une barrette abîmée provoque des plantages aléatoires. Un test mémoire le confirme.</li>"
            "<li><strong>Un pilote défectueux ou mal mis à jour</strong> : souvent après l'ajout d'un nouveau périphérique (imprimante, écran, carte).</li>"
            "<li><strong>Le disque de stockage en fin de vie</strong> : des secteurs défectueux provoquent plantages et lenteurs. C'est le cas le plus dangereux pour vos données.</li>"
            "<li><strong>La surchauffe</strong> : un ordinateur encrassé qui chauffe peut se couper pour se protéger.</li>"
            "<li><strong>Un conflit logiciel ou une infection</strong> : plus rare, mais possible.</li>"
            "</ul>"
        ) + "<h2>Les bons réflexes immédiats</h2>" + (
            "<ol>"
            "<li><strong>Notez le code d'erreur</strong> affiché sur l'écran bleu. C'est l'indice le plus précieux pour le diagnostic.</li>"
            "<li><strong>Sauvegardez vos données dès que possible.</strong> Si le disque est en cause, chaque démarrage peut être le dernier. Copiez vos documents importants sur une clé ou un disque externe, ou vers votre cloud professionnel.</li>"
            "<li><strong>Repensez aux changements récents</strong> : nouveau logiciel, nouveau matériel, mise à jour ? Le plantage apparaît souvent juste après.</li>"
            "<li><strong>Évitez de forcer l'utilisation</strong> d'une machine qui plante en boucle : vous risquez d'aggraver la corruption des données.</li>"
            "</ol>"
        ) + '<div class="callout"><strong>Le réflexe qui sauve :</strong> un écran bleu récurrent est souvent le premier signe d\'un disque qui lâche. Si vous n\'avez pas de sauvegarde automatique, c\'est le moment d\'en mettre une en place — avant la panne définitive.</div>' + "<h2>Quand appeler un professionnel</h2>" + _p(
            "Si l'écran bleu revient plusieurs fois par jour ou par semaine, si l'ordinateur ne démarre plus du tout, ou si vous entendez des bruits inhabituels (cliquetis du disque), n'attendez pas. Un diagnostic rapide permet de distinguer un problème logiciel (réparable) d'un disque mourant (où la priorité absolue est de récupérer les données avant qu'il ne soit trop tard). Sur un poste professionnel, chaque heure compte : mieux vaut un diagnostic préventif qu'une perte de données définitive."
        ) + CTA_HTML,
    },
    {
        "slug": "imprimante-reseau-ne-fonctionne-plus-solutions",
        "theme": "A",
        "title": "Mon imprimante réseau ne fonctionne plus : les solutions",
        "excerpt": "Imprimante « hors ligne », documents bloqués dans la file, impossible d'imprimer à plusieurs : les causes sont souvent simples. Voici comment les régler.",
        "desc": "Imprimante réseau en panne ou « hors ligne » ? Découvrez les causes fréquentes et les solutions pour réimprimer rapidement en entreprise.",
        "service": "depannage-assistance-informatique",
        "related": ["wifi-entreprise-instable-lent-causes", "plus-dacces-internet-bureau-que-verifier", "ordinateur-professionnel-lent-causes-solutions"],
        "body": _p(
            "L'imprimante est l'un des périphériques les plus capricieux en entreprise. Partagée entre plusieurs postes, connectée au réseau, elle cumule les sources de panne. Bonne nouvelle : la plupart se résolvent sans remplacer le matériel."
        ) + "<h2>« Imprimante hors ligne » : la panne la plus courante</h2>" + _p(
            "Ce message signifie que l'ordinateur ne parvient plus à joindre l'imprimante sur le réseau. Les causes typiques : l'imprimante a changé d'adresse réseau (adresse IP attribuée automatiquement et modifiée après un redémarrage), elle est éteinte ou en veille profonde, ou le Wi-Fi est instable. Attribuer une adresse IP <strong>fixe</strong> à l'imprimante règle durablement ce problème — c'est l'un des premiers réglages qu'un professionnel met en place."
        ) + "<h2>Les vérifications de base</h2>" + (
            "<ul>"
            "<li><strong>L'imprimante est-elle allumée et sans erreur ?</strong> Un voyant orange, un bourrage papier ou un capot mal fermé bloquent tout.</li>"
            "<li><strong>Y a-t-il du papier et de l'encre / du toner ?</strong> Évident, mais souvent la vraie cause.</li>"
            "<li><strong>Est-elle bien connectée au réseau ?</strong> Un câble réseau débranché ou un Wi-Fi perdu la rendent invisible.</li>"
            "<li><strong>Redémarrez l'imprimante</strong> électriquement, comme une box. Beaucoup de blocages disparaissent ainsi.</li>"
            "</ul>"
        ) + "<h2>Les documents restent bloqués dans la file d'attente</h2>" + _p(
            "Quand un document « coince », il bloque tous les suivants. Vider la file d'attente d'impression (dans les paramètres d'imprimante de Windows) puis relancer le service d'impression débloque la situation. Si cela revient souvent, le pilote d'impression est probablement en cause et doit être réinstallé proprement."
        ) + "<h2>Un seul poste n'imprime plus, les autres si</h2>" + _p(
            "Le problème est alors local à cet ordinateur : mauvais pilote, imprimante par défaut mal réglée, ou droit d'accès perdu. Réinstaller l'imprimante sur ce poste résout généralement le souci."
        ) + "<h2>Personne n'imprime plus</h2>" + _p(
            "Là, le problème est central : l'imprimante elle-même, le réseau, ou le serveur d'impression si vous en avez un. C'est le cas où un diagnostic réseau s'impose, car il peut cacher un souci plus large (Wi-Fi instable, adressage réseau mal géré)."
        ) + '<blockquote>Dans une entreprise, une imprimante bien configurée est une imprimante qu\'on oublie. Si la vôtre tombe « hors ligne » chaque semaine, ce n\'est pas normal : c\'est un réglage réseau à corriger une fois pour toutes.</blockquote>' + "<h2>Faut-il changer d'imprimante ?</h2>" + _p(
            "Rarement. Avant d'investir dans du nouveau matériel, un professionnel vérifie la configuration réseau, met à jour les pilotes et sécurise l'adressage. Dans la plupart des cas, l'imprimante existante redevient fiable. Le remplacement ne se justifie que si le matériel est réellement en fin de vie ou inadapté à votre volume d'impression."
        ) + CTA_HTML,
    },
    {
        "slug": "wifi-entreprise-instable-lent-causes",
        "theme": "A",
        "title": "Wifi d'entreprise instable ou lent : les causes fréquentes",
        "excerpt": "Connexion qui saute, zones sans réseau, visios qui coupent : un Wi-Fi d'entreprise mal pensé coûte cher en productivité. Voici pourquoi, et comment y remédier.",
        "desc": "Wi-Fi d'entreprise lent ou instable ? Comprenez les causes (saturation, box unique, interférences) et les solutions pour un réseau fiable au bureau.",
        "service": "maintenance-parc-informatique",
        "related": ["plus-dacces-internet-bureau-que-verifier", "imprimante-reseau-ne-fonctionne-plus-solutions", "ordinateur-professionnel-lent-causes-solutions"],
        "body": _p(
            "Le Wi-Fi est devenu vital au bureau, mais il est aussi la source de frustration numéro un : connexion qui saute en réunion, visio qui se fige, zones entières où « ça ne capte pas ». Dans la plupart des entreprises, le problème ne vient pas de l'abonnement Internet, mais de la façon dont le Wi-Fi est déployé."
        ) + "<h2>Cause n°1 : une seule box pour tout le monde</h2>" + _p(
            "La box fournie par l'opérateur est conçue pour un foyer, pas pour un bureau avec cloisons, dix ou vingt appareils connectés et des murs épais. Elle couvre mal les locaux et sature vite. Dans une entreprise, la solution professionnelle consiste à installer plusieurs <strong>bornes Wi-Fi</strong> réparties, pilotées de façon cohérente, pour une couverture homogène et une bascule automatique d'un point à l'autre."
        ) + "<h2>Cause n°2 : la saturation des canaux</h2>" + _p(
            "En ville, et surtout dans un immeuble de bureaux, des dizaines de réseaux Wi-Fi voisins se disputent les mêmes fréquences. Résultat : des interférences et des ralentissements. Un professionnel analyse l'environnement radio et choisit les canaux les moins encombrés, ou privilégie la bande 5 GHz, moins saturée et plus rapide."
        ) + "<h2>Cause n°3 : trop d'appareils, pas assez de débit</h2>" + _p(
            "Ordinateurs, téléphones, imprimantes, caméras, objets connectés : le nombre d'appareils explose. Si votre point d'accès est ancien, il ne suit plus. Du matériel Wi-Fi récent gère beaucoup mieux la densité d'appareils."
        ) + "<h2>Cause n°4 : les interférences physiques</h2>" + (
            "<ul>"
            "<li>Murs porteurs, cloisons métalliques, dalles béton : autant d'obstacles au signal.</li>"
            "<li>Micro-ondes, téléphones sans fil, certaines caméras : sources d'interférences sur la bande 2,4 GHz.</li>"
            "<li>Une borne mal placée (dans un placard, au sol, derrière un meuble) perd une grande partie de sa portée.</li>"
            "</ul>"
        ) + "<h2>Cause n°5 : aucun réseau séparé pour les invités</h2>" + _p(
            "Faire passer les clients, visiteurs et appareils personnels sur le même réseau que vos postes de travail, c'est à la fois un problème de performance (ils consomment de la bande passante) et de sécurité. Un réseau invité séparé règle les deux."
        ) + '<div class="callout"><strong>Le bon réflexe :</strong> si votre Wi-Fi vous pose problème depuis des mois, inutile de racheter box sur box. Un audit réseau d\'une demi-journée identifie précisément les points noirs et le matériel adapté à vos locaux.</div>' + "<h2>Vers un Wi-Fi vraiment professionnel</h2>" + _p(
            "Un bon réseau d'entreprise repose sur trois piliers : une couverture pensée pour vos locaux (pas improvisée), un matériel adapté au nombre d'utilisateurs, et une séparation entre réseau de travail et réseau invité. Une fois ce socle posé, le Wi-Fi devient ce qu'il devrait toujours être : invisible, parce qu'il fonctionne. C'est exactement le type de fiabilité qu'apporte une maintenance régulière du parc informatique."
        ) + CTA_HTML,
    },

    # ================= THÈME B — DONNÉES & SAUVEGARDE =================
    {
        "slug": "comment-sauvegarder-donnees-entreprise",
        "theme": "B",
        "title": "Comment sauvegarder les données de son entreprise (et dormir tranquille)",
        "excerpt": "Perdre ses données, c'est parfois perdre son entreprise. Voici la méthode simple et éprouvée pour une sauvegarde qui vous protège vraiment.",
        "desc": "Comment sauvegarder les données de son entreprise efficacement ? La règle 3-2-1, les erreurs à éviter et les bonnes pratiques pour une sauvegarde fiable.",
        "service": "sauvegarde-restauration",
        "related": ["jai-supprime-fichier-important-recuperable", "sauvegarde-locale-externe-cloud-choisir-pme", "ransomware-proteger-entreprise"],
        "body": _p(
            "Demandez à n'importe quel dirigeant ce qu'il perdrait si tous les fichiers de son entreprise disparaissaient demain matin : devis, factures, comptabilité, dossiers clients, contrats, photos de chantier… La réponse fait froid dans le dos. Pourtant, beaucoup d'entreprises n'ont aucune sauvegarde digne de ce nom. Voici comment s'en sortir simplement."
        ) + "<h2>La règle d'or : 3-2-1</h2>" + _p(
            "C'est la règle que suivent les professionnels, et elle est facile à retenir :"
        ) + (
            "<ul>"
            "<li><strong>3 copies</strong> de vos données : l'original plus deux sauvegardes.</li>"
            "<li><strong>2 supports différents</strong> : par exemple un disque externe et un cloud. On ne met pas tous ses œufs dans le même panier.</li>"
            "<li><strong>1 copie hors site</strong> : à l'extérieur de vos locaux. En cas d'incendie, de dégât des eaux ou de vol, la sauvegarde restée sur place disparaît avec le reste.</li>"
            "</ul>"
        ) + "<h2>Les erreurs les plus fréquentes</h2>" + (
            "<ul>"
            "<li><strong>Croire que « c'est dans le cloud, donc c'est sauvegardé ».</strong> Un fichier dans un cloud synchronisé est <em>répliqué</em>, pas sauvegardé : si vous le supprimez ou qu'un ransomware le chiffre, la version corrompue se synchronise partout.</li>"
            "<li><strong>Une sauvegarde qui n'est jamais testée.</strong> Une sauvegarde qu'on ne restaure jamais est une sauvegarde dont on ignore si elle fonctionne. Beaucoup d'entreprises découvrent le jour J que leur sauvegarde était vide ou illisible.</li>"
            "<li><strong>Le disque externe branché en permanence.</strong> S'il reste connecté, un ransomware le chiffre lui aussi. Une bonne sauvegarde est au moins partiellement déconnectée ou isolée.</li>"
            "<li><strong>Sauvegarder les fichiers, mais pas les logiciels critiques.</strong> La base de votre logiciel de gestion ou de comptabilité mérite une sauvegarde dédiée.</li>"
            "</ul>"
        ) + "<h2>Automatiser, toujours</h2>" + _p(
            "Une sauvegarde manuelle est une sauvegarde qu'on oublie dès qu'on est débordé — c'est-à-dire tout le temps. La seule sauvegarde fiable est <strong>automatique</strong> : elle se déclenche seule, chaque nuit, sans que personne n'ait à y penser. Et elle envoie une alerte si elle échoue."
        ) + '<blockquote>Une sauvegarde qui ne se restaure pas n\'est pas une sauvegarde. Le vrai test, c\'est le jour où vous devez tout récupérer.</blockquote>' + "<h2>La restauration : le vrai objectif</h2>" + _p(
            "On parle beaucoup de « sauvegarde », mais ce qui compte vraiment, c'est la <strong>restauration</strong> : combien de temps pour tout remettre en route après un incident ? Un jour ? Une heure ? Cette question doit être posée dès le départ, car elle détermine le type de solution à mettre en place."
        ) + "<h2>Par où commencer concrètement</h2>" + _p(
            "Faites d'abord l'inventaire de vos données vitales : où sont-elles, qui y accède, quelle quantité ? Choisissez ensuite une solution combinant une copie locale rapide et une copie cloud hors site, le tout automatisé et supervisé. Enfin, planifiez un test de restauration régulier. C'est précisément le travail que nous mettons en place chez DHB : une sauvegarde qui tourne seule, qu'on surveille, et qu'on teste pour vous."
        ) + CTA_HTML,
    },
    {
        "slug": "jai-supprime-fichier-important-recuperable",
        "theme": "B",
        "title": "J'ai supprimé un fichier important : est-il récupérable ?",
        "excerpt": "Un dossier effacé par erreur, une corbeille vidée trop vite : dans bien des cas, tout n'est pas perdu. Mais chaque minute compte.",
        "desc": "Fichier important supprimé par erreur ? Découvrez dans quels cas il est récupérable, les gestes qui sauvent et les erreurs qui rendent la récupération impossible.",
        "service": "sauvegarde-restauration",
        "related": ["comment-sauvegarder-donnees-entreprise", "sauvegarde-locale-externe-cloud-choisir-pme", "ecran-bleu-pc-qui-plante-que-faire"],
        "body": _p(
            "Ça arrive à tout le monde : on supprime un fichier, on vide la corbeille, et on réalise une heure plus tard qu'il était essentiel. Ou pire, un dossier entier a disparu. La première chose à savoir : dans de nombreux cas, le fichier n'est pas vraiment effacé — mais il faut agir vite et bien."
        ) + "<h2>Pourquoi un fichier supprimé n'est (souvent) pas perdu</h2>" + _p(
            "Quand vous supprimez un fichier et videz la corbeille, l'ordinateur ne l'efface pas physiquement : il marque simplement l'espace qu'il occupait comme « réutilisable ». Tant que cet espace n'a pas été réécrit par de nouvelles données, le fichier est encore là, invisible mais récupérable avec les bons outils."
        ) + "<h2>Le geste qui sauve : arrêter d'utiliser le disque</h2>" + _p(
            "C'est le point le plus important. Chaque nouvelle donnée écrite sur le disque risque d'écraser définitivement votre fichier. Donc : <strong>cessez immédiatement d'utiliser l'ordinateur concerné</strong>. N'installez rien, ne téléchargez rien, ne travaillez plus sur ce poste. Plus vous attendez et plus vous l'utilisez, plus les chances diminuent."
        ) + "<h2>Les premières choses à vérifier</h2>" + (
            "<ul>"
            "<li><strong>La corbeille</strong>, si elle n'a pas été vidée : le fichier y est peut-être encore.</li>"
            "<li><strong>L'historique des versions</strong> de votre cloud professionnel (Microsoft 365, Google Workspace) : ils conservent souvent les versions précédentes et les fichiers supprimés pendant plusieurs jours.</li>"
            "<li><strong>Votre sauvegarde</strong>, si vous en avez une : c'est évidemment la voie la plus simple et la plus sûre.</li>"
            "<li><strong>Les versions antérieures</strong> de Windows, si la fonction était activée.</li>"
            "</ul>"
        ) + '<div class="callout"><strong>Attention :</strong> les logiciels de récupération « gratuits » téléchargés dans la panique peuvent écraser justement les données que vous cherchez à sauver. Sur un fichier vraiment critique, mieux vaut ne rien installer et faire appel à un professionnel.</div>' + "<h2>Les cas plus difficiles</h2>" + _p(
            "Si le fichier a été supprimé il y a longtemps, si le disque a beaucoup servi depuis, ou si le support est physiquement endommagé (disque qui fait du bruit, clé USB qui ne monte plus), la récupération devient plus complexe. Elle reste souvent possible, mais nécessite des outils et un savoir-faire spécifiques. Sur un disque SSD, certaines technologies (le <em>TRIM</em>) effacent définitivement les données plus vite : raison de plus pour agir sans attendre."
        ) + "<h2>La vraie leçon : la sauvegarde</h2>" + _p(
            "La récupération de données est toujours un pari : parfois ça marche, parfois non, et cela peut coûter cher. La seule façon d'être serein, c'est d'avoir une sauvegarde automatique en place <em>avant</em> l'incident. Avec une bonne sauvegarde, un fichier supprimé se restaure en quelques minutes, sans stress ni suspense. C'est exactement ce que nous mettons en place pour éviter que la question « est-ce récupérable ? » ne se pose jamais."
        ) + CTA_HTML,
    },
    {
        "slug": "ransomware-proteger-entreprise",
        "theme": "B",
        "title": "Qu'est-ce qu'un ransomware et comment protéger son entreprise",
        "excerpt": "Le ransomware chiffre toutes vos données et réclame une rançon. C'est la cyberattaque la plus redoutée des PME. Voici comment vous en prémunir.",
        "desc": "Ransomware : comprendre cette attaque qui chiffre vos données et réclame une rançon, et surtout comment protéger concrètement votre entreprise.",
        "service": "cybersecurite",
        "related": ["comment-sauvegarder-donnees-entreprise", "reconnaitre-email-phishing-former-equipes", "10-erreurs-securite-informatique-pme"],
        "body": _p(
            "Le ransomware (ou « rançongiciel ») est le cauchemar des entreprises. Un matin, plus rien ne fonctionne : tous les fichiers sont chiffrés, illisibles, et un message réclame une rançon pour les débloquer. Les PME sont des cibles de choix, car elles sont souvent moins protégées que les grands groupes. Comprendre cette menace est la première étape pour s'en protéger."
        ) + "<h2>Comment ça fonctionne</h2>" + _p(
            "Un ransomware est un logiciel malveillant qui, une fois entré dans votre système, chiffre vos fichiers avec une clé que seuls les attaquants possèdent. Vos documents, bases de données et parfois vos sauvegardes deviennent inutilisables. Les criminels promettent la clé de déchiffrement contre un paiement, généralement en cryptomonnaie — mais payer ne garantit <strong>jamais</strong> de récupérer ses données, et finance le crime."
        ) + "<h2>Comment ça entre dans votre entreprise</h2>" + (
            "<ul>"
            "<li><strong>Un email piégé</strong> : une pièce jointe ouverte ou un lien cliqué. C'est le vecteur le plus courant.</li>"
            "<li><strong>Un accès à distance mal sécurisé</strong> : un bureau à distance exposé sur Internet avec un mot de passe faible.</li>"
            "<li><strong>Un logiciel non mis à jour</strong> comportant une faille connue.</li>"
            "<li><strong>Une clé USB infectée</strong> ou un site web compromis.</li>"
            "</ul>"
        ) + "<h2>Les protections qui marchent vraiment</h2>" + _p(
            "Aucune protection n'est infaillible, mais une combinaison de mesures réduit énormément le risque et, surtout, limite les dégâts si une attaque passe :"
        ) + (
            "<ol>"
            "<li><strong>Des sauvegardes isolées.</strong> C'est la protection ultime. Une sauvegarde déconnectée ou immuable, que le ransomware ne peut pas atteindre, vous permet de tout restaurer sans payer.</li>"
            "<li><strong>Des mises à jour régulières</strong> de Windows, des logiciels et des équipements réseau, pour fermer les failles connues.</li>"
            "<li><strong>Un antivirus moderne</strong> capable de détecter les comportements suspects, pas seulement les virus connus.</li>"
            "<li><strong>Des accès à distance sécurisés</strong> (VPN, double authentification), jamais exposés directement.</li>"
            "<li><strong>La sensibilisation des équipes</strong> : apprendre à repérer un email de phishing évite la majorité des infections.</li>"
            "<li><strong>Le principe du moindre privilège</strong> : chacun n'a accès qu'à ce dont il a besoin, pour limiter la propagation.</li>"
            "</ol>"
        ) + '<blockquote>Face à un ransomware, la vraie question n\'est pas « comment l\'empêcher à 100 % » — c\'est impossible — mais « combien de temps pour tout restaurer sans payer ». Une bonne sauvegarde transforme une catastrophe en simple incident.</blockquote>' + "<h2>Que faire en cas d'attaque</h2>" + _p(
            "Si l'attaque a lieu : isolez immédiatement les machines touchées du réseau (débranchez le câble, coupez le Wi-Fi) pour stopper la propagation, ne payez pas, ne redémarrez pas à l'aveugle, et faites appel à un professionnel. En France, il est recommandé de déposer plainte et de signaler l'incident. Votre sauvegarde sera alors votre meilleure alliée pour repartir."
        ) + "<h2>La prévention coûte toujours moins cher</h2>" + _p(
            "Une attaque par ransomware peut paralyser une entreprise pendant des jours ou des semaines, avec un coût sans commune mesure avec celui de la prévention. Mettre en place une stratégie de sauvegarde isolée et une protection adaptée est un investissement modeste au regard du risque. C'est le cœur de notre approche en cybersécurité et en sauvegarde."
        ) + CTA_HTML,
    },
    {
        "slug": "sauvegarde-locale-externe-cloud-choisir-pme",
        "theme": "B",
        "title": "Sauvegarde locale, externe ou cloud : laquelle choisir pour une PME ?",
        "excerpt": "Disque externe, NAS, cloud… Chaque solution a ses avantages et ses pièges. On vous aide à choisir celle qui protège vraiment votre entreprise.",
        "desc": "Sauvegarde locale, externe ou cloud : comparatif clair pour choisir la solution de sauvegarde adaptée à votre PME, avec leurs avantages et limites.",
        "service": "sauvegarde-restauration",
        "related": ["comment-sauvegarder-donnees-entreprise", "ransomware-proteger-entreprise", "jai-supprime-fichier-important-recuperable"],
        "body": _p(
            "« Il nous faut une sauvegarde, mais laquelle ? » C'est une question légitime, car les options sont nombreuses et chacune a ses forces et ses faiblesses. La bonne réponse n'est presque jamais « une seule solution », mais une combinaison intelligente. Décryptage."
        ) + "<h2>La sauvegarde locale (disque externe, NAS)</h2>" + _p(
            "Il s'agit de copier vos données sur un support situé dans vos locaux : disque dur externe, ou NAS (un petit boîtier de stockage réseau partagé)."
        ) + (
            "<ul>"
            "<li><strong>Avantages :</strong> rapide à sauvegarder et surtout à restaurer, pas d'abonnement, vos données restent chez vous.</li>"
            "<li><strong>Limites :</strong> en cas d'incendie, de dégât des eaux, de vol ou de ransomware, la sauvegarde disparaît avec l'original si elle est connectée en permanence. Un disque externe peut aussi tomber en panne.</li>"
            "</ul>"
        ) + "<h2>La sauvegarde externalisée / hors site</h2>" + _p(
            "Ici, une copie est stockée physiquement ailleurs : un disque emporté à l'extérieur en rotation, ou un second NAS dans un autre lieu. C'est la fameuse « copie hors site » de la règle 3-2-1."
        ) + (
            "<ul>"
            "<li><strong>Avantages :</strong> vous protège des sinistres locaux (incendie, vol, inondation).</li>"
            "<li><strong>Limites :</strong> demande de la rigueur (rotation des disques), et une manipulation humaine qui peut être oubliée.</li>"
            "</ul>"
        ) + "<h2>La sauvegarde cloud</h2>" + _p(
            "Vos données sont copiées automatiquement vers un centre de données distant, via Internet. À ne pas confondre avec la simple synchronisation (type OneDrive ou Google Drive), qui réplique les fichiers mais ne constitue pas une vraie sauvegarde versionnée."
        ) + (
            "<ul>"
            "<li><strong>Avantages :</strong> automatique, hors site par nature, accessible de partout, résistant aux sinistres locaux. Les bonnes solutions conservent plusieurs versions et résistent au ransomware.</li>"
            "<li><strong>Limites :</strong> dépend de votre débit Internet (la première sauvegarde et les grosses restaurations peuvent être longues), abonnement mensuel, et il faut vérifier où sont hébergées les données (idéalement en Europe, pour le RGPD).</li>"
            "</ul>"
        ) + '<div class="callout"><strong>La bonne approche pour une PME :</strong> combiner une sauvegarde locale (rapide pour restaurer au quotidien) <em>et</em> une sauvegarde cloud (hors site, automatique, résistante aux sinistres). C\'est exactement la logique de la règle 3-2-1.</div>' + "<h2>Les critères qui comptent vraiment</h2>" + (
            "<ul>"
            "<li><strong>Automatisation :</strong> une sauvegarde manuelle sera oubliée. Exigez l'automatique.</li>"
            "<li><strong>Versioning :</strong> pouvoir revenir à une version d'il y a une semaine, pas seulement à hier.</li>"
            "<li><strong>Supervision :</strong> être alerté si une sauvegarde échoue.</li>"
            "<li><strong>Test de restauration :</strong> la seule preuve que ça marche.</li>"
            "<li><strong>Localisation des données :</strong> hébergement en Europe pour la conformité RGPD.</li>"
            "</ul>"
        ) + "<h2>Notre recommandation</h2>" + _p(
            "Pour la plupart des PME, indépendants et cabinets, le meilleur rapport sécurité/simplicité est une solution hybride : une copie locale pour la rapidité, une copie cloud chiffrée et hébergée en Europe pour la résilience, le tout automatisé et supervisé. Nous dimensionnons cette solution selon votre volume de données et votre tolérance à l'arrêt, puis nous la testons régulièrement pour vous."
        ) + CTA_HTML,
    },

    # ================= THÈME C — SÉCURITÉ =================
    {
        "slug": "10-erreurs-securite-informatique-pme",
        "theme": "C",
        "title": "Les 10 erreurs de sécurité informatique les plus fréquentes en PME",
        "excerpt": "La plupart des incidents de sécurité en PME ne viennent pas de pirates surdoués, mais d'erreurs simples et évitables. Voici les dix plus courantes.",
        "desc": "Les 10 erreurs de sécurité informatique les plus fréquentes en PME et comment les corriger : mots de passe, mises à jour, sauvegardes, accès…",
        "service": "cybersecurite",
        "related": ["mots-de-passe-entreprise-bonnes-pratiques", "reconnaitre-email-phishing-former-equipes", "ransomware-proteger-entreprise"],
        "body": _p(
            "On imagine souvent les cyberattaques comme l'œuvre de génies de l'informatique. La réalité est plus banale : la majorité des incidents en PME exploitent des erreurs simples, connues, et faciles à corriger. Voici les dix plus répandues — et la bonne nouvelle, c'est qu'elles se règlent sans gros budget."
        ) + (
            "<h2>1. Des mots de passe faibles ou réutilisés</h2>"
            "<p>Le même mot de passe partout, ou des « 123456 » et « azerty » : c'est la porte d'entrée préférée des attaquants. Un seul mot de passe compromis et c'est toute l'entreprise qui est exposée.</p>"
            "<h2>2. L'absence de double authentification</h2>"
            "<p>Même avec un bon mot de passe, un compte sans double authentification (un code reçu sur le téléphone, par exemple) reste vulnérable. L'activer sur la messagerie et les outils critiques bloque l'immense majorité des piratages de compte.</p>"
            "<h2>3. Des logiciels et systèmes jamais mis à jour</h2>"
            "<p>Chaque mise à jour corrige des failles de sécurité. Repousser indéfiniment les mises à jour, c'est laisser des portes ouvertes que les attaquants connaissent parfaitement.</p>"
            "<h2>4. Aucune sauvegarde fiable</h2>"
            "<p>Ou une sauvegarde jamais testée. Sans sauvegarde isolée, une seule attaque par ransomware peut tout emporter.</p>"
            "<h2>5. Tout le monde est administrateur</h2>"
            "<p>Quand chaque utilisateur peut tout installer et tout modifier, la moindre infection se propage sans limite. Le principe du moindre privilège limite considérablement les dégâts.</p>"
            "<h2>6. Pas d'antivirus moderne (ou un antivirus expiré)</h2>"
            "<p>L'antivirus gratuit installé il y a trois ans et jamais renouvelé ne protège plus. Une protection moderne détecte les comportements suspects, pas seulement les menaces déjà connues.</p>"
            "<h2>7. Des accès à distance mal sécurisés</h2>"
            "<p>Un bureau à distance exposé directement sur Internet est scanné et attaqué en permanence. Il doit passer par un accès sécurisé (VPN, double authentification).</p>"
            "<h2>8. Aucune sensibilisation des équipes</h2>"
            "<p>L'humain est la première ligne de défense. Une équipe qui sait reconnaître un email de phishing évite la plupart des attaques. Sans formation, le meilleur pare-feu ne suffit pas.</p>"
            "<h2>9. Les départs de salariés mal gérés</h2>"
            "<p>Un ancien collaborateur dont les accès n'ont jamais été coupés reste un risque. La gestion rigoureuse des arrivées et des départs fait partie de la sécurité de base.</p>"
            "<h2>10. Le Wi-Fi ouvert ou partagé avec les invités</h2>"
            "<p>Un réseau unique pour les postes de travail et les visiteurs mélange des niveaux de confiance très différents. Un réseau invité séparé s'impose.</p>"
        ) + '<div class="callout"><strong>À retenir :</strong> aucune de ces erreurs ne demande un budget énorme à corriger. Ce qu\'il faut, c\'est une mise à plat une bonne fois, puis un suivi régulier. C\'est précisément ce qu\'apporte un prestataire informatique.</div>' + "<h2>Par où commencer</h2>" + _p(
            "Inutile de tout faire en même temps. Commencez par les trois mesures au meilleur rapport protection/effort : des mots de passe solides avec un gestionnaire, la double authentification sur la messagerie, et une sauvegarde isolée et testée. Un audit de sécurité gratuit permet ensuite de prioriser le reste selon vos risques réels."
        ) + CTA_HTML,
    },
    {
        "slug": "reconnaitre-email-phishing-former-equipes",
        "theme": "C",
        "title": "Comment reconnaître un email de phishing (et former ses équipes)",
        "excerpt": "Le phishing est à l'origine de la majorité des piratages d'entreprise. Apprendre à le repérer — et à le faire repérer par vos équipes — change tout.",
        "desc": "Comment reconnaître un email de phishing en entreprise ? Les signaux d'alerte, les bons réflexes et comment former vos équipes à ne pas se faire piéger.",
        "service": "cybersecurite",
        "related": ["10-erreurs-securite-informatique-pme", "mots-de-passe-entreprise-bonnes-pratiques", "ransomware-proteger-entreprise"],
        "body": _p(
            "Le phishing (ou « hameçonnage ») est la technique d'attaque la plus répandue, parce que c'est la plus simple : plutôt que de forcer une porte blindée, l'attaquant demande gentiment la clé. Un faux email imite une banque, un fournisseur, un collègue ou un service public, et vous pousse à cliquer, à payer ou à donner vos identifiants. Savoir le repérer est une compétence essentielle pour toute l'équipe."
        ) + "<h2>Les signaux d'alerte à connaître</h2>" + (
            "<ul>"
            "<li><strong>L'urgence et la menace :</strong> « votre compte sera suspendu sous 24h », « action immédiate requise ». La pression est faite pour vous empêcher de réfléchir.</li>"
            "<li><strong>L'adresse d'expéditeur bizarre :</strong> survolez le nom pour voir l'adresse réelle. Une banque n'écrit pas depuis « service-client@secure-verif-123.net ».</li>"
            "<li><strong>Les liens trompeurs :</strong> survolez le lien (sans cliquer) pour voir où il mène vraiment. Le texte peut dire « monbanque.fr » et pointer ailleurs.</li>"
            "<li><strong>Les fautes et formulations maladroites</strong>, même si les attaques deviennent de plus en plus soignées.</li>"
            "<li><strong>Une demande inhabituelle :</strong> un virement urgent, un changement de RIB, l'envoi de données sensibles.</li>"
            "<li><strong>Une pièce jointe inattendue :</strong> facture, « document à signer », au format inhabituel.</li>"
            "</ul>"
        ) + "<h2>L'arnaque au président et au faux fournisseur</h2>" + _p(
            "Deux variantes ciblent particulièrement les entreprises. L'« arnaque au président » : un email imitant le dirigeant demande à un comptable un virement urgent et confidentiel. Le « faux changement de RIB » : un email se faisant passer pour un fournisseur habituel annonce un nouveau numéro de compte — les factures suivantes partent alors chez l'escroc. La règle d'or : <strong>toute demande de virement ou de changement de coordonnées bancaires se vérifie par un autre canal</strong> (un appel au numéro connu, jamais celui indiqué dans l'email)."
        ) + '<blockquote>Dans le doute, on ne clique pas, on ne paye pas, on ne répond pas : on vérifie. Un appel de trente secondes a déjà évité bien des catastrophes.</blockquote>' + "<h2>Former ses équipes : les bons réflexes</h2>" + _p(
            "La technologie filtre une partie des emails malveillants, mais l'humain reste le dernier rempart. Quelques principes à ancrer dans l'entreprise :"
        ) + (
            "<ol>"
            "<li><strong>Créer une culture du signalement sans reproche.</strong> Un salarié qui a cliqué par erreur doit pouvoir le dire immédiatement, sans crainte, pour qu'on réagisse vite.</li>"
            "<li><strong>Désigner un point de contact</strong> à qui transférer tout email suspect.</li>"
            "<li><strong>Vérifier systématiquement</strong> les demandes financières par un second canal.</li>"
            "<li><strong>Ne jamais saisir ses identifiants</strong> depuis un lien reçu par email : on se connecte toujours en tapant soi-même l'adresse du site.</li>"
            "<li><strong>Organiser des rappels réguliers</strong>, voire des tests de phishing simulés, pour maintenir la vigilance.</li>"
            "</ol>"
        ) + "<h2>La sensibilisation, un investissement rentable</h2>" + _p(
            "Former une équipe à reconnaître le phishing coûte peu et évite des incidents qui peuvent se chiffrer en milliers d'euros et en jours d'arrêt. Chez DHB, la sensibilisation fait partie intégrante de notre approche de la cybersécurité : des équipes vigilantes valent tous les pare-feu du monde."
        ) + CTA_HTML,
    },
    {
        "slug": "mots-de-passe-entreprise-bonnes-pratiques",
        "theme": "C",
        "title": "Mots de passe en entreprise : les bonnes pratiques simples",
        "excerpt": "Les mots de passe restent la première défense de votre entreprise. Voici comment les gérer sans prise de tête — et sans post-it sous le clavier.",
        "desc": "Mots de passe en entreprise : les bonnes pratiques simples et efficaces (longueur, gestionnaire, double authentification) pour sécuriser vos comptes.",
        "service": "cybersecurite",
        "related": ["10-erreurs-securite-informatique-pme", "reconnaitre-email-phishing-former-equipes", "ransomware-proteger-entreprise"],
        "body": _p(
            "Le mot de passe est souvent la seule chose qui protège l'accès à votre messagerie, votre comptabilité ou vos données clients. Pourtant, c'est aussi le maillon le plus négligé : mots de passe trop simples, réutilisés partout, notés sur un post-it. Bonne nouvelle : quelques habitudes simples suffisent à transformer radicalement votre sécurité."
        ) + "<h2>Ce qui fait un bon mot de passe aujourd'hui</h2>" + _p(
            "Les règles ont évolué. Oubliez le « compliqué mais court ». Ce qui compte avant tout, c'est la <strong>longueur</strong>."
        ) + (
            "<ul>"
            "<li><strong>Privilégiez les phrases de passe :</strong> une suite de mots comme « Cheval-Bureau-Café-Montagne-7 » est à la fois longue, facile à retenir et très difficile à casser.</li>"
            "<li><strong>Visez au moins 12 à 16 caractères.</strong> La longueur protège bien plus que la complexité.</li>"
            "<li><strong>Un mot de passe différent par service.</strong> C'est la règle non négociable : ainsi, un site piraté ne compromet pas tous vos comptes.</li>"
            "</ul>"
        ) + "<h2>Le gestionnaire de mots de passe : la vraie solution</h2>" + _p(
            "Personne ne peut retenir quarante mots de passe différents. C'est là qu'intervient le gestionnaire de mots de passe : un coffre-fort chiffré qui mémorise tous vos identifiants. Vous ne retenez plus qu'un seul mot de passe maître, et l'outil génère et remplit automatiquement des mots de passe uniques et complexes pour chaque site."
        ) + (
            "<ul>"
            "<li>Fini les post-it et les fichiers Excel de mots de passe.</li>"
            "<li>Chaque compte a un mot de passe unique et solide, sans effort.</li>"
            "<li>On peut partager certains accès au sein de l'équipe de façon sécurisée, sans se les envoyer par email.</li>"
            "</ul>"
        ) + "<h2>La double authentification : indispensable</h2>" + _p(
            "Même le meilleur mot de passe peut être volé (phishing, fuite de données). La double authentification ajoute une seconde preuve : un code temporaire généré par une application sur votre téléphone. Même si un attaquant a votre mot de passe, il ne peut rien faire sans ce second code. Activez-la en priorité sur votre messagerie, votre banque et vos outils cloud : c'est la mesure la plus efficace qui soit."
        ) + '<div class="callout"><strong>Le trio gagnant :</strong> des phrases de passe longues + un gestionnaire de mots de passe + la double authentification. Ces trois mesures, mises en place une fois, bloquent la très grande majorité des piratages de comptes.</div>' + "<h2>Les mauvaises habitudes à abandonner</h2>" + (
            "<ul>"
            "<li>Le même mot de passe pour tout.</li>"
            "<li>Le mot de passe noté sur un post-it collé à l'écran.</li>"
            "<li>Le partage de comptes entre plusieurs personnes (chacun doit avoir le sien).</li>"
            "<li>Les mots de passe envoyés par email ou SMS en clair.</li>"
            "<li>Le changement forcé tous les mois, qui pousse à des mots de passe faibles et prévisibles : on change un mot de passe quand on soupçonne une fuite, pas par automatisme.</li>"
            "</ul>"
        ) + "<h2>Mettre tout ça en place, simplement</h2>" + _p(
            "Déployer un gestionnaire de mots de passe à l'échelle d'une entreprise, activer la double authentification partout et former les équipes aux bons réflexes prend peu de temps avec un accompagnement. C'est l'une des premières choses que nous mettons en place, car c'est l'une des plus rentables en matière de sécurité."
        ) + CTA_HTML,
    },
    {
        "slug": "rgpd-donnees-clients-petite-entreprise",
        "theme": "C",
        "title": "RGPD et données clients : ce qu'une petite entreprise doit vraiment faire",
        "excerpt": "Le RGPD fait peur, mais pour une PME, l'essentiel tient en quelques principes concrets. Voici ce qu'il faut réellement mettre en place.",
        "desc": "RGPD pour les petites entreprises : les obligations concrètes sur les données clients, sans jargon, et les actions simples à mettre en place pour être en règle.",
        "service": "cybersecurite",
        "related": ["comment-sauvegarder-donnees-entreprise", "10-erreurs-securite-informatique-pme", "mots-de-passe-entreprise-bonnes-pratiques"],
        "body": _p(
            "Le RGPD — le règlement européen sur la protection des données personnelles — a la réputation d'être complexe et réservé aux grandes entreprises. En réalité, dès que vous détenez des données sur des personnes (clients, prospects, salariés), vous êtes concerné. Mais pour une petite entreprise, l'essentiel se résume à quelques principes de bon sens. Cet article vous donne les repères techniques et organisationnels ; pour les aspects strictement juridiques, rapprochez-vous d'un conseil spécialisé."
        ) + "<h2>De quoi parle-t-on exactement ?</h2>" + _p(
            "Une « donnée personnelle », c'est toute information se rapportant à une personne identifiable : nom, email, téléphone, adresse, mais aussi un numéro client ou une adresse IP. Si vous gérez un fichier clients, une liste de contacts ou des fiches de paie, vous traitez des données personnelles."
        ) + "<h2>Les grands principes à respecter</h2>" + (
            "<ul>"
            "<li><strong>La finalité :</strong> vous collectez des données pour une raison précise et légitime, pas « au cas où ».</li>"
            "<li><strong>La minimisation :</strong> vous ne collectez que ce qui est nécessaire.</li>"
            "<li><strong>La durée limitée :</strong> vous ne conservez pas les données indéfiniment.</li>"
            "<li><strong>La sécurité :</strong> vous protégez les données contre la perte et le vol.</li>"
            "<li><strong>Les droits des personnes :</strong> chacun peut demander à accéder à ses données, les corriger ou les faire supprimer.</li>"
            "</ul>"
        ) + "<h2>Ce qu'une PME doit concrètement mettre en place</h2>" + (
            "<ol>"
            "<li><strong>Tenir un registre des traitements :</strong> un simple tableau listant quelles données vous collectez, pourquoi, où elles sont stockées et combien de temps. C'est la base, et c'est obligatoire.</li>"
            "<li><strong>Sécuriser l'accès aux données :</strong> mots de passe solides, double authentification, accès limités à ceux qui en ont besoin.</li>"
            "<li><strong>Sauvegarder et pouvoir restaurer :</strong> la perte de données est aussi un manquement au RGPD.</li>"
            "<li><strong>Recueillir le consentement</strong> quand il le faut (newsletters, cookies de mesure d'audience) et permettre de se désinscrire facilement.</li>"
            "<li><strong>Encadrer les sous-traitants :</strong> vos outils (hébergeur, logiciel de gestion, prestataire informatique) doivent eux aussi être conformes.</li>"
            "<li><strong>Savoir réagir en cas de fuite :</strong> une violation de données doit, dans certains cas, être signalée à la CNIL sous 72 heures.</li>"
            "</ol>"
        ) + '<blockquote>Le RGPD n\'est pas qu\'une contrainte administrative : c\'est aussi un argument de confiance. Montrer à vos clients que vous protégez sérieusement leurs données est un vrai atout commercial.</blockquote>' + "<h2>Le lien étroit avec la sécurité informatique</h2>" + _p(
            "Une grande partie des obligations RGPD rejoint simplement les bonnes pratiques de sécurité : contrôler les accès, chiffrer les données sensibles, sauvegarder, savoir qui a accès à quoi. En mettant de l'ordre dans votre informatique, vous avancez mécaniquement vers la conformité. Nous vous aidons sur le volet technique : sécurisation des accès, hébergement des données en Europe, sauvegardes conformes et traçabilité — en complément du conseil juridique."
        ) + CTA_HTML,
    },

    # ================= THÈME D — MESSAGERIE & OUTILS =================
    {
        "slug": "microsoft-365-ou-google-workspace-choisir",
        "theme": "D",
        "title": "Microsoft 365 ou Google Workspace : lequel choisir pour son entreprise ?",
        "excerpt": "Les deux grandes suites bureautiques du cloud se valent sur beaucoup de points. Voici les vrais critères pour trancher selon votre entreprise.",
        "desc": "Microsoft 365 ou Google Workspace : comparatif clair pour choisir la suite bureautique et de messagerie adaptée à votre entreprise.",
        "service": "messagerie-cloud",
        "related": ["creer-adresse-mail-professionnelle-nom-de-domaine", "partager-fichiers-equipe-bonnes-solutions", "infogerance-cest-quoi-concretement"],
        "body": _p(
            "Messagerie professionnelle, traitement de texte, tableur, visioconférence, stockage de fichiers : les deux géants du domaine sont Microsoft 365 et Google Workspace. Les deux sont excellents, fiables et hébergés dans le cloud. Alors comment choisir ? Voici les critères qui font vraiment la différence."
        ) + "<h2>Les points communs</h2>" + _p(
            "Avant les différences, rappelons que les deux offrent l'essentiel : une messagerie professionnelle à votre nom de domaine, une suite bureautique (traitement de texte, tableur, présentation), du stockage de fichiers dans le cloud, de la visioconférence, un agenda partagé, et des outils de travail collaboratif. Dans les deux cas, vos données sont accessibles de partout et sécurisées."
        ) + "<h2>Les forces de Microsoft 365</h2>" + (
            "<ul>"
            "<li><strong>Word, Excel, PowerPoint</strong> dans leurs versions complètes, installées sur l'ordinateur — un atout majeur si vous utilisez des fichiers Excel élaborés ou des documents très formatés.</li>"
            "<li><strong>La compatibilité maximale</strong> avec l'écosystème professionnel : la plupart des entreprises et administrations travaillent avec des formats Office.</li>"
            "<li><strong>Teams</strong>, très intégré, pour la communication interne.</li>"
            "<li><strong>Un choix naturel</strong> si vos équipes connaissent déjà Office et si vous échangez beaucoup de documents Office avec l'extérieur.</li>"
            "</ul>"
        ) + "<h2>Les forces de Google Workspace</h2>" + (
            "<ul>"
            "<li><strong>La simplicité</strong> et la rapidité de prise en main, tout se passe dans le navigateur.</li>"
            "<li><strong>La collaboration en temps réel</strong> sur un même document, historiquement plus fluide chez Google.</li>"
            "<li><strong>Gmail</strong> et sa recherche puissante, appréciés de beaucoup d'utilisateurs.</li>"
            "<li><strong>Un choix pertinent</strong> pour une entreprise jeune, mobile, qui travaille beaucoup à plusieurs et n'a pas de dépendance forte à Excel.</li>"
            "</ul>"
        ) + '<div class="callout"><strong>En résumé :</strong> si vous dépendez de Word/Excel et d\'un environnement Office, Microsoft 365 s\'impose souvent. Si vous valorisez la simplicité et la collaboration en ligne, Google Workspace est très convaincant. Les deux sont de bons choix — l\'erreur serait de rester sur des adresses Gmail ou Orange gratuites pour une entreprise.</div>' + "<h2>Les vrais critères de décision</h2>" + (
            "<ol>"
            "<li><strong>Vos outils existants :</strong> avez-vous des fichiers Excel complexes, des modèles Word, un logiciel métier intégré à Office ?</li>"
            "<li><strong>Les habitudes de l'équipe :</strong> à quoi vos collaborateurs sont-ils déjà habitués ?</li>"
            "<li><strong>Vos échanges externes :</strong> vos clients et partenaires travaillent-ils plutôt sous Office ?</li>"
            "<li><strong>Votre façon de travailler :</strong> beaucoup de collaboration simultanée, ou plutôt des documents individuels ?</li>"
            "</ol>"
        ) + "<h2>Le plus important : une migration bien faite</h2>" + _p(
            "Quel que soit votre choix, le vrai enjeu est la mise en place : migrer les anciennes boîtes mail sans perdre d'historique, configurer le nom de domaine, paramétrer la sécurité (double authentification, règles anti-spam), former les équipes. Une migration bâclée génère des semaines de pagaille. Nous vous conseillons sur le choix selon votre contexte, puis nous assurons une migration propre, sans perte de données ni interruption d'activité."
        ) + CTA_HTML,
    },
    {
        "slug": "creer-adresse-mail-professionnelle-nom-de-domaine",
        "theme": "D",
        "title": "Créer une adresse mail professionnelle à son nom de domaine",
        "excerpt": "« contact@votre-entreprise.fr » inspire bien plus confiance qu'une adresse Gmail. Voici comment obtenir une vraie messagerie pro, étape par étape.",
        "desc": "Comment créer une adresse mail professionnelle à son nom de domaine ? Les étapes, l'intérêt pour votre image et les points à ne pas rater.",
        "service": "messagerie-cloud",
        "related": ["microsoft-365-ou-google-workspace-choisir", "partager-fichiers-equipe-bonnes-solutions", "reconnaitre-email-phishing-former-equipes"],
        "body": _p(
            "Envoyer ses devis depuis une adresse « monentreprise75@gmail.com » ou « pierre.martin@orange.fr », c'est passer à côté d'un atout de crédibilité facile. Une adresse à votre nom de domaine — « pierre@monentreprise.fr » — fait immédiatement plus sérieux et professionnel. Voici comment la mettre en place."
        ) + "<h2>Pourquoi c'est important</h2>" + (
            "<ul>"
            "<li><strong>La crédibilité :</strong> une adresse à votre nom rassure clients et partenaires. Elle montre une entreprise établie.</li>"
            "<li><strong>L'image de marque :</strong> chaque email envoyé fait la promotion de votre nom de domaine.</li>"
            "<li><strong>La maîtrise :</strong> vous gardez le contrôle des adresses, même en cas de départ d'un salarié.</li>"
            "<li><strong>La sécurité et la délivrabilité :</strong> une messagerie pro bien configurée passe mieux les filtres anti-spam et protège contre l'usurpation de votre domaine.</li>"
            "</ul>"
        ) + "<h2>Les étapes pour y arriver</h2>" + (
            "<ol>"
            "<li><strong>Choisir et réserver un nom de domaine</strong> (par exemple monentreprise.fr), s'il n'est pas déjà pris. C'est une petite dépense annuelle.</li>"
            "<li><strong>Choisir une solution de messagerie professionnelle</strong> : Microsoft 365 ou Google Workspace sont les références. Ils offrent une vraie messagerie fiable, de l'espace de stockage et des outils collaboratifs.</li>"
            "<li><strong>Configurer le domaine :</strong> relier votre nom de domaine à la messagerie via des réglages techniques (les fameux enregistrements DNS). C'est l'étape la plus délicate, où une erreur peut empêcher les emails d'arriver.</li>"
            "<li><strong>Créer les adresses</strong> de chaque collaborateur, plus des adresses génériques (contact@, facturation@).</li>"
            "<li><strong>Sécuriser :</strong> activer la double authentification et configurer les protections anti-usurpation (SPF, DKIM, DMARC) pour que personne ne puisse envoyer d'emails en se faisant passer pour vous.</li>"
            "<li><strong>Migrer l'existant :</strong> récupérer les anciens emails et contacts sans rien perdre.</li>"
            "</ol>"
        ) + '<blockquote>Le diable est dans les détails techniques : une configuration DNS incorrecte, et vos emails finissent dans les spams de vos clients — ou n\'arrivent jamais. C\'est l\'erreur la plus fréquente d\'une mise en place « maison ».</blockquote>' + "<h2>Les erreurs à éviter</h2>" + (
            "<ul>"
            "<li>Continuer à utiliser une adresse personnelle gratuite pour l'activité professionnelle.</li>"
            "<li>Négliger les protections anti-usurpation, qui exposent au risque que des escrocs envoient de faux emails en votre nom.</li>"
            "<li>Oublier de rediriger ou récupérer l'historique des anciennes boîtes.</li>"
            "<li>Laisser des adresses actives après le départ d'un collaborateur.</li>"
            "</ul>"
        ) + "<h2>On s'en occupe pour vous</h2>" + _p(
            "Mettre en place une messagerie professionnelle propre, c'est une opération ponctuelle mais technique. Nous gérons l'ensemble : réservation ou raccordement du domaine, choix de la solution adaptée, configuration sécurisée, migration sans perte et formation des équipes. Vous repartez avec une messagerie fiable, professionnelle et sécurisée — et vous n'y repensez plus."
        ) + CTA_HTML,
    },
    {
        "slug": "partager-fichiers-equipe-bonnes-solutions",
        "theme": "D",
        "title": "Partager des fichiers en équipe sans se perdre : les bonnes solutions",
        "excerpt": "Fichiers en double, versions qui s'écrasent, pièces jointes par email… Voici comment organiser le partage de fichiers pour arrêter de perdre du temps.",
        "desc": "Comment partager des fichiers en équipe efficacement ? Les bonnes solutions (cloud, serveur, droits d'accès) pour éviter les doublons et les pertes de temps.",
        "service": "messagerie-cloud",
        "related": ["microsoft-365-ou-google-workspace-choisir", "creer-adresse-mail-professionnelle-nom-de-domaine", "comment-sauvegarder-donnees-entreprise"],
        "body": _p(
            "« Tu peux me renvoyer la dernière version ? » — « Laquelle, il y en a quatre ! » Ce dialogue vous est familier ? Le partage de fichiers mal organisé fait perdre un temps considérable et génère des erreurs coûteuses : on travaille sur la mauvaise version, on perd un document, on envoie une pièce jointe obsolète à un client. Il existe pourtant des solutions simples."
        ) + "<h2>Les méthodes à abandonner</h2>" + (
            "<ul>"
            "<li><strong>Les pièces jointes par email :</strong> dès qu'un fichier circule par email, il se multiplie en versions divergentes. Personne ne sait plus laquelle fait foi.</li>"
            "<li><strong>Les clés USB et disques qui circulent :</strong> peu sûrs, facilement perdus, et sources de versions multiples.</li>"
            "<li><strong>Le fichier posé sur l'ordinateur d'une seule personne :</strong> inaccessible dès qu'elle est absente, et perdu si son poste tombe en panne.</li>"
            "</ul>"
        ) + "<h2>La bonne approche : un espace partagé unique</h2>" + _p(
            "Le principe est simple : un seul endroit, accessible à toute l'équipe, où vivent les documents. Chacun travaille sur le fichier à sa source, et non sur une copie. Deux grandes familles de solutions existent."
        ) + "<h3>Le cloud professionnel (OneDrive/SharePoint, Google Drive)</h3>" + (
            "<ul>"
            "<li>Accessible de partout, du bureau comme en déplacement.</li>"
            "<li>Édition collaborative : plusieurs personnes peuvent travailler sur le même document en même temps.</li>"
            "<li>Historique des versions : on peut revenir à une version antérieure en un clic.</li>"
            "<li>Gestion fine des droits : qui peut voir, modifier, partager quoi.</li>"
            "<li>Idéal pour les équipes mobiles ou réparties sur plusieurs sites.</li>"
            "</ul>"
        ) + "<h3>Le serveur de fichiers local (NAS)</h3>" + (
            "<ul>"
            "<li>Stockage centralisé dans vos locaux, rapide d'accès sur place.</li>"
            "<li>Adapté aux gros volumes (fichiers lourds, plans, vidéos).</li>"
            "<li>Nécessite d'être sauvegardé et accessible à distance de façon sécurisée.</li>"
            "</ul>"
        ) + '<div class="callout"><strong>Le point à ne pas négliger :</strong> un espace partagé doit être <em>sauvegardé</em>. Un dossier commun piraté ou corrompu sans sauvegarde, c\'est toute l\'entreprise qui est bloquée. Partage et sauvegarde vont de pair.</div>' + "<h2>Bien organiser, pas seulement centraliser</h2>" + _p(
            "Centraliser ne suffit pas : encore faut-il une organisation claire. Quelques règles simples font des merveilles : une arborescence de dossiers logique et partagée, une convention de nommage des fichiers (date, projet, version), et des droits d'accès adaptés (tout le monde n'a pas besoin de tout voir). Un peu de méthode au départ évite des années de désordre."
        ) + "<h2>Mettre de l'ordre, durablement</h2>" + _p(
            "Organiser le partage de fichiers, c'est à la fois un gain de temps quotidien, une réduction des erreurs et une meilleure sécurité. Nous aidons les entreprises à choisir la solution adaptée (cloud, serveur, ou mixte), à migrer proprement l'existant, à définir une organisation claire et à sécuriser le tout par une sauvegarde fiable. Fini les « renvoie-moi la bonne version »."
        ) + CTA_HTML,
    },

    # ================= THÈME E — COMPRENDRE LE MÉTIER =================
    {
        "slug": "infogerance-cest-quoi-concretement",
        "theme": "E",
        "title": "Infogérance : c'est quoi, concrètement, et pour quelles entreprises ?",
        "excerpt": "Le mot « infogérance » impressionne, mais le concept est simple : confier la gestion de son informatique à un spécialiste. Explications sans jargon.",
        "desc": "Infogérance : définition claire et sans jargon. Ce que fait concrètement un prestataire d'infogérance, pour quelles entreprises, et ce que ça change au quotidien.",
        "service": "infogerance-globale",
        "related": ["informaticien-interne-ou-prestataire-externe", "comment-choisir-prestataire-informatique-checklist", "combien-temps-perd-pme-problemes-informatiques"],
        "body": _p(
            "« Infogérance » : le mot sonne technique et un peu intimidant. Pourtant, l'idée est très simple. C'est comme avoir un expert-comptable pour sa comptabilité, mais pour son informatique. Décryptons ce terme et voyons s'il correspond à votre situation."
        ) + "<h2>Une définition simple</h2>" + _p(
            "L'infogérance, c'est le fait de <strong>confier tout ou partie de la gestion de son informatique à un prestataire externe</strong>. Au lieu de gérer vous-même (ou de ne pas gérer du tout) vos ordinateurs, votre réseau, votre messagerie, votre sécurité et vos sauvegardes, vous déléguez cette responsabilité à un spécialiste qui s'en occupe pour vous, de façon suivie."
        ) + "<h2>Ce que fait concrètement un prestataire d'infogérance</h2>" + (
            "<ul>"
            "<li><strong>Il entretient votre parc :</strong> mises à jour, maintenance des postes, serveurs et réseau.</li>"
            "<li><strong>Il surveille :</strong> grâce à la supervision, il détecte les problèmes (disque qui se remplit, sauvegarde échouée) avant qu'ils ne vous bloquent.</li>"
            "<li><strong>Il dépanne :</strong> quand quelque chose ne marche pas, vous avez un interlocuteur qui répond et intervient, sur site ou à distance.</li>"
            "<li><strong>Il sécurise :</strong> antivirus, pare-feu, sauvegardes, protection contre les attaques.</li>"
            "<li><strong>Il conseille :</strong> il vous accompagne dans vos choix (nouveau matériel, nouveaux outils) en fonction de votre activité.</li>"
            "</ul>"
        ) + "<h2>Les différents niveaux d'infogérance</h2>" + _p(
            "L'infogérance n'est pas tout ou rien. On distingue souvent :"
        ) + (
            "<ul>"
            "<li><strong>L'infogérance partielle :</strong> le prestataire gère certains aspects (la sécurité et les sauvegardes, par exemple), tandis que vous gardez la main sur le reste.</li>"
            "<li><strong>L'infogérance globale :</strong> le prestataire devient votre service informatique complet, interlocuteur unique pour tout.</li>"
            "<li><strong>L'intervention ponctuelle :</strong> à la demande, sans suivi continu — utile au départ, mais moins préventif.</li>"
            "</ul>"
        ) + '<blockquote>L\'infogérance, ce n\'est pas « perdre le contrôle » de son informatique. C\'est au contraire reprendre le contrôle, en confiant la technique à quelqu\'un dont c\'est le métier, pour vous recentrer sur le vôtre.</blockquote>' + "<h2>Pour quelles entreprises ?</h2>" + _p(
            "L'infogérance s'adresse à toutes les structures qui n'ont pas de service informatique interne, ou pour qui en recruter un n'a pas de sens : PME, TPE, indépendants, cabinets (avocats, experts-comptables, médecins), commerces, associations. Dès lors que votre activité dépend d'ordinateurs qui fonctionnent, de données protégées et d'une messagerie fiable — c'est-à-dire presque toutes — l'infogérance a du sens."
        ) + "<h2>Ce que ça change au quotidien</h2>" + _p(
            "Concrètement, vous arrêtez de bricoler dans l'urgence, d'appeler un dépanneur différent à chaque panne, ou de croiser les doigts pour vos sauvegardes. Vous avez un interlocuteur qui connaît votre installation, qui anticipe les problèmes et que vous pouvez joindre. Votre informatique devient enfin ce qu'elle devrait être : un outil fiable qui vous sert, pas une source de stress. C'est exactement ce que propose notre offre d'infogérance globale."
        ) + CTA_HTML,
    },
    {
        "slug": "informaticien-interne-ou-prestataire-externe",
        "theme": "E",
        "title": "Faut-il un informaticien en interne ou un prestataire externe ?",
        "excerpt": "Recruter un informaticien ou externaliser ? Pour une PME, le calcul est souvent plus clair qu'il n'y paraît. Comparons honnêtement les deux options.",
        "desc": "Informaticien interne ou prestataire externe : comparatif honnête des deux options pour une PME, avec les critères de coût, de compétences et de disponibilité.",
        "service": "infogerance-globale",
        "related": ["infogerance-cest-quoi-concretement", "comment-choisir-prestataire-informatique-checklist", "combien-temps-perd-pme-problemes-informatiques"],
        "body": _p(
            "À mesure qu'une entreprise grandit, la question se pose : faut-il recruter un informaticien à plein temps, ou faire appel à un prestataire externe ? Il n'y a pas de réponse universelle, mais pour la plupart des PME, les éléments de comparaison penchent dans un sens assez clair. Regardons cela honnêtement."
        ) + "<h2>L'option « informaticien interne »</h2>" + _p(
            "Recruter un salarié dédié à l'informatique présente des avantages réels :"
        ) + (
            "<ul>"
            "<li><strong>Présence sur place</strong> et connaissance fine de l'entreprise.</li>"
            "<li><strong>Disponibilité immédiate</strong> pour les petits soucis du quotidien.</li>"
            "<li><strong>Implication</strong> dans la vie de l'entreprise.</li>"
            "</ul>"
        ) + _p("Mais aussi des limites importantes pour une PME :") + (
            "<ul>"
            "<li><strong>Le coût :</strong> un salaire chargé à plein temps, alors que la charge de travail informatique d'une PME ne justifie souvent pas un poste complet.</li>"
            "<li><strong>Le périmètre de compétences :</strong> une seule personne ne peut pas être experte en réseau, en sécurité, en cloud, en serveurs <em>et</em> en dépannage. L'informatique s'est spécialisée.</li>"
            "<li><strong>La continuité :</strong> que se passe-t-il pendant ses congés, ses arrêts, ou s'il quitte l'entreprise avec toute la connaissance en tête ?</li>"
            "</ul>"
        ) + "<h2>L'option « prestataire externe »</h2>" + (
            "<ul>"
            "<li><strong>Un coût maîtrisé et prévisible,</strong> proportionné à vos besoins réels — vous ne payez pas un temps plein pour une charge partielle.</li>"
            "<li><strong>Un éventail de compétences :</strong> vous bénéficiez d'une équipe aux expertises variées plutôt que d'une seule personne.</li>"
            "<li><strong>La continuité de service :</strong> pas de « trou » pendant les absences.</li>"
            "<li><strong>Une veille permanente</strong> sur les menaces et les nouveautés.</li>"
            "<li><strong>Une approche préventive</strong> grâce à la supervision.</li>"
            "</ul>"
        ) + _p("Son principal point d'attention : la qualité de la relation. Un bon prestataire doit connaître votre entreprise, être réactif et joignable. C'est pourquoi l'interlocuteur unique est essentiel.") + '<div class="callout"><strong>La solution hybride existe aussi :</strong> certaines entreprises plus grandes ont un référent interne pour le quotidien, épaulé par un prestataire externe pour l\'expertise, la sécurité et les projets. Le meilleur des deux mondes.</div>' + "<h2>Comment trancher pour votre entreprise</h2>" + _p(
            "Posez-vous ces questions : quel est le volume réel de travail informatique chez vous ? Quelles compétences vous manquent le plus (sécurité, cloud, réseau) ? Quel budget êtes-vous prêt à y consacrer ? Pour la grande majorité des PME, TPE, cabinets et commerces, un prestataire externe offre un meilleur rapport compétences/coût qu'un recrutement à plein temps — tout en apportant une sérénité qu'un seul salarié ne peut garantir."
        ) + "<h2>Notre positionnement</h2>" + _p(
            "Chez DHB, nous jouons précisément ce rôle de service informatique externalisé à taille humaine : un interlocuteur unique qui connaît votre entreprise, la réactivité d'un proche et l'étendue de compétences d'une équipe. Vous avez l'équivalent d'un informaticien dédié, sans le coût ni les limites d'un recrutement."
        ) + CTA_HTML,
    },
    {
        "slug": "combien-temps-perd-pme-problemes-informatiques",
        "theme": "E",
        "title": "Combien de temps perd une PME à cause de problèmes informatiques ?",
        "excerpt": "Les petits bugs quotidiens semblent anodins, mais leur accumulation coûte très cher. Mettons des chiffres — et du bon sens — sur ce gaspillage invisible.",
        "desc": "Combien de temps une PME perd-elle à cause des problèmes informatiques ? Comprenez le coût caché des pannes et lenteurs, et comment le réduire.",
        "service": "infogerance-globale",
        "related": ["ordinateur-professionnel-lent-causes-solutions", "infogerance-cest-quoi-concretement", "informaticien-interne-ou-prestataire-externe"],
        "body": _p(
            "« Ce n'est qu'un petit bug, je redémarre et ça repart. » Pris isolément, chaque incident informatique paraît insignifiant. Mais additionnez tous ces petits moments perdus, pour chaque salarié, chaque semaine, toute l'année : le total donne le vertige. Le coût de l'informatique défaillante est largement sous-estimé, parce qu'il est invisible."
        ) + "<h2>Un calcul simple et éclairant</h2>" + _p(
            "Imaginons un collaborateur qui perd seulement 20 minutes par jour à cause de problèmes informatiques : un poste lent au démarrage, une imprimante capricieuse, un fichier introuvable, une application qui plante, une recherche d'un mot de passe oublié. Vingt minutes, cela semble anodin."
        ) + (
            "<ul>"
            "<li>20 minutes par jour, c'est près de <strong>1h40 par semaine</strong>.</li>"
            "<li>Soit environ <strong>75 heures par an</strong>, par personne.</li>"
            "<li>Pour une équipe de 5 personnes, cela représente <strong>plus de 350 heures perdues par an</strong> — l'équivalent de plusieurs semaines de travail à temps plein.</li>"
            "</ul>"
        ) + _p(
            "Et ce calcul ne compte que les petites lenteurs du quotidien. Il ne prend pas en compte les pannes majeures."
        ) + "<h2>Le coût des pannes majeures</h2>" + _p(
            "Quand le serveur tombe, que la connexion Internet est coupée une demi-journée, ou qu'une attaque bloque tous les postes, ce n'est plus 20 minutes : c'est toute l'entreprise à l'arrêt. Impossible de facturer, de servir les clients, de produire. À cela s'ajoute le stress, la désorganisation, et parfois la perte de données ou de clients mécontents."
        ) + "<h2>Les coûts cachés qu'on oublie</h2>" + (
            "<ul>"
            "<li><strong>La charge mentale :</strong> le dirigeant ou un salarié qui bricole l'informatique au lieu de faire son vrai métier.</li>"
            "<li><strong>Les décisions reportées</strong> par peur de « casser quelque chose ».</li>"
            "<li><strong>La démotivation</strong> des équipes face à des outils qui ne marchent pas.</li>"
            "<li><strong>Les opportunités manquées</strong> faute d'outils modernes et fiables.</li>"
            "<li><strong>Le matériel remplacé trop tôt</strong> alors qu'un entretien l'aurait prolongé.</li>"
            "</ul>"
        ) + '<blockquote>L\'informatique qui fonctionne mal ne se voit pas sur une facture : elle se cache dans des heures perdues, du stress et des occasions ratées. C\'est le coût le plus élevé, parce qu\'il est invisible.</blockquote>' + "<h2>La maintenance préventive change la donne</h2>" + _p(
            "La plupart de ces pertes sont évitables. Un parc entretenu, des postes maintenus rapides, une supervision qui détecte les problèmes en amont, des sauvegardes qui tournent : tout cela supprime l'essentiel des incidents du quotidien et prévient les pannes majeures. Le calcul est simple : le coût d'une maintenance régulière est sans commune mesure avec celui du temps perdu et des pannes subies."
        ) + "<h2>Reprendre le contrôle</h2>" + _p(
            "Mesurer ce gaspillage invisible, c'est déjà faire un grand pas. L'étape suivante, c'est de confier son informatique à quelqu'un qui l'entretient et la surveille, pour que vos équipes retrouvent le temps et la sérénité qu'elles consacrent aujourd'hui à lutter contre leurs outils. C'est tout l'intérêt d'une infogérance bien menée."
        ) + CTA_HTML,
    },
    {
        "slug": "comment-choisir-prestataire-informatique-checklist",
        "theme": "E",
        "title": "Comment choisir son prestataire informatique : la checklist",
        "excerpt": "Confier son informatique à un inconnu fait peur. Voici la checklist des bonnes questions à poser pour choisir un prestataire sérieux et éviter les mauvaises surprises.",
        "desc": "Comment choisir son prestataire informatique ? La checklist des questions essentielles à poser pour sélectionner un partenaire sérieux et fiable pour votre PME.",
        "service": "infogerance-globale",
        "related": ["infogerance-cest-quoi-concretement", "informaticien-interne-ou-prestataire-externe", "combien-temps-perd-pme-problemes-informatiques"],
        "body": _p(
            "Choisir un prestataire informatique, c'est lui confier les clés d'une partie vitale de son entreprise : ses données, sa messagerie, sa sécurité. La confiance est donc primordiale. Mais comment juger, quand on n'est pas soi-même expert ? Voici la checklist des questions à poser. Les bonnes réponses sont souvent plus parlantes que les diplômes."
        ) + "<h2>1. La relation et la disponibilité</h2>" + (
            "<ul>"
            "<li>Aurai-je un <strong>interlocuteur unique</strong> qui connaît mon dossier, ou un standard anonyme à chaque appel ?</li>"
            "<li>Quels sont les <strong>délais de réponse</strong> et d'intervention garantis ?</li>"
            "<li>Comment vous joint-on en cas d'urgence ?</li>"
            "<li>Intervenez-vous <strong>sur site</strong>, ou uniquement à distance ?</li>"
            "</ul>"
        ) + "<h2>2. La transparence</h2>" + (
            "<ul>"
            "<li>Le <strong>devis est-il clair et gratuit</strong> ? Sans frais cachés ni engagement piège ?</li>"
            "<li>M'expliquez-vous les choses en <strong>langage compréhensible</strong>, ou vous retranchez-vous derrière le jargon ?</li>"
            "<li>Que se passe-t-il si je veux <strong>partir</strong> ? Mes données et mes accès me reviennent-ils facilement ?</li>"
            "</ul>"
        ) + "<h2>3. La sécurité et les sauvegardes</h2>" + (
            "<ul>"
            "<li>Comment <strong>sauvegardez-vous</strong> mes données ? La sauvegarde est-elle testée ?</li>"
            "<li>Où sont <strong>hébergées</strong> mes données (en Europe, pour le RGPD) ?</li>"
            "<li>Quelle est votre approche de la <strong>cybersécurité</strong> ?</li>"
            "<li>Avez-vous un <strong>plan</strong> en cas d'attaque ou de panne majeure ?</li>"
            "</ul>"
        ) + "<h2>4. L'approche : curative ou préventive ?</h2>" + _p(
            "Un prestataire qui se contente d'attendre que ça casse pour intervenir vous laissera subir les pannes. Un bon partenaire <strong>supervise et anticipe</strong> : il détecte les problèmes avant qu'ils ne vous bloquent. Demandez comment il surveille votre parc et prévient les incidents."
        ) + '<div class="callout"><strong>Le test ultime :</strong> posez une question technique simple sur votre situation. Un bon prestataire vous répondra clairement, sans vous noyer sous le jargon ni vous faire sentir incompétent. S\'il vous respecte avant même d\'avoir signé, c\'est bon signe.</div>' + "<h2>5. La proximité et la taille humaine</h2>" + _p(
            "Les gros prestataires peuvent être rassurants par leur taille, mais vous risquez d'y être un petit client parmi des milliers, noyé dans des procédures. Une structure à taille humaine vous offre souvent plus de réactivité, d'écoute et d'implication. Ce qui compte, ce n'est pas l'ancienneté affichée, mais la qualité de la relation et le sérieux de la méthode."
        ) + "<h2>6. Les engagements concrets</h2>" + _p(
            "Méfiez-vous des promesses floues (« on est les meilleurs »). Privilégiez les engagements concrets : délais de réponse, méthode de travail, transparence des prix, réversibilité. Un prestataire qui s'engage par écrit sur des points précis est un prestataire sérieux."
        ) + "<h2>En résumé</h2>" + _p(
            "Un bon prestataire informatique, c'est un partenaire disponible, transparent, qui parle votre langage, qui anticipe plutôt que de subir, et qui respecte vos données comme les vôtres. Chez DHB, nous avons construit notre offre exactement autour de ces critères, parce que ce sont les questions que nous nous poserions nous-mêmes. Le meilleur moyen de juger, c'est encore de nous rencontrer : l'audit est gratuit et sans engagement."
        ) + CTA_HTML,
    },
]


def get(slug):
    for a in ARTICLES:
        if a["slug"] == slug:
            return a
    return None
