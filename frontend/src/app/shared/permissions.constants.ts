export const PERMISSIONS = {
  // Questionnaires
  VOIR_QUESTIONNAIRES:     'Voir les questionnaires',
  AJOUTER_QUESTIONNAIRE:   'Ajouter un questionnaire',
  MODIFIER_QUESTIONNAIRE:  'Modifier un questionnaire',
  SUPPRIMER_QUESTIONNAIRE: 'Supprimer un questionnaire',
  VALIDER_QUESTIONNAIRE:   'Valider un questionnaire',

  // Offres
  CREER_OFFRE:    'Créer une offre',
  MODIFIER_OFFRE: 'Modifier une offre',
  SUPPRIMER_OFFRE:'Supprimer une offre',
  ENVOYER_OFFRE:  'Envoyer une offre',

  // Clients
  VOIR_CLIENTS:   'Voir les clients',
  GERER_CLIENTS:  'Gérer les clients',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
