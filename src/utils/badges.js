// Hardcoded curated restaurant badge data (2025/2026 updated)
// Sources: Michelin Guide NYC 2025, Eater NY 38 (Winter 2026), The Infatuation NYC, NYT 100 Best 2025

const BADGE_DATA = {
  michelin_3star: {
    label: 'Michelin 3-Star',
    color: '#dc2626',
    restaurants: [
      'Eleven Madison Park', 'Jungsik', 'Le Bernardin', 'Per Se', 'Sushi Sho',
    ],
  },
  michelin_2star: {
    label: 'Michelin 2-Star',
    color: '#ea580c',
    restaurants: [
      'Aquavit', 'Aska', 'Atera', 'Atomix', 'Blue Hill at Stone Barns',
      'Cesar', 'Chef\'s Table at Brooklyn Fare', 'Gabriel Kreuther',
      'Jean-Georges', 'Joo Ok', 'Masa', 'odo', 'Saga',
      'Sushi Noz', 'The Modern',
    ],
  },
  michelin_1star: {
    label: 'Michelin 1-Star',
    color: '#d97706',
    restaurants: [
      '63 Clinton', 'Bar Miller', 'bom', 'Bridges', 'Cafe Boulud',
      'Casa Mono', 'Corima', 'Cote', 'Crown Shy', 'Daniel',
      'Dirt Candy', 'Essential by Christophe', 'Estela',
      'Family Meal at Blue Hill', 'Francie', 'Frevo', 'Gramercy Tavern',
      'Huso', 'Icca', 'Jeju Noodle Bar', 'Joji', 'Jua', 'Kochi',
      'Kosaka', 'L\'Abeille', 'La Bastide by Andrea Calstier',
      'Le Coucou', 'Le Pavillon', 'Mari', 'Meju', 'Muku', 'Noda',
      'Noksu', 'Noz 17', 'Oiji Mi', 'Oxomoco', 'Restaurant Yuu',
      'Rezdora', 'Semma', 'Shion 69 Leonard Street', 'Shmone',
      'Shota Omakase', 'Sushi Nakazawa', 'Tempura Matsui',
      'The Four Horsemen', 'Torien', 'Torrisi', 'Tsukimi', 'Tuome',
      'Yamada', 'YingTao', 'Yoshino',
    ],
  },
  michelin_bib: {
    label: 'Bib Gourmand',
    color: '#f59e0b',
    restaurants: [
      '8282', 'Agi\'s Counter', 'Alley 41', 'Alta Calidad', 'Atla',
      'Banh Anh Em', 'Bayon', 'Bohemian Spirit', 'Bonnie\'s',
      'Boro6 Wine Bar', 'Bungalow', 'Burrata', 'C as in Charlie',
      'Cafe Mars', 'Caleta 111 Cevicheria', 'Cardamom', 'Cervo\'s',
      'Chalong', 'Chavela\'s', 'CheLi', 'Cho Dang Gol',
      'Chuan Tian Xia', 'Chutney Masala', 'Coqodaq', 'Covacha',
      'Dhamaka', 'Dim Sum Go Go', 'Enoteca Maria', 'Falansai',
      'Gordo\'s Cantina', 'Haenyeo', 'HanGawi',
      'Hometown Barbecue New York', 'Hupo', 'Ishq', 'Jiang Nan',
      'Katz\'s', 'Katz\'s Delicatessen',
      'Kung Fu Little Steamed Buns Ramen', 'La Dong', 'Laliko',
      'Legend of Taste', 'Little Alley', 'Little Myanmar', 'LORE',
      'Lore', 'Lungi', 'MaLa Project', 'Miss Ada',
      'Momofuku Noodle Bar', 'Nami Nori', 'Noreetuh',
      'Norma Gastronomia Siciliana', 'Nyonya', 'Odre', 'Olmo', 'Oso',
      'Peppercorn Station', 'Phayul', 'Pierozek', 'Pinch Chinese',
      'Potluck Club', 'Pranakhon', 'Roberta\'s', 'Rolo\'s', 'Ruffian',
      'Runner Up', 'Russ & Daughters Cafe', 'Sagara', 'Sal Tang\'s',
      'Sami & Susu', 'SaRanRom Thai', 'Shalom Japan', 'Sobaya',
      'Sobre Masa', 'Soda Club', 'Speedy Romeo', 'Superiority Burger',
      'Tanoreen', 'Taqueria El Chato', 'Tha Phraya', 'Thai Diner',
      'The Cookery', 'Tolo', 'Tonchin', 'Tong Sam Gyup Goo Yi',
      'Una Pizza Napoletana', 'Untable', 'Win Son', 'Yellow Rose',
      'Yemenat', 'Zaab Zaab',
    ],
  },
  eater38: {
    label: 'Eater 38',
    color: '#7c3aed',
    restaurants: [
      'A&A Bake Doubles and Roti', 'Abuqir', 'Adda', 'Al Badawi',
      'Balthazar', 'Bong', 'Cafe Commerce', 'Carnitas Ramirez',
      'Chama Mama', 'Charles Pan-Fried Chicken', 'Claud', 'Golden Diner',
      'Grand Central Oyster Bar', 'Hamburger America', 'Ho Foods',
      'Hyderabadi Zaiqa', 'Kabawa', 'Keens Steakhouse',
      'L\'Industrie Pizzeria', 'La Pirana Lechonera', 'Le Bernardin',
      'Le Veau d\'Or', 'Lilia', 'Mam', 'Nepali Bhanchha Ghar',
      'Noz Market', 'Red Hook Tavern', 'Restaurant Daniel', 'Rolo\'s',
      'Sailor', 'Sky Pavilion', 'Sunn\'s', 'Superiority Burger',
      'The Four Horsemen', 'Txikito', 'Una Pizza Napoletana',
      'Via Carota', 'Zaab Zaab',
    ],
  },
  infatuation: {
    label: 'The Infatuation',
    color: '#2563eb',
    restaurants: [
      'Bong', 'Bridges', 'Carnitas Ramirez', 'Cho Dang Gol',
      'Cocina Consuelo', 'Ha\'s Snack Bar', 'L\'Industrie Pizzeria',
      'Le Bernardin', 'Le Veau d\'Or', 'Mam', 'Penny', 'Semma',
      'Shaw-nae\'s House', 'Shu Jiao Fu Zhou Cuisine', 'Smithereens',
      'Tatiana', 'Thai Diner', 'Torrisi', 'Trinciti Roti Shop',
      'Via Carota', 'Adda', 'Banh Anh Em', 'Borgo',
      'Chrissy\'s Pizza', 'Danny & Coop\'s', 'Dar Lbahja',
      'I Cavallini', 'Saint Urban', 'Santo Taco', 'Sunn\'s',
    ],
  },
  nytimes: {
    label: 'NYT Top 100',
    color: '#059669',
    restaurants: [
      'Semma', 'Atomix', 'Le Bernardin', 'Kabawa', 'Ha\'s Snack Bar',
      'King', 'Penny', 'Sushi Sho', 'Szechuan Mountain House',
      'Tatiana', 'A&A Bake and Doubles', 'AbuQir Seafood', 'Aska',
      'Atoboy', 'Barbuto', 'Barney Greengrass', 'Birria-Landia',
      'Borgo', 'Bridges', 'Bungalow', 'Cafe Kestrel', 'Cafe Mado',
      'Carnitas Ramirez', 'Casa Mono', 'Cervo\'s', 'Chambers',
      'Chez Ma Tante', 'Cho Dang Gol', 'Chongqing Lao Zao',
      'Cka Ka Qellu', 'Claud', 'Cocina Consuelo',
      'Court Street Grocers', 'Crown Shy', 'Daniel', 'Dera',
      'Dhamaka', 'Don Peppe', 'Ewe\'s Delicious Treats', 'Eyval',
      'The Four Horsemen', 'Four Twenty Five', 'Frenchette',
      'Gage & Tollner', 'Golden Diner', 'Gramercy Tavern',
      'Great N.Y. Noodletown', 'The Grill', 'Hainan Chicken House',
      'Hamburger America', 'Hellbender', 'Ho Foods', 'Houseman',
      'Jean-Georges', 'Jeju Noodle Bar', 'Jungsik', 'Keens',
      'Keens Steakhouse', 'Kisa', 'Koloman', 'Kono', 'Kopitiam',
      'Laghman Express', 'Lakruwana', 'Le Coucou', 'Le Veau d\'Or',
      'Levant', 'Lilia', 'Little Myanmar', 'Lola\'s',
      'Lucia Pizza of Avenue X', 'Mam', 'Okdongsik',
      'Okiboru House of Tsukemen', 'Old Sport', 'Raf\'s', 'Raku',
      'Randazzo\'s Clam Bar', 'S & P Lunch', 'Sailor',
      'Salty Lunch Lady\'s Little Luncheonette', 'Shaw-nae\'s House',
      'Shukette', 'Sofreh', 'Superiority Burger', 'Sushi Noz',
      'Sushi Ouji', 'Taiwanese Gourmet', 'Temple Canteen',
      'Thai Diner', 'Third Falcon', 'Torrisi', 'Trinciti Roti Shop',
      'Txikito', 'Una Pizza Napoletana', 'Via Carota', 'Village Cafe',
      'White Bear', 'Yoon Haeundae Galbi', 'Zaab Zaab',
    ],
  },
}

// Build a lookup map: lowercase name → array of badge objects
const _badgeLookup = new Map()

for (const [key, badge] of Object.entries(BADGE_DATA)) {
  for (const name of badge.restaurants) {
    const lower = name.toLowerCase()
    if (!_badgeLookup.has(lower)) {
      _badgeLookup.set(lower, [])
    }
    _badgeLookup.get(lower).push({
      key,
      label: badge.label,
      color: badge.color,
    })
  }
}

export function getBadges(restaurantName) {
  if (!restaurantName) return []
  const lower = restaurantName.toLowerCase().trim()

  // Exact match first
  if (_badgeLookup.has(lower)) {
    return _badgeLookup.get(lower)
  }

  // Partial match — only for names longer than 4 chars to avoid false positives
  // Check if any badge restaurant name is contained in the search name or vice versa
  if (lower.length <= 4) return []

  const matches = []
  for (const [name, badges] of _badgeLookup) {
    if (name.length <= 4) continue
    if (lower.includes(name) || name.includes(lower)) {
      matches.push(...badges)
    }
  }

  // Deduplicate by key
  const seen = new Set()
  return matches.filter((b) => {
    if (seen.has(b.key)) return false
    seen.add(b.key)
    return true
  })
}
