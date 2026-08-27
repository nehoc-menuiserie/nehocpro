export const AUTHORS = ['Nathaniel', 'Michael', 'Emmanuel', 'Bruno'] as const;

export const AUTHOR_FULL: Record<string, string> = {
  Nathaniel: 'Nathaniel Cohen',
  Michael: 'Michael Cohen',
  Emmanuel: 'Emmanuel Cohen',
  Bruno: 'Bruno',
};

export const SITE_TYPES = ['Maison', 'Appartement', 'Bureau', 'Immeuble', 'Commerce', 'Autre'];
export const WORK_TYPES = ['Rénovation', 'Construction neuve'];
export const OPENING_TYPES = [
  'Fenêtre',
  'Porte-fenêtre',
  'Coulissant',
  'Baie vitrée',
  "Porte d'entrée",
  'Fixe',
  'Autre',
];
export const POSE_TYPES = [
  'À définir',
  'Rénovation sur dormant existant',
  'Dépose totale',
  'Pose en applique',
  'Pose en tunnel',
  'Pose en feuillure',
];

export const RAL_OPTIONS = [
  '',
  'RAL 1013 - Blanc perlé',
  'RAL 1015 - Ivoire clair',
  'RAL 3004 - Rouge pourpre',
  'RAL 5003 - Bleu saphir',
  'RAL 5010 - Bleu gentiane',
  'RAL 6005 - Vert mousse',
  'RAL 6009 - Vert sapin',
  'RAL 7012 - Gris basalte',
  'RAL 7016 - Gris anthracite',
  'RAL 7021 - Gris noir',
  'RAL 7022 - Gris terre d’ombre',
  'RAL 7035 - Gris clair',
  'RAL 7039 - Gris quartz',
  'RAL 7047 - Telegris 4',
  'RAL 8014 - Brun sépia',
  'RAL 8019 - Brun gris',
  'RAL 9001 - Blanc crème',
  'RAL 9005 - Noir profond',
  'RAL 9006 - Aluminium blanc',
  'RAL 9007 - Aluminium gris',
  'RAL 9010 - Blanc pur',
  'RAL 9016 - Blanc signalisation',
  'RAL 9017 - Noir signalisation',
  'Chêne doré',
  'Noyer',
  'Autre couleur / RAL',
];

export const RAL_COLORS: Record<string, string> = {
  'RAL 1013': '#e9e5ce',
  'RAL 1015': '#e6d2a6',
  'RAL 3004': '#701f29',
  'RAL 5003': '#1f3855',
  'RAL 5010': '#004f7c',
  'RAL 6005': '#2f4538',
  'RAL 6009': '#27352a',
  'RAL 7012': '#575d5e',
  'RAL 7016': '#383e42',
  'RAL 7021': '#2f3234',
  'RAL 7022': '#4c4a44',
  'RAL 7035': '#c5c7c4',
  'RAL 7039': '#6b6860',
  'RAL 7047': '#d0d0d0',
  'RAL 8014': '#4a3526',
  'RAL 8019': '#3b3332',
  'RAL 9001': '#e9e0d2',
  'RAL 9005': '#0a0a0d',
  'RAL 9006': '#a5a8a6',
  'RAL 9007': '#858783',
  'RAL 9010': '#f1eee5',
  'RAL 9016': '#f4f5f0',
  'RAL 9017': '#1f2124',
};

export const WOOD_GRADIENTS: Record<string, [string, string, string]> = {
  'Chêne doré': ['#a86c2f', '#d7a55e', '#8b5526'],
  Noyer: ['#4b2d1d', '#815337', '#3b2217'],
};

export function ralHex(value: string): string | null {
  const key = Object.keys(RAL_COLORS).find((k) => value.startsWith(k));
  return key ? RAL_COLORS[key] : null;
}

export function isUndefinedColor(value: string) {
  return !value || value === 'À définir' || value.includes('Autre couleur');
}

export function authorFullName(author: string) {
  return AUTHOR_FULL[author] || author || '';
}
