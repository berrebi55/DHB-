/* DHB — Configuration Supabase côté site (PUBLIC, sans danger).
   La clé "publishable" est conçue pour être exposée dans le navigateur :
   la sécurité réelle est assurée par les règles RLS en base de données.
   ⚠️ Ne JAMAIS mettre ici la clé secrète (sb_secret_...). */
window.DHB_SUPABASE = {
  url: "https://yjnaxzlvuwrvyyqxnvgn.supabase.co",
  anonKey: "sb_publishable_16JlSXS7tzUjlgGAQsmr8w_ZCIRTkSE",
  entity: "infogerance"   // filiale d'origine des demandes de ce site
};
