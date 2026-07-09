const fs = require('fs');

const PROVINCES = {
  "Gauteng": ["Johannesburg", "Pretoria", "Midrand", "Centurion", "Sandton", "Randburg", "Roodepoort", "Edenvale", "Kempton Park", "Boksburg", "Benoni", "Brakpan", "Springs", "Nigel", "Germiston", "Alberton", "Krugersdorp", "Vanderbijlpark", "Vereeniging", "Heidelberg", "Bronkhorstspruit", "Cullinan", "Soweto", "Mamelodi", "Tembisa", "Katlehong", "Vosloorus"],
  "Western Cape": ["Cape Town", "Stellenbosch", "Paarl", "Somerset West", "Strand", "Gordon's Bay", "Franschhoek", "Wellington", "Malmesbury", "Hermanus", "Caledon", "Swellendam", "Worcester", "Ceres", "Robertson", "Montagu", "Beaufort West", "Oudtshoorn", "George", "Mossel Bay", "Knysna", "Plettenberg Bay", "Bloubergstrand", "Bellville", "Durbanville", "Kuils River", "Kraaifontein", "Brackenfell"],
  "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Richards Bay", "Empangeni", "Amanzimtoti", "Umhlanga", "Ballito", "Newcastle", "Ladysmith", "Dundee", "Vryheid", "Estcourt", "Howick", "Mooi River", "Ixopo", "Harding", "Port Shepstone", "Margate", "Uvongo", "Ramsgate", "Richmond", "Greytown", "Stanger", "Mandini", "Eshowe", "Ulundi", "Pongola", "Mtunzini", "Umkomaas", "Scottburgh", "Pennington", "Hibberdene"],
  "Eastern Cape": ["Port Elizabeth", "East London", "Mthatha", "Uitenhage", "Despatch", "Kariega", "Grahamstown", "Makhanda", "Port Alfred", "Kenton-on-Sea", "Alexandria", "Kouga", "Humansdorp", "Jeffreys Bay", "St Francis Bay", "Graaff-Reinet", "Cradock", "Middelburg", "Aliwal North", "Queenstown", "Komani", "King William's Town", "Qonce", "Bhisho", "Fort Beaufort", "Alice", "Butterworth", "Dutywa"],
  "Free State": ["Bloemfontein", "Welkom", "Sasolburg", "Kroonstad", "Parys", "Bethlehem", "Ladybrand", "Ficksburg", "Harrismith", "Frankfort", "Heilbron", "Vrede", "Reitz", "Senekal", "Virginia", "Odendaalsrus", "Hennenman", "Allanridge", "Bothaville", "Viljoenskroon", "Hoopstad", "Wesselsbron", "Bultfontein", "Brandfort", "Winburg", "Excelsior", "Clocolan"],
  "Limpopo": ["Polokwane", "Mokopane", "Tzaneen", "Phalaborwa", "Louis Trichardt", "Musina", "Thohoyandou", "Giyani", "Bela-Bela", "Modimolle", "Mookgophong", "Lephalale", "Thabazimbi", "Burgersfort", "Lydenburg", "Jane Furse", "Groblersdal", "Marble Hall", "Roedtan", "Dendron", "Bochum", "Soekmekaar"],
  "Mpumalanga": ["Nelspruit", "Mbombela", "Witbank", "eMalahleni", "Middelburg", "Ermelo", "Secunda", "Standerton", "Piet Retief", "Mkhondo", "Barberton", "White River", "Hazyview", "Sabie", "Graskop", "Lydenburg", "Mashishing", "Belfast", "eMakhazeni", "Dullstroom", "Machadodorp", "Waterval Boven", "Carolina", "Hendrina", "Kriel", "Delmas", "Volksrust"],
  "North West": ["Rustenburg", "Mahikeng", "Potchefstroom", "Klerksdorp", "Brits", "Lichtenburg", "Zeerust", "Vryburg", "Christiana", "Bloemhof", "Schweizer-Reneke", "Wolmaransstad", "Makwassie", "Orkney", "Stilfontein", "Hartbeespoort", "Ventersdorp", "Coligny", "Koster", "Swartruggens", "Groot Marico", "Zeerust"],
  "Northern Cape": ["Kimberley", "Upington", "Kathu", "Kuruman", "Springbok", "De Aar", "Colesberg", "Victoria West", "Carnarvon", "Williston", "Calvinia", "Sutherland", "Fraserburg", "Prieska", "Douglas", "Barkly West", "Warrenton", "Jan Kempdorp", "Hartswater", "Postmasburg", "Daniëlskuil", "Pofadder", "Port Nolloth", "Alexander Bay", "Kakamas", "Keimoes", "Groblershoop"]
};

let output = `export interface Province {
  name: string;
  slug: string;
  towns: string[];
}

export const SA_PROVINCES: Province[] = [\n`;

Object.entries(PROVINCES).forEach(([province, towns]) => {
  const slug = province.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  output += `  {
    name: "${province}",
    slug: "${slug}",
    towns: ${JSON.stringify(towns)}
  },\n`;
});

output += `];\n\n`;

output += `export const ALL_TOWNS = SA_PROVINCES.flatMap(p => p.towns);\n`;
output += `export const ALL_LOCATIONS = [...SA_PROVINCES.map(p => p.slug), ...SA_PROVINCES.flatMap(p => p.towns.map(t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-')))];\n`;

fs.writeFileSync('./lib/locations.ts', output);
console.log('Locations data generated.');
