# Polices des sites (hébergées localement)

Fichiers « latin » des polices variables, repris des paquets npm Fontsource
`@fontsource-variable/inter`, `@fontsource-variable/newsreader` et
`@fontsource-variable/nunito` (version 5.3.0). Licence **SIL Open Font
License 1.1** (fichiers `LICENCE-*.txt`) : usage commercial et redistribution
autorisés, licence jointe.

`build/build_all.py` copie dans `sites/<site>/assets/fonts/` les seules polices
utilisées par chaque site (liste : `POLICES` dans `build/marque.py`).
Ainsi aucune page ne contacte Google pour ses polices.
