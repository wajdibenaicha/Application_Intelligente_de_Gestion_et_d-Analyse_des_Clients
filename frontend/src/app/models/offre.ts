export interface Offre {
  id: number;
  title: string;
  description: string;
  categorie: string; // default: 'general'
  scoreMin: number;
  scoreMax: number;
  active: boolean;
}
