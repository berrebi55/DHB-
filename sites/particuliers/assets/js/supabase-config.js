/* DHB Particuliers — configuration Supabase + Stripe (clés publiques). */
window.DHB_SUPABASE = {
  url: "https://yjnaxzlvuwrvyyqxnvgn.supabase.co",
  anonKey: "sb_publishable_16JlSXS7tzUjlgGAQsmr8w_ZCIRTkSE",
  entity: "particuliers"
};
/* Paiement en ligne : passez enabled à true une fois la fonction Stripe
   déployée et configurée (voir supabase/STRIPE-SETUP.md). */
window.DHB_STRIPE = { enabled: false };
