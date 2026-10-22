# -*- coding: utf-8 -*-
"""Titres courts (balise <title>, ≤ 60 caractères) des pages dont la question
complète est trop longue pour les résultats Google. Ce sont des reformulations
de la question affichée sur la page (h1), sans information nouvelle.
⚠️ PROPOSITIONS À VALIDER PAR LE PROPRIÉTAIRE (lot 14) : modifier librement,
puis `python3 build/build_all.py`. Clé : adresse de la page (domaine compris).
"""

PRO = "https://pro.dhb-groupe.fr/"
ASSISTANCE = "https://www.dhb-assistance.fr/"

TITRES_COURTS = {
    # --- DHB Pro : conseils (blog) ---
    PRO + "blog/10-erreurs-securite-informatique-pme/": "10 erreurs de sécurité informatique fréquentes en PME | DHB",
    PRO + "blog/combien-temps-perd-pme-problemes-informatiques/": "PME : combien de temps perdu en problèmes informatiques ?",
    PRO + "blog/informaticien-interne-ou-prestataire-externe/": "Informaticien interne ou prestataire externe ? | DHB",
    PRO + "blog/ransomware-proteger-entreprise/": "Ransomware : comment protéger son entreprise | DHB",
    # --- DHB Pro : pannes fréquentes ---
    PRO + "pannes-frequentes/acces-refuse-dossier-partage/": "« Accès refusé » sur un dossier partagé ou un serveur | DHB",
    PRO + "pannes-frequentes/antivirus-expire-ou-desactive/": "Antivirus expiré ou « protection désactivée » | DHB",
    PRO + "pannes-frequentes/bande-passante-saturee-par-les-mises-a-jour/": "Internet rame au bureau à cause des mises à jour | DHB",
    PRO + "pannes-frequentes/difference-infogerance-depannage/": "Infogérance ou simple dépannage : quelle différence ? | DHB",
    PRO + "pannes-frequentes/faux-support-microsoft-ecran-bloque/": "Fausse « alerte Microsoft » qui bloque l'écran | DHB",
    PRO + "pannes-frequentes/gerer-arrivee-depart-salarie-informatique/": "Arrivée et départ d'un salarié : gérer l'informatique | DHB",
    PRO + "pannes-frequentes/infogerance-rgpd-garanties/": "Infogérance et RGPD : quelles garanties exiger ? | DHB",
    PRO + "pannes-frequentes/logiciel-comptable-ne-souvre-plus-apres-maj/": "Logiciel comptable qui ne s'ouvre plus après mise à jour",
    PRO + "pannes-frequentes/mes-emails-arrivent-dans-les-spams/": "Mes emails pro arrivent dans les spams de mes clients | DHB",
    PRO + "pannes-frequentes/messagerie-pro-nenvoie-plus/": "Messagerie pro : plus d'envoi ni de réception d'emails | DHB",
    PRO + "pannes-frequentes/mot-de-passe-windows-oublie/": "Mot de passe Windows oublié par un collaborateur | DHB",
    PRO + "pannes-frequentes/navigateur-internet-tres-lent/": "Navigateur très lent alors que la connexion fonctionne | DHB",
    PRO + "pannes-frequentes/office-microsoft-365-licence-expiree/": "Word/Excel : « produit sans licence » ou licence expirée",
    PRO + "pannes-frequentes/ouverture-session-domaine-tres-longue/": "Ouverture de session Windows très longue en entreprise | DHB",
    PRO + "pannes-frequentes/poste-ne-rejoint-plus-le-domaine/": "Un poste ne se connecte plus au domaine de l'entreprise",
    PRO + "pannes-frequentes/reduire-couts-informatiques-pme/": "Réduire ses coûts informatiques sans prendre de risque | DHB",
    PRO + "pannes-frequentes/serveur-de-fichiers-tres-lent/": "Serveur de fichiers devenu très lent pour toute l'équipe",
    PRO + "pannes-frequentes/tpe-moins-de-10-postes-infogerance/": "TPE de moins de 10 postes : faut-il une infogérance ? | DHB",
    PRO + "pannes-frequentes/un-seul-poste-sans-reseau/": "Un seul ordinateur sans réseau, les autres fonctionnent",
    PRO + "pannes-frequentes/virus-pubs-intempestives/": "PC avec pubs intempestives et page d'accueil modifiée | DHB",
    PRO + "pannes-frequentes/vpn-connecte-mais-pas-dacces-serveur/": "VPN connecté mais pas d'accès au serveur de fichiers | DHB",
    PRO + "pannes-frequentes/wifi-se-deconnecte-sans-arret/": "Wi-Fi qui se déconnecte ou ne capte pas partout au bureau",
    # --- DHB Assistance : centre d'aide ---
    ASSISTANCE + "aide/faux-virus-arnaque-microsoft/": "Faux message « PC infecté » qui demande d'appeler",
    ASSISTANCE + "aide/ordinateur-chauffe-ventilateur-bruyant/": "PC qui chauffe et ventilateur bruyant | DHB Assistance",
    ASSISTANCE + "aide/sauvegarder-ses-photos-souvenirs/": "Sauvegarder ses photos et souvenirs pour ne pas les perdre",
}

assert all(len(t) <= 60 for t in TITRES_COURTS.values()), [t for t in TITRES_COURTS.values() if len(t) > 60]
