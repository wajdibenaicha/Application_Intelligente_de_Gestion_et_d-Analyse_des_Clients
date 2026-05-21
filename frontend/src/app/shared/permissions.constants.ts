export const PERMISSIONS = {
  GERER_QUESTIONNAIRES: 'Gérer les questionnaires',
  GERER_OFFRES:         'Gérer les offres',
  SUPPRIMER_REPONSE:    'Supprimer une réponse',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
