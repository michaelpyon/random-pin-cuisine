// Cuisine classification using a built-in lookup table with sub-region specificity

// Regional overrides — keyed by country code, then matched against city/state/region names
const REGIONAL_OVERRIDES = {
  it: [
    { match: ['napoli', 'naples', 'campania'], cuisineType: 'Neapolitan Italian', description: 'Pizza was literally invented here. Neapolitan pies, ragù napoletano, and sfogliatella — simple ingredients elevated to art.', osmCuisineTag: 'pizza', osmFallbackTag: 'italian' },
    { match: ['sicilia', 'sicily', 'palermo', 'catania'], cuisineType: 'Sicilian Italian', description: 'Arancini, pasta alla norma, and cannoli. Sicilian food is bold, sweet, and influenced by Arab and Greek traditions.', osmCuisineTag: 'sicilian', osmFallbackTag: 'italian' },
    { match: ['roma', 'rome', 'lazio'], cuisineType: 'Roman Italian', description: 'Cacio e pepe, carbonara, amatriciana, and gricia — the four iconic Roman pastas. Simple, perfect, non-negotiable.', osmCuisineTag: 'italian', osmFallbackTag: null },
    { match: ['bologna', 'emilia', 'modena', 'parma'], cuisineType: 'Emilia-Romagna Italian', description: 'Tortellini, ragù bolognese, Parmigiano, and prosciutto di Parma. This is Italy\'s undisputed food capital.', osmCuisineTag: 'italian', osmFallbackTag: null },
    { match: ['firenze', 'florence', 'toscana', 'tuscany', 'siena'], cuisineType: 'Tuscan Italian', description: 'Bistecca alla fiorentina, ribollita, and panzanella. Tuscan food is rustic, meat-forward, and built on incredible olive oil.', osmCuisineTag: 'italian', osmFallbackTag: null },
    { match: ['milano', 'milan', 'lombardia', 'lombardy'], cuisineType: 'Milanese Italian', description: 'Risotto alla milanese, cotoletta, and ossobuco. Northern Italian comfort food with a cosmopolitan edge.', osmCuisineTag: 'italian', osmFallbackTag: null },
    { match: ['venezia', 'venice', 'veneto'], cuisineType: 'Venetian Italian', description: 'Cicchetti bar snacks, risotto al nero di seppia, and sarde in saor. Venice eats seafood like nobody else.', osmCuisineTag: 'italian', osmFallbackTag: null },
    { match: ['genova', 'genoa', 'liguria'], cuisineType: 'Ligurian Italian', description: 'Pesto genovese, focaccia di Recco, and trofie. The Italian Riviera serves the freshest, most herbaceous food in Italy.', osmCuisineTag: 'italian', osmFallbackTag: null },
    { match: ['puglia', 'apulia', 'bari', 'lecce'], cuisineType: 'Pugliese Italian', description: 'Orecchiette, burrata, and taralli. Puglia is Italy\'s breadbasket with the best street food in the south.', osmCuisineTag: 'italian', osmFallbackTag: null },
    { match: ['sardegna', 'sardinia'], cuisineType: 'Sardinian Italian', description: 'Porceddu roast pig, culurgiones pasta, and pane carasau. An island with its own wild culinary identity.', osmCuisineTag: 'italian', osmFallbackTag: null },
  ],
  cn: [
    { match: ['sichuan', 'chengdu', 'chongqing'], cuisineType: 'Sichuan Chinese', description: 'Mouth-numbing peppercorns and fiery chili oil. Mapo tofu and dan dan noodles will reset your spice tolerance.', osmCuisineTag: 'sichuan', osmFallbackTag: 'chinese' },
    { match: ['guangdong', 'canton', 'guangzhou', 'shenzhen', 'hong kong'], cuisineType: 'Cantonese Chinese', description: 'Dim sum, roast goose, and wonton noodle soup. Cantonese cuisine is the art of letting ingredients speak for themselves.', osmCuisineTag: 'cantonese', osmFallbackTag: 'chinese' },
    { match: ['shanghai'], cuisineType: 'Shanghainese Chinese', description: 'Xiao long bao, red-braised pork, and hairy crab. Shanghai cuisine is sweet, rich, and obsessed with umami.', osmCuisineTag: 'chinese', osmFallbackTag: null },
    { match: ['beijing', 'peking'], cuisineType: 'Northern Chinese', description: 'Peking duck, jianbing, and hand-pulled noodles. Beijing food is hearty, wheaty, and built for cold winters.', osmCuisineTag: 'chinese', osmFallbackTag: null },
    { match: ['hunan', 'changsha'], cuisineType: 'Hunan Chinese', description: 'Even spicier than Sichuan but with a smoky, vinegary edge. Chairman Mao\'s favorite cuisine, and for good reason.', osmCuisineTag: 'hunan', osmFallbackTag: 'chinese' },
    { match: ['yunnan', 'kunming'], cuisineType: 'Yunnan Chinese', description: 'Crossing-the-bridge noodles and wild mushroom hotpot. Yunnan is where Chinese, Southeast Asian, and Tibetan flavors collide.', osmCuisineTag: 'chinese', osmFallbackTag: null },
    { match: ['xinjiang', 'uyghur', 'urumqi'], cuisineType: 'Uyghur Chinese', description: 'Lamb kebabs, hand-pulled laghman noodles, and naan bread. Central Asian flavors right inside China.', osmCuisineTag: 'uyghur', osmFallbackTag: 'chinese' },
    { match: ['fujian', 'fuzhou', 'xiamen'], cuisineType: 'Fujianese Chinese', description: 'Light, umami-rich soups and seafood. Fujian food is subtle, brothy, and deeply comforting.', osmCuisineTag: 'chinese', osmFallbackTag: null },
  ],
  in: [
    { match: ['punjab', 'amritsar', 'ludhiana'], cuisineType: 'Punjabi Indian', description: 'Butter chicken, naan, and tandoori everything. Punjabi food is the reason you love Indian restaurants.', osmCuisineTag: 'indian', osmFallbackTag: null },
    { match: ['kerala', 'kochi', 'trivandrum'], cuisineType: 'Kerala Indian', description: 'Coconut-based curries, appam, and fish moilee. Kerala spice trade history is in every bite.', osmCuisineTag: 'indian', osmFallbackTag: null },
    { match: ['tamil', 'chennai', 'madurai'], cuisineType: 'South Indian', description: 'Dosa, idli, sambar, and filter coffee. South Indian vegetarian food is a masterclass in fermentation and spice.', osmCuisineTag: 'south_indian', osmFallbackTag: 'indian' },
    { match: ['bengal', 'kolkata', 'west bengal'], cuisineType: 'Bengali Indian', description: 'Fish curry, mishti doi, and rosogolla. Bengali food is sweet, subtle, and obsessed with mustard and fish.', osmCuisineTag: 'indian', osmFallbackTag: null },
    { match: ['rajasthan', 'jaipur', 'jodhpur', 'udaipur'], cuisineType: 'Rajasthani Indian', description: 'Dal bati churma and laal maas. Desert cuisine that\'s rich, spicy, and built to survive on minimal water.', osmCuisineTag: 'indian', osmFallbackTag: null },
    { match: ['goa'], cuisineType: 'Goan Indian', description: 'Vindaloo, xacuti, and fish curry rice. Portuguese-Indian fusion from India\'s beach paradise.', osmCuisineTag: 'indian', osmFallbackTag: null },
    { match: ['hyderabad', 'telangana'], cuisineType: 'Hyderabadi Indian', description: 'Biryani royalty. Hyderabadi dum biryani and haleem are worth a pilgrimage.', osmCuisineTag: 'indian', osmFallbackTag: null },
    { match: ['gujarat', 'ahmedabad'], cuisineType: 'Gujarati Indian', description: 'Dhokla, thepla, and the most elaborate vegetarian thalis you\'ll ever see. Sweet, savory, and no meat needed.', osmCuisineTag: 'indian', osmFallbackTag: null },
  ],
  jp: [
    { match: ['osaka', 'kansai'], cuisineType: 'Osaka Japanese', description: 'Japan\'s kitchen — takoyaki, okonomiyaki, and kushikatsu. Osaka doesn\'t do fine dining, it does street food perfection.', osmCuisineTag: 'japanese', osmFallbackTag: null },
    { match: ['tokyo', 'kanto'], cuisineType: 'Tokyo Japanese', description: 'The city with more Michelin stars than Paris. Edomae sushi, ramen, and izakaya culture at its absolute peak.', osmCuisineTag: 'japanese', osmFallbackTag: null },
    { match: ['kyoto'], cuisineType: 'Kyoto Japanese', description: 'Kaiseki multi-course dining and matcha everything. Kyoto food is the most refined, seasonal, and beautiful in Japan.', osmCuisineTag: 'japanese', osmFallbackTag: null },
    { match: ['hokkaido', 'sapporo'], cuisineType: 'Hokkaido Japanese', description: 'Miso ramen, fresh crab, and dairy that rivals Europe. Hokkaido is Japan\'s food frontier.', osmCuisineTag: 'japanese', osmFallbackTag: null },
    { match: ['fukuoka', 'hakata', 'kyushu'], cuisineType: 'Kyushu Japanese', description: 'Tonkotsu ramen was born here. Hakata-style pork bone broth so rich it\'s practically a meal in itself.', osmCuisineTag: 'ramen', osmFallbackTag: 'japanese' },
    { match: ['okinawa'], cuisineType: 'Okinawan Japanese', description: 'Goya champuru, soki soba, and purple sweet potatoes. Island food that helped Okinawans become the longest-living people on earth.', osmCuisineTag: 'japanese', osmFallbackTag: null },
  ],
  fr: [
    { match: ['lyon', 'rhône', 'rhone'], cuisineType: 'Lyonnaise French', description: 'The gastronomic capital of France. Bouchon bistros serving quenelles, saucisson, and more pork than you can imagine.', osmCuisineTag: 'french', osmFallbackTag: null },
    { match: ['marseille', 'provence', 'aix'], cuisineType: 'Provençal French', description: 'Bouillabaisse, ratatouille, and rosé all day. Mediterranean sunshine on every plate.', osmCuisineTag: 'french', osmFallbackTag: null },
    { match: ['paris', 'île-de-france', 'ile-de-france'], cuisineType: 'Parisian French', description: 'Croissants, steak frites, and the world\'s most obsessive pastry scene. Paris is where food became art.', osmCuisineTag: 'french', osmFallbackTag: null },
    { match: ['bordeaux', 'aquitaine'], cuisineType: 'Bordelaise French', description: 'Canelé, entrecôte bordelaise, and wine sauce on everything. Bordeaux pairs every dish with its legendary wines.', osmCuisineTag: 'french', osmFallbackTag: null },
    { match: ['normandie', 'normandy', 'rouen', 'caen'], cuisineType: 'Norman French', description: 'Camembert, apple cider, calvados, and cream-drenched everything. Normandy is France\'s dairy paradise.', osmCuisineTag: 'french', osmFallbackTag: null },
    { match: ['alsace', 'strasbourg'], cuisineType: 'Alsatian French', description: 'Tarte flambée, choucroute, and kougelhopf. Where French elegance meets German heartiness.', osmCuisineTag: 'french', osmFallbackTag: null },
    { match: ['bretagne', 'brittany', 'rennes', 'brest'], cuisineType: 'Breton French', description: 'Crêpes, galettes, and the best butter and seafood in all of France. Brittany keeps it simple and perfect.', osmCuisineTag: 'french', osmFallbackTag: null },
  ],
  es: [
    { match: ['barcelona', 'cataluña', 'catalonia', 'catalunya'], cuisineType: 'Catalan Spanish', description: 'Pa amb tomàquet, crema catalana, and some of the most innovative restaurants on earth. Catalonia does food differently.', osmCuisineTag: 'spanish', osmFallbackTag: null },
    { match: ['san sebastián', 'san sebastian', 'donostia', 'país vasco', 'basque'], cuisineType: 'Basque Spanish', description: 'Pintxos bars and the highest concentration of Michelin stars per capita on earth. Basque Country is a food religion.', osmCuisineTag: 'spanish', osmFallbackTag: null },
    { match: ['madrid'], cuisineType: 'Madrid Spanish', description: 'Cocido madrileño, bocadillo de calamares, and tapas that last until 3am. Madrid eats late and lives large.', osmCuisineTag: 'spanish', osmFallbackTag: null },
    { match: ['sevilla', 'seville', 'andalucía', 'andalusia', 'granada', 'córdoba'], cuisineType: 'Andalusian Spanish', description: 'Gazpacho, jamón ibérico, and fried fish. Andalusian food is the sun-drenched soul of Spanish cuisine.', osmCuisineTag: 'spanish', osmFallbackTag: null },
    { match: ['valencia'], cuisineType: 'Valencian Spanish', description: 'The birthplace of paella. Don\'t you dare put chorizo in it — Valencians will fight you (and they\'re right).', osmCuisineTag: 'spanish', osmFallbackTag: null },
    { match: ['galicia', 'santiago', 'vigo'], cuisineType: 'Galician Spanish', description: 'Pulpo a feira, empanada gallega, and the freshest seafood in Spain. Galicia is Spain\'s Celtic coast.', osmCuisineTag: 'spanish', osmFallbackTag: null },
  ],
  mx: [
    { match: ['oaxaca'], cuisineType: 'Oaxacan Mexican', description: 'Seven types of mole, tlayudas, and mezcal. Oaxaca is Mexico\'s undisputed culinary capital.', osmCuisineTag: 'mexican', osmFallbackTag: null },
    { match: ['yucatán', 'yucatan', 'mérida', 'merida'], cuisineType: 'Yucatecan Mexican', description: 'Cochinita pibil, papadzules, and poc chuc. Mayan-influenced flavors unlike anywhere else in Mexico.', osmCuisineTag: 'mexican', osmFallbackTag: null },
    { match: ['ciudad de méxico', 'mexico city', 'cdmx'], cuisineType: 'Mexico City Mexican', description: 'Tacos al pastor, tlacoyos, and some of the world\'s best fine dining. CDMX is a taco and tasting menu paradise.', osmCuisineTag: 'mexican', osmFallbackTag: null },
    { match: ['puebla'], cuisineType: 'Poblano Mexican', description: 'Mole poblano, chiles en nogada, and cemitas. Puebla invented Mexico\'s national dish and never stopped innovating.', osmCuisineTag: 'mexican', osmFallbackTag: null },
    { match: ['jalisco', 'guadalajara'], cuisineType: 'Jalisciense Mexican', description: 'Birria, tortas ahogadas, and tequila. Jalisco gave the world its most iconic Mexican flavors.', osmCuisineTag: 'mexican', osmFallbackTag: null },
    { match: ['baja', 'tijuana', 'ensenada'], cuisineType: 'Baja Mexican', description: 'Fish tacos, Baja-Med cuisine, and the freshest Pacific seafood. Where Mexican and Californian flavors collide.', osmCuisineTag: 'mexican', osmFallbackTag: null },
  ],
  us: [
    { match: ['louisiana', 'new orleans'], cuisineType: 'Cajun/Creole', description: 'Gumbo, jambalaya, beignets, and po\'boys. New Orleans food is America\'s most soulful cuisine.', osmCuisineTag: 'cajun', osmFallbackTag: 'american' },
    { match: ['texas', 'austin', 'houston', 'san antonio', 'dallas'], cuisineType: 'Tex-Mex / Texas BBQ', description: 'Brisket smoked for 14 hours and queso that flows like water. Texas does meat and Tex-Mex like nowhere else.', osmCuisineTag: 'bbq', osmFallbackTag: 'american' },
    { match: ['hawaii', 'honolulu', 'maui'], cuisineType: 'Hawaiian', description: 'Poke, plate lunch, spam musubi, and loco moco. Hawaiian food is a Pacific Island-Asian-American mashup.', osmCuisineTag: 'hawaiian', osmFallbackTag: 'american' },
    { match: ['new york', 'brooklyn', 'manhattan', 'queens'], cuisineType: 'New York', description: 'Pizza, bagels, pastrami sandwiches, and every cuisine on earth. NYC is the world\'s greatest food city.', osmCuisineTag: 'american', osmFallbackTag: null },
    { match: ['california', 'los angeles', 'san francisco'], cuisineType: 'Californian', description: 'Farm-to-table pioneer, fish tacos, açaí bowls, and fusion everything. California invented American food culture.', osmCuisineTag: 'american', osmFallbackTag: null },
    { match: ['carolina', 'charleston', 'memphis', 'tennessee', 'nashville', 'georgia', 'atlanta'], cuisineType: 'Southern American', description: 'BBQ, fried chicken, collard greens, and cornbread. The South is where American soul food lives and breathes.', osmCuisineTag: 'bbq', osmFallbackTag: 'american' },
    { match: ['maine', 'new england', 'massachusetts', 'boston', 'connecticut', 'vermont'], cuisineType: 'New England', description: 'Lobster rolls, clam chowder, and baked beans. New England keeps it nautical and no-nonsense.', osmCuisineTag: 'seafood', osmFallbackTag: 'american' },
  ],
  th: [
    { match: ['chiang mai', 'chiang rai', 'northern'], cuisineType: 'Northern Thai', description: 'Khao soi curry noodles and sai ua sausage. Northern Thai food is milder, herbier, and more Burmese-influenced.', osmCuisineTag: 'thai', osmFallbackTag: null },
    { match: ['isaan', 'isan', 'northeastern', 'udon', 'khon kaen'], cuisineType: 'Isaan Thai', description: 'Som tum, larb, and sticky rice. Isaan food is spicy, funky, and the backbone of Thai street food culture.', osmCuisineTag: 'thai', osmFallbackTag: null },
    { match: ['bangkok'], cuisineType: 'Bangkok Thai', description: 'Street food paradise — pad thai, boat noodles, and mango sticky rice at 2am from a cart. Bangkok never stops eating.', osmCuisineTag: 'thai', osmFallbackTag: null },
  ],
  kr: [
    { match: ['seoul'], cuisineType: 'Seoul Korean', description: 'K-BBQ, tteokbokki, and fried chicken with beer. Seoul\'s food scene is trendy, spicy, and open 24/7.', osmCuisineTag: 'korean', osmFallbackTag: null },
    { match: ['busan', 'pusan'], cuisineType: 'Busan Korean', description: 'Milmyeon cold noodles, dwaeji gukbap pork soup, and the freshest sashimi at Jagalchi Market.', osmCuisineTag: 'korean', osmFallbackTag: null },
    { match: ['jeju'], cuisineType: 'Jeju Korean', description: 'Black pork, abalone porridge, and tangerines. Jeju island food is its own delicious world.', osmCuisineTag: 'korean', osmFallbackTag: null },
  ],
}

const CUISINE_DB = {
  jp: { cuisineType: 'Japanese', description: 'From delicate sushi to rich tonkotsu ramen, Japanese cuisine is all about umami, precision, and seasonal ingredients.', osmCuisineTag: 'japanese', osmFallbackTag: null },
  cn: { cuisineType: 'Chinese', description: 'One of the world\'s oldest and most diverse food traditions — from fiery Sichuan to delicate Cantonese dim sum.', osmCuisineTag: 'chinese', osmFallbackTag: null },
  kr: { cuisineType: 'Korean', description: 'Fermented, spicy, and packed with flavor. Think kimchi, Korean BBQ, and bibimbap — bold and communal.', osmCuisineTag: 'korean', osmFallbackTag: null },
  tw: { cuisineType: 'Taiwanese', description: 'Night market magic — beef noodle soup, bubble tea, and xiao long bao that\'ll change your life.', osmCuisineTag: 'taiwanese', osmFallbackTag: 'chinese' },
  mn: { cuisineType: 'Mongolian', description: 'Hearty nomadic cuisine built around meat and dairy. Buuz dumplings and airag will fuel you across the steppe.', osmCuisineTag: 'mongolian', osmFallbackTag: 'chinese' },
  th: { cuisineType: 'Thai', description: 'The perfect balance of sweet, sour, salty, and spicy. Pad thai is just the beginning.', osmCuisineTag: 'thai', osmFallbackTag: null },
  vn: { cuisineType: 'Vietnamese', description: 'Fresh herbs, rice noodles, and complex broths. Pho is a religion and banh mi is its prophet.', osmCuisineTag: 'vietnamese', osmFallbackTag: null },
  ph: { cuisineType: 'Filipino', description: 'A wild mix of sweet, sour, and savory — adobo, sinigang, and lechon are absolute crowd-pleasers.', osmCuisineTag: 'filipino', osmFallbackTag: 'asian' },
  id: { cuisineType: 'Indonesian', description: 'Thousands of islands, thousands of flavors. Nasi goreng, rendang, and satay are just the start.', osmCuisineTag: 'indonesian', osmFallbackTag: 'asian' },
  my: { cuisineType: 'Malaysian', description: 'Where Malay, Chinese, and Indian flavors collide. Laksa and nasi lemak are national treasures.', osmCuisineTag: 'malaysian', osmFallbackTag: 'asian' },
  mm: { cuisineType: 'Burmese', description: 'An underrated gem — mohinga fish noodle soup and tea leaf salad are unlike anything else.', osmCuisineTag: 'burmese', osmFallbackTag: 'asian' },
  kh: { cuisineType: 'Cambodian', description: 'Lighter than Thai but just as complex. Fish amok in banana leaves is pure comfort food.', osmCuisineTag: 'cambodian', osmFallbackTag: 'asian' },
  la: { cuisineType: 'Laotian', description: 'Sticky rice with everything, plus larb and tam mak hoong. Simple, fresh, and absolutely delicious.', osmCuisineTag: 'laotian', osmFallbackTag: 'thai' },
  sg: { cuisineType: 'Singaporean', description: 'Hawker center heaven — chili crab, Hainanese chicken rice, and laksa in a food-obsessed city-state.', osmCuisineTag: 'singaporean', osmFallbackTag: 'asian' },
  in: { cuisineType: 'Indian', description: 'A universe of spices and regional specialties. Every state has its own culinary identity and they\'re all incredible.', osmCuisineTag: 'indian', osmFallbackTag: null },
  pk: { cuisineType: 'Pakistani', description: 'Rich, meaty, and generously spiced. Biryani, nihari, and seekh kebabs are pure comfort.', osmCuisineTag: 'pakistani', osmFallbackTag: 'indian' },
  bd: { cuisineType: 'Bangladeshi', description: 'Rice, fish, and spices form the holy trinity. Hilsa fish curry is the national obsession.', osmCuisineTag: 'bangladeshi', osmFallbackTag: 'indian' },
  lk: { cuisineType: 'Sri Lankan', description: 'Coconut-rich curries with a unique spice blend. Rice and curry with sambols is an everyday masterpiece.', osmCuisineTag: 'sri_lankan', osmFallbackTag: 'indian' },
  np: { cuisineType: 'Nepali', description: 'Dal bhat power, 24 hour! Momos and thukpa keep you warm in the Himalayas.', osmCuisineTag: 'nepali', osmFallbackTag: 'indian' },
  tr: { cuisineType: 'Turkish', description: 'Kebabs, mezes, and baklava — centuries of Ottoman culinary tradition that\'ll blow your mind.', osmCuisineTag: 'turkish', osmFallbackTag: null },
  lb: { cuisineType: 'Lebanese', description: 'The OG Mediterranean diet. Hummus, tabbouleh, and shawarma done so right it hurts.', osmCuisineTag: 'lebanese', osmFallbackTag: 'mediterranean' },
  ir: { cuisineType: 'Persian', description: 'Saffron-scented rice, tender kebabs, and stews that have been perfected over millennia.', osmCuisineTag: 'persian', osmFallbackTag: 'middle_eastern' },
  il: { cuisineType: 'Israeli', description: 'A melting pot of Middle Eastern and Mediterranean flavors. Falafel, shakshuka, and sabich are essential.', osmCuisineTag: 'israeli', osmFallbackTag: 'middle_eastern' },
  ps: { cuisineType: 'Palestinian', description: 'Musakhan, maqluba, and knafeh — rich traditions passed down through generations of home cooking.', osmCuisineTag: 'palestinian', osmFallbackTag: 'middle_eastern' },
  sa: { cuisineType: 'Saudi Arabian', description: 'Kabsa and mandi reign supreme — aromatic spiced rice with tender slow-cooked meat.', osmCuisineTag: 'arab', osmFallbackTag: 'middle_eastern' },
  ae: { cuisineType: 'Emirati', description: 'A cosmopolitan food scene built on Arabic traditions. Al machboos and luqaimat are local gems.', osmCuisineTag: 'arab', osmFallbackTag: 'middle_eastern' },
  iq: { cuisineType: 'Iraqi', description: 'Masgouf grilled fish and dolma — ancient Mesopotamian flavors that still hit different today.', osmCuisineTag: 'arab', osmFallbackTag: 'middle_eastern' },
  sy: { cuisineType: 'Syrian', description: 'Some of the world\'s most refined Arab cooking. Kibbeh and fattoush are just the start.', osmCuisineTag: 'syrian', osmFallbackTag: 'middle_eastern' },
  jo: { cuisineType: 'Jordanian', description: 'Mansaf is the king — lamb in fermented yogurt over rice. Bedouin hospitality on a plate.', osmCuisineTag: 'arab', osmFallbackTag: 'middle_eastern' },
  ye: { cuisineType: 'Yemeni', description: 'Saltah and mandi — bold, aromatic, and deeply satisfying. Yemen\'s food scene is criminally underrated.', osmCuisineTag: 'yemeni', osmFallbackTag: 'middle_eastern' },
  fr: { cuisineType: 'French', description: 'The gold standard of fine dining. But also baguettes, cheese, and croque monsieurs — equally legendary.', osmCuisineTag: 'french', osmFallbackTag: null },
  it: { cuisineType: 'Italian', description: 'Simple ingredients, perfect execution. Every region has pasta shapes you\'ve never heard of and they\'re all amazing.', osmCuisineTag: 'italian', osmFallbackTag: null },
  es: { cuisineType: 'Spanish', description: 'Tapas culture, paella, and jamón ibérico. Eating in Spain is a social event that lasts all night.', osmCuisineTag: 'spanish', osmFallbackTag: null },
  pt: { cuisineType: 'Portuguese', description: 'Bacalhau 365 ways, pastéis de nata, and grilled sardines. Small country, massive flavor.', osmCuisineTag: 'portuguese', osmFallbackTag: 'spanish' },
  de: { cuisineType: 'German', description: 'Way more than sausages and beer (though those are great). Schnitzel, spätzle, and pretzels done right.', osmCuisineTag: 'german', osmFallbackTag: null },
  gb: { cuisineType: 'British', description: 'Fish and chips, full English breakfasts, and Sunday roasts. Comfort food that punches above its reputation.', osmCuisineTag: 'british', osmFallbackTag: null },
  ie: { cuisineType: 'Irish', description: 'Hearty stews, soda bread, and the best butter in the world. Irish food warms you from the inside.', osmCuisineTag: 'irish', osmFallbackTag: 'british' },
  nl: { cuisineType: 'Dutch', description: 'Stroopwafels, bitterballen, and raw herring. Dutch snack culture is an underappreciated art form.', osmCuisineTag: 'dutch', osmFallbackTag: 'german' },
  be: { cuisineType: 'Belgian', description: 'Moules-frites, waffles, chocolate, and world-class beer. Belgium punches way above its weight.', osmCuisineTag: 'belgian', osmFallbackTag: 'french' },
  at: { cuisineType: 'Austrian', description: 'Wiener schnitzel, sachertorte, and kaffehaus culture. Vienna invented the art of eating well.', osmCuisineTag: 'austrian', osmFallbackTag: 'german' },
  ch: { cuisineType: 'Swiss', description: 'Fondue, raclette, and rösti — melted cheese is basically a food group here and we\'re not complaining.', osmCuisineTag: 'swiss', osmFallbackTag: 'german' },
  se: { cuisineType: 'Swedish', description: 'Meatballs with lingonberry, gravlax, and cinnamon buns. Fika is a lifestyle, not just a coffee break.', osmCuisineTag: 'swedish', osmFallbackTag: 'scandinavian' },
  no: { cuisineType: 'Norwegian', description: 'Fresh seafood, brunost, and fårikål. Viking fuel that\'s way more refined than you\'d expect.', osmCuisineTag: 'norwegian', osmFallbackTag: 'scandinavian' },
  dk: { cuisineType: 'Danish', description: 'Smørrebrød open-faced sandwiches elevated to an art form. Also pastries that live up to the hype.', osmCuisineTag: 'danish', osmFallbackTag: 'scandinavian' },
  fi: { cuisineType: 'Finnish', description: 'Karelian pies, salmon soup, and rye bread. Finnish food is hearty, honest, and surprisingly good.', osmCuisineTag: 'finnish', osmFallbackTag: 'scandinavian' },
  is: { cuisineType: 'Icelandic', description: 'Lamb, skyr, and fresh-caught fish in the middle of the Atlantic. Fermented shark is... an experience.', osmCuisineTag: 'icelandic', osmFallbackTag: 'scandinavian' },
  ru: { cuisineType: 'Russian', description: 'Borscht, pelmeni, and blini — hearty dishes built to survive the coldest winters on earth.', osmCuisineTag: 'russian', osmFallbackTag: null },
  pl: { cuisineType: 'Polish', description: 'Pierogi, bigos, and żurek. Polish comfort food is some of the best in Eastern Europe.', osmCuisineTag: 'polish', osmFallbackTag: 'eastern_european' },
  ua: { cuisineType: 'Ukrainian', description: 'Borscht (yes, it\'s Ukrainian), varenyky, and chicken Kyiv. Soul food from the breadbasket of Europe.', osmCuisineTag: 'ukrainian', osmFallbackTag: 'eastern_european' },
  cz: { cuisineType: 'Czech', description: 'Svíčková, trdelník, and beer that\'s somehow better and cheaper than anywhere else.', osmCuisineTag: 'czech', osmFallbackTag: 'eastern_european' },
  hu: { cuisineType: 'Hungarian', description: 'Goulash and paprika everything. Hungarian cuisine is richer and bolder than you\'d expect.', osmCuisineTag: 'hungarian', osmFallbackTag: 'eastern_european' },
  ro: { cuisineType: 'Romanian', description: 'Mămăligă, sarmale, and mici — hearty Balkan-meets-Latin flavors with generous portions.', osmCuisineTag: 'romanian', osmFallbackTag: 'eastern_european' },
  bg: { cuisineType: 'Bulgarian', description: 'Shopska salad, banitsa, and yogurt so good they named the bacteria after it.', osmCuisineTag: 'bulgarian', osmFallbackTag: 'eastern_european' },
  rs: { cuisineType: 'Serbian', description: 'Ćevapi, pljeskavica, and kajmak. Serbian grilled meats are a carnivore\'s paradise.', osmCuisineTag: 'serbian', osmFallbackTag: 'balkan' },
  hr: { cuisineType: 'Croatian', description: 'Mediterranean coast meets Central European heartland. Fresh seafood and truffle pasta along the Adriatic.', osmCuisineTag: 'croatian', osmFallbackTag: 'mediterranean' },
  ba: { cuisineType: 'Bosnian', description: 'Ćevapi in somun bread is the national dish and it\'s perfect. Burek for breakfast, burek for life.', osmCuisineTag: 'bosnian', osmFallbackTag: 'balkan' },
  gr: { cuisineType: 'Greek', description: 'Moussaka, souvlaki, and the freshest feta you\'ll ever taste. Mediterranean vibes at their peak.', osmCuisineTag: 'greek', osmFallbackTag: 'mediterranean' },
  al: { cuisineType: 'Albanian', description: 'A hidden gem where Turkish, Greek, and Italian influences create something uniquely delicious.', osmCuisineTag: 'albanian', osmFallbackTag: 'mediterranean' },
  ge: { cuisineType: 'Georgian', description: 'Khachapuri cheese bread and khinkali dumplings. Georgia might be the most underrated food country on earth.', osmCuisineTag: 'georgian', osmFallbackTag: 'eastern_european' },
  am: { cuisineType: 'Armenian', description: 'Lavash, dolma, and khorovats BBQ. Ancient flavors from one of the world\'s oldest civilizations.', osmCuisineTag: 'armenian', osmFallbackTag: 'middle_eastern' },
  ma: { cuisineType: 'Moroccan', description: 'Tagines, couscous, and mint tea. Moroccan spice blends are some of the most complex on the planet.', osmCuisineTag: 'moroccan', osmFallbackTag: 'african' },
  eg: { cuisineType: 'Egyptian', description: 'Koshari, ful medames, and shawarma. Street food culture that\'s been thriving for thousands of years.', osmCuisineTag: 'egyptian', osmFallbackTag: 'middle_eastern' },
  tn: { cuisineType: 'Tunisian', description: 'Harissa-spiced everything, brik pastry, and couscous. North Africa\'s spiciest cuisine.', osmCuisineTag: 'tunisian', osmFallbackTag: 'african' },
  dz: { cuisineType: 'Algerian', description: 'Couscous royale, mechoui, and makroud. A Mediterranean-Saharan fusion you won\'t find anywhere else.', osmCuisineTag: 'algerian', osmFallbackTag: 'african' },
  et: { cuisineType: 'Ethiopian', description: 'Injera and wat are a perfect combo — spongy sourdough flatbread scooping up spicy stews. Eat with your hands.', osmCuisineTag: 'ethiopian', osmFallbackTag: 'african' },
  ng: { cuisineType: 'Nigerian', description: 'Jollof rice wars are real and intense. Plus suya, pounded yam, and egusi soup that\'ll convert you.', osmCuisineTag: 'nigerian', osmFallbackTag: 'african' },
  gh: { cuisineType: 'Ghanaian', description: 'The other jollof rice contender. Waakye, kelewele, and banku with tilapia are absolute bangers.', osmCuisineTag: 'ghanaian', osmFallbackTag: 'african' },
  sn: { cuisineType: 'Senegalese', description: 'Thiéboudienne is the king of West African rice dishes. Yassa chicken is the queen.', osmCuisineTag: 'senegalese', osmFallbackTag: 'african' },
  ke: { cuisineType: 'Kenyan', description: 'Nyama choma and ugali — simple, satisfying, and best enjoyed with good company.', osmCuisineTag: 'kenyan', osmFallbackTag: 'african' },
  za: { cuisineType: 'South African', description: 'Braai culture, bunny chow, and biltong. A rainbow nation of flavors as diverse as its people.', osmCuisineTag: 'south_african', osmFallbackTag: 'african' },
  tz: { cuisineType: 'Tanzanian', description: 'Zanzibar spice island vibes plus mainland ugali and nyama. Indian Ocean flavors meet East Africa.', osmCuisineTag: 'tanzanian', osmFallbackTag: 'african' },
  cm: { cuisineType: 'Cameroonian', description: 'Ndolé, eru, and grilled fish — Central and West African flavors merge in delicious ways.', osmCuisineTag: 'cameroonian', osmFallbackTag: 'african' },
  us: { cuisineType: 'American', description: 'BBQ, burgers, soul food, Tex-Mex, and a million immigrant traditions mashed into something beautiful.', osmCuisineTag: 'american', osmFallbackTag: null },
  mx: { cuisineType: 'Mexican', description: 'Tacos, mole, tamales, and elote. Mexican food is UNESCO-recognized for a reason — it\'s unmatched.', osmCuisineTag: 'mexican', osmFallbackTag: null },
  ca: { cuisineType: 'Canadian', description: 'Poutine is just the gateway. Butter tarts, tourtière, and Nanaimo bars represent a surprisingly rich food scene.', osmCuisineTag: 'canadian', osmFallbackTag: 'american' },
  cu: { cuisineType: 'Cuban', description: 'Ropa vieja, Cuban sandwiches, and black beans and rice. Havana flavors that\'ll make you dance.', osmCuisineTag: 'cuban', osmFallbackTag: 'caribbean' },
  jm: { cuisineType: 'Jamaican', description: 'Jerk chicken that\'ll set your mouth on fire in the best way. Plus ackee and saltfish for breakfast.', osmCuisineTag: 'jamaican', osmFallbackTag: 'caribbean' },
  pr: { cuisineType: 'Puerto Rican', description: 'Mofongo, lechón, and arroz con gandules. Boricua food is a fiesta on every plate.', osmCuisineTag: 'puerto_rican', osmFallbackTag: 'caribbean' },
  ht: { cuisineType: 'Haitian', description: 'Griot, diri ak djon djon, and pikliz. Haitian food is bold, spicy, and criminally slept on.', osmCuisineTag: 'haitian', osmFallbackTag: 'caribbean' },
  gt: { cuisineType: 'Guatemalan', description: 'Pepián, tamales, and rellenitos. Mayan-influenced flavors with a Central American twist.', osmCuisineTag: 'guatemalan', osmFallbackTag: 'latin_american' },
  cr: { cuisineType: 'Costa Rican', description: 'Gallo pinto for breakfast, casado for lunch. Pura vida extends to the plate.', osmCuisineTag: 'costa_rican', osmFallbackTag: 'latin_american' },
  pa: { cuisineType: 'Panamanian', description: 'Sancocho, patacones, and ceviche. A crossroads of Caribbean and Latin flavors.', osmCuisineTag: 'panamanian', osmFallbackTag: 'latin_american' },
  do: { cuisineType: 'Dominican', description: 'La bandera (the flag meal) — rice, beans, and meat. Mangú with tres golpes for breakfast is heavenly.', osmCuisineTag: 'dominican', osmFallbackTag: 'caribbean' },
  tt: { cuisineType: 'Trinidadian', description: 'Doubles, roti, and callaloo. Indian and Caribbean flavors create something totally unique.', osmCuisineTag: 'trinidadian', osmFallbackTag: 'caribbean' },
  br: { cuisineType: 'Brazilian', description: 'Feijoada, churrasco, and açaí. Brazilian food is as vibrant and diverse as the country itself.', osmCuisineTag: 'brazilian', osmFallbackTag: null },
  ar: { cuisineType: 'Argentinian', description: 'Steak, empanadas, and dulce de leche. Argentina takes beef seriously and you should too.', osmCuisineTag: 'argentinian', osmFallbackTag: 'steak_house' },
  pe: { cuisineType: 'Peruvian', description: 'Ceviche, lomo saltado, and ají de gallina. Peru is having a major global food moment and it\'s deserved.', osmCuisineTag: 'peruvian', osmFallbackTag: 'latin_american' },
  co: { cuisineType: 'Colombian', description: 'Bandeja paisa, arepas, and empanadas. Colombian food is hearty, generous, and full of soul.', osmCuisineTag: 'colombian', osmFallbackTag: 'latin_american' },
  cl: { cuisineType: 'Chilean', description: 'Empanadas de pino, pastel de choclo, and the freshest seafood from the longest coastline in the world.', osmCuisineTag: 'chilean', osmFallbackTag: 'latin_american' },
  ve: { cuisineType: 'Venezuelan', description: 'Arepas are life. Stuffed with everything from black beans to shredded beef — street food perfection.', osmCuisineTag: 'venezuelan', osmFallbackTag: 'latin_american' },
  ec: { cuisineType: 'Ecuadorian', description: 'Encebollado fish soup cures all hangovers. Llapingachos and ceviche are just as essential.', osmCuisineTag: 'ecuadorian', osmFallbackTag: 'latin_american' },
  bo: { cuisineType: 'Bolivian', description: 'Salteñas, silpancho, and api morado. High-altitude comfort food that\'ll stick to your ribs.', osmCuisineTag: 'bolivian', osmFallbackTag: 'latin_american' },
  uy: { cuisineType: 'Uruguayan', description: 'Chivito sandwiches and asado BBQ. Small country, big appetite, and mate for days.', osmCuisineTag: 'uruguayan', osmFallbackTag: 'argentinian' },
  py: { cuisineType: 'Paraguayan', description: 'Chipa bread and sopa paraguaya (a savory cornbread). Simple, unique, and deeply satisfying.', osmCuisineTag: 'paraguayan', osmFallbackTag: 'latin_american' },
  au: { cuisineType: 'Australian', description: 'Meat pies, Tim Tams, and a multicultural food scene that rivals any global city. Plus vegemite, if you dare.', osmCuisineTag: 'australian', osmFallbackTag: 'british' },
  nz: { cuisineType: 'New Zealand', description: 'Hangi feast, pavlova, and some of the freshest lamb and seafood you\'ll ever taste.', osmCuisineTag: 'new_zealand', osmFallbackTag: 'australian' },
  fj: { cuisineType: 'Fijian', description: 'Kokoda (Fijian ceviche) and lovo earth oven cooking. Pacific island flavors with Indian influences.', osmCuisineTag: 'fijian', osmFallbackTag: 'pacific' },
}

const DEFAULT_CUISINE = {
  cuisineType: 'International',
  description: 'This region has a rich local food tradition we\'re still mapping. NYC\'s diverse dining scene has something for every palate — browse what\'s nearby.',
  osmCuisineTag: 'international',
  osmFallbackTag: null,
}

function findRegionalMatch(countryCode, locationInfo) {
  const overrides = REGIONAL_OVERRIDES[countryCode]
  if (!overrides) return null

  const searchText = [
    locationInfo.city,
    locationInfo.state,
    locationInfo.region,
    locationInfo.county,
    locationInfo.displayName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const override of overrides) {
    for (const keyword of override.match) {
      if (searchText.includes(keyword.toLowerCase())) {
        return override
      }
    }
  }

  return null
}

export async function classifyCuisine(locationInfo) {
  const { countryCode } = locationInfo
  const code = (countryCode || '').toLowerCase()

  // Try regional match first
  const regional = findRegionalMatch(code, locationInfo)
  if (regional) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return { ...regional }
  }

  // Fall back to country-level match
  const match = CUISINE_DB[code] || DEFAULT_CUISINE
  await new Promise((resolve) => setTimeout(resolve, 200))
  return { ...match }
}
