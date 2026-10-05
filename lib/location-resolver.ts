import { 
  SA_PROVINCES,
  TOWN_POSTAL_CODES,
  KZN_SUBURBS,
  GAUTENG_SUBURBS,
  WESTERN_CAPE_SUBURBS,
  EASTERN_CAPE_SUBURBS,
  FREE_STATE_SUBURBS,
  LIMPOPO_SUBURBS,
  MPUMALANGA_SUBURBS,
  NORTH_WEST_SUBURBS,
  NORTHERN_CAPE_SUBURBS,
  ALL_SUBURB_MAPS
} from './locations';

export interface LocationMatchResult {
  isLocation: boolean;
  isMapped: boolean;
  type?: 'suburb' | 'town' | 'city' | 'province' | 'postal_code';
  name?: string;
  suburb?: string;
  town?: string;
  city?: string;
  province?: string;
  provinceSlug?: string;
  postalCode?: string;
  query: string;
}

// Extended registry of additional South African towns, municipalities, and postal codes
export const EXTENDED_SA_PLACES: Record<string, { town: string; province: string; provinceSlug: string; postalCode: string; suburbs?: string[] }> = {
  // KwaZulu-Natal Northern & Rural Regions
  "jozini": { town: "Jozini", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3969", suburbs: ["Jozini Central", "Ubombo", "Ingwavuma", "Bhambanana", "Mkuze Game Reserve"] },
  "mkuze": { town: "Mkuze", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3965", suburbs: ["Mkuze Town", "Ghost Mountain"] },
  "pongola": { town: "Pongola", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3170", suburbs: ["Pongola Central", "Ncotshene"] },
  "ulundi": { town: "Ulundi", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3838", suburbs: ["Ulundi Unit A", "Ulundi Unit B", "Ulundi Unit C"] },
  "nongoma": { town: "Nongoma", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3950" },
  "hlabisa": { town: "Hlabisa", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3937" },
  "mtubatuba": { town: "Mtubatuba", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3935", suburbs: ["Mtubatuba Central", "Nordale", "KwaMsane"] },
  "hluhluwe": { town: "Hluhluwe", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3960" },
  "st lucia": { town: "St Lucia", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3936" },
  "ubombo": { town: "Ubombo", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3970" },
  "ingwavuma": { town: "Ingwavuma", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3968" },
  "bhambanana": { town: "Bhambanana", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3969" },
  "ndumo": { town: "Ndumo", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3968" },
  "kwangwanase": { town: "Kwangwanase (Manguzi)", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3973" },
  "manguzi": { town: "Manguzi (Kwangwanase)", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3973" },
  "kosi bay": { town: "Kosi Bay", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3973" },
  "sodwana bay": { town: "Sodwana Bay", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3974" },
  "paulpietersburg": { town: "Paulpietersburg", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3180" },
  "vryheid": { town: "Vryheid", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3100", suburbs: ["Vryheid Central", "Lakeside", "Bhekuzulu"] },
  "dundee": { town: "Dundee", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3000", suburbs: ["Dundee Central", "Sibongile"] },
  "glencoe": { town: "Glencoe", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "2930" },
  "estcourt": { town: "Estcourt", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3310", suburbs: ["Estcourt Central", "Forderville", "Wembezi"] },
  "greytown": { town: "Greytown", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3250" },
  "ixopo": { town: "Ixopo", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3276" },
  "underberg": { town: "Underberg", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3257" },
  "kokstad": { town: "Kokstad", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4700", suburbs: ["Kokstad Central", "Horseshoe"] },
  "port edward": { town: "Port Edward", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4295" },
  "southbroom": { town: "Southbroom", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4277" },
  "hibberdene": { town: "Hibberdene", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4220" },
  "scottburgh": { town: "Scottburgh", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4180" },
  "pennington": { town: "Pennington", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4184" },
  "richmond": { town: "Richmond", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3780" },
  "mooi river": { town: "Mooi River", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3300" },
  "howick": { town: "Howick", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3290", suburbs: ["Howick West", "Merrivale", "Midmar"] },
  "mandeni": { town: "Mandeni", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4490" },
  "sundumbili": { town: "Sundumbili", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "4491" },
  "gingindlovu": { town: "Gingindlovu", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3800" },
  "eshowe": { town: "Eshowe", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3815" },
  "melmoth": { town: "Melmoth", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3835" },
  "nkandla": { town: "Nkandla", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3855" },
  "babanango": { town: "Babanango", province: "KwaZulu-Natal", provinceSlug: "kwazulu-natal", postalCode: "3850" },

  // Limpopo
  "giyani": { town: "Giyani", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0826", suburbs: ["Giyani Section A", "Giyani Section B", "Giyani Section D", "Giyani Section E", "Giyani Section F"] },
  "musina": { town: "Musina (Messina)", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0900", suburbs: ["Musina Central", "Nancefield"] },
  "thohoyandou": { town: "Thohoyandou", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0950", suburbs: ["Thohoyandou Block F", "Thohoyandou Block J", "Maniini", "Shayandima"] },
  "tzaneen": { town: "Tzaneen", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0850", suburbs: ["Tzaneen Central", "Aqua Park", "Mediapark", "Arboretum", "Flora Park"] },
  "phalaborwa": { town: "Phalaborwa", province: "Limpopo", provinceSlug: "limpopo", postalCode: "1390", suburbs: ["Phalaborwa Central", "Namakgale", "Lulekani"] },
  "bela-bela": { town: "Bela-Bela (Warmbaths)", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0480" },
  "modimolle": { town: "Modimolle (Nylstroom)", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0510" },
  "mokopane": { town: "Mokopane (Potgietersrus)", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0600", suburbs: ["Mokopane Central", "Chroompark", "Akasia", "Mahwelereng"] },
  "lephalale": { town: "Lephalale (Ellisras)", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0555", suburbs: ["Onverwacht", "Lephalale Central", "Marapong"] },
  "makhado": { town: "Makhado (Louis Trichardt)", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0920", suburbs: ["Louis Trichardt Central", "Eltivillas", "Tshikota"] },
  "burgersfort": { town: "Burgersfort", province: "Limpopo", provinceSlug: "limpopo", postalCode: "1150" },
  "steelpoort": { town: "Steelpoort", province: "Limpopo", provinceSlug: "limpopo", postalCode: "1133" },
  "jane furse": { town: "Jane Furse", province: "Limpopo", provinceSlug: "limpopo", postalCode: "1085" },
  "seshego": { town: "Seshego", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0742" },
  "mankweng": { town: "Mankweng", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0727" },
  "lebowa": { town: "Lebowakgomo", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0737" },
  "lebowakgomo": { town: "Lebowakgomo", province: "Limpopo", provinceSlug: "limpopo", postalCode: "0737" },

  // Mpumalanga
  "secunda": { town: "Secunda", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2302" },
  "standerton": { town: "Standerton", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2430" },
  "bethal": { town: "Bethal", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2310" },
  "ermelo": { town: "Ermelo", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2350" },
  "piet retief": { town: "Piet Retief (eMkhondo)", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2380" },
  "emkhondo": { town: "eMkhondo (Piet Retief)", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2380" },
  "barberton": { town: "Barberton", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1300" },
  "hazyview": { town: "Hazyview", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1242" },
  "malelane": { town: "Malelane", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1320" },
  "komatipoort": { town: "Komatipoort", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1340" },
  "sabie": { town: "Sabie", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1260" },
  "lydenburg": { town: "Lydenburg (Mashishing)", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1120" },
  "mashishing": { town: "Mashishing (Lydenburg)", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1120" },
  "bushbuckridge": { town: "Bushbuckridge", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1280" },
  "kanyamazane": { town: "KaNyamazane", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1214" },
  "matsulu": { town: "Matsulu", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1203" },
  "delmas": { town: "Delmas", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2210" },
  "kinross": { town: "Kinross", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2270" },
  "trichardt": { town: "Trichardt", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2300" },
  "evander": { town: "Evander", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2280" },
  "belfast": { town: "Belfast (eMakhazeni)", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1100" },
  "carolina": { town: "Carolina", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "1185" },
  "volksrust": { town: "Volksrust", province: "Mpumalanga", provinceSlug: "mpumalanga", postalCode: "2470" },

  // Eastern Cape
  "mthatha": { town: "Mthatha (Umtata)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "5099", suburbs: ["Mthatha Central", "Norwood", "Fort Gale", "Southernwood", "Ncambedlana"] },
  "umtata": { town: "Umtata (Mthatha)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "5099" },
  "butterworth": { town: "Butterworth (Gcuwa)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "4960" },
  "queenstown": { town: "Queenstown (Komani)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "5320" },
  "komani": { town: "Komani (Queenstown)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "5320" },
  "grahamstown": { town: "Makhanda (Grahamstown)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "6139" },
  "makhanda": { town: "Makhanda (Grahamstown)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "6139" },
  "port alfred": { town: "Port Alfred", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "6170" },
  "jeffreys bay": { town: "Jeffreys Bay", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "6330", suburbs: ["Wavecrest", "Aston Bay", "Paradise Beach", "C-Place"] },
  "st francis bay": { town: "St Francis Bay", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "6312", suburbs: ["St Francis Canals", "Cape St Francis", "Port St Francis"] },
  "cape st francis": { town: "Cape St Francis", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "6312" },
  "cradock": { town: "Cradock", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "5880" },
  "graaff-reinet": { town: "Graaff-Reinet", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "6280" },
  "aliwal north": { town: "Aliwal North (Maletswai)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "9750" },
  "matatiele": { town: "Matatiele", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "4730" },
  "bizana": { town: "Bizana (Winnie Madikizela-Mandela)", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "4800" },
  "lusikisiki": { town: "Lusikisiki", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "4820" },
  "port st johns": { town: "Port St Johns", province: "Eastern Cape", provinceSlug: "eastern-cape", postalCode: "5120" },

  // Free State
  "sasolburg": { town: "Sasolburg", province: "Free State", provinceSlug: "free-state", postalCode: "1947", suburbs: ["Sasolburg Central", "Zamdela", "Vaapark"] },
  "parys": { town: "Parys", province: "Free State", provinceSlug: "free-state", postalCode: "9585" },
  "kroonstad": { town: "Kroonstad", province: "Free State", provinceSlug: "free-state", postalCode: "9499", suburbs: ["Kroonstad Central", "Maokeng", "Suidrand"] },
  "bethlehem": { town: "Bethlehem", province: "Free State", provinceSlug: "free-state", postalCode: "9700", suburbs: ["Bethlehem Central", "Bohlokong", "Eureka"] },
  "harrismith": { town: "Harrismith", province: "Free State", provinceSlug: "free-state", postalCode: "9880" },
  "phuthaditjhaba": { town: "Phuthaditjhaba (QwaQwa)", province: "Free State", provinceSlug: "free-state", postalCode: "9866" },
  "qwaqwa": { town: "Phuthaditjhaba (QwaQwa)", province: "Free State", provinceSlug: "free-state", postalCode: "9866" },
  "clarens": { town: "Clarens", province: "Free State", provinceSlug: "free-state", postalCode: "9707" },
  "fiksbrug": { town: "Ficksburg", province: "Free State", provinceSlug: "free-state", postalCode: "9730" },
  "ficksburg": { town: "Ficksburg", province: "Free State", provinceSlug: "free-state", postalCode: "9730" },
  "ladybrand": { town: "Ladybrand", province: "Free State", provinceSlug: "free-state", postalCode: "9745" },
  "virginia": { town: "Virginia", province: "Free State", provinceSlug: "free-state", postalCode: "9430" },
  "odendaalsrus": { town: "Odendaalsrus", province: "Free State", provinceSlug: "free-state", postalCode: "9480" },
  "allanridge": { town: "Allanridge", province: "Free State", provinceSlug: "free-state", postalCode: "9490" },
  "bothaville": { town: "Bothaville", province: "Free State", provinceSlug: "free-state", postalCode: "9660" },
  "viljoenskroon": { town: "Viljoenskroon", province: "Free State", provinceSlug: "free-state", postalCode: "9520" },
  "frankfort": { town: "Frankfort", province: "Free State", provinceSlug: "free-state", postalCode: "9830" },

  // North West
  "brits": { town: "Brits", province: "North West", provinceSlug: "north-west", postalCode: "0250", suburbs: ["Brits Central", "Primindi", "Elandsrand", "Oukasie"] },
  "hartbeespoort": { town: "Hartbeespoort", province: "North West", provinceSlug: "north-west", postalCode: "0216", suburbs: ["Ifafi", "Melodie", "Schoemansville", "Pecanwood", "Kosmos", "Meerhof"] },
  "mahikeng": { town: "Mahikeng (Mafikeng)", province: "North West", provinceSlug: "north-west", postalCode: "2745", suburbs: ["Mafikeng Central", "Mmabatho", "Riviera", "Montshiwa"] },
  "mafikeng": { town: "Mahikeng (Mafikeng)", province: "North West", provinceSlug: "north-west", postalCode: "2745" },
  "mmabatho": { town: "Mmabatho", province: "North West", provinceSlug: "north-west", postalCode: "2735" },
  "klerksdorp": { town: "Klerksdorp", province: "North West", provinceSlug: "north-west", postalCode: "2571", suburbs: ["Wilkoppies", "Flamwood", "Irene Park", "Meiringspark", "Jouberton"] },
  "potchefstroom": { town: "Potchefstroom", province: "North West", provinceSlug: "north-west", postalCode: "2531", suburbs: ["Bult", "Baillie Park", "Grimbeekpark", "Miederpark", "Ikageng", "Van Der Hoffpark"] },
  "orkney": { town: "Orkney", province: "North West", provinceSlug: "north-west", postalCode: "2619" },
  "stilfontein": { town: "Stilfontein", province: "North West", provinceSlug: "north-west", postalCode: "2551" },
  "lichtenburg": { town: "Lichtenburg", province: "North West", provinceSlug: "north-west", postalCode: "2740" },
  "vryburg": { town: "Vryburg", province: "North West", provinceSlug: "north-west", postalCode: "8600", suburbs: ["Vryburg Central", "Huhudi", "Colridge"] },
  "zeerust": { town: "Zeerust", province: "North West", provinceSlug: "north-west", postalCode: "2865" },
  "taung": { town: "Taung", province: "North West", provinceSlug: "north-west", postalCode: "8584" },
  "schweizer-reneke": { town: "Schweizer-Reneke", province: "North West", provinceSlug: "north-west", postalCode: "2780" },
  "wolmaransstad": { town: "Wolmaransstad", province: "North West", provinceSlug: "north-west", postalCode: "2630" },

  // Northern Cape
  "upington": { town: "Upington", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8801", suburbs: ["Upington Central", "Keidebees", "Middelpos", "Paballelo"] },
  "springbok": { town: "Springbok", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8240" },
  "kuruman": { town: "Kuruman", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8460", suburbs: ["Kuruman Central", "Mothibistad", "Wrenchville"] },
  "kathu": { town: "Kathu", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8446" },
  "de aar": { town: "De Aar", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "7000" },
  "colesberg": { town: "Colesberg", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "9795" },
  "postmasburg": { town: "Postmasburg", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8420" },
  "calvinia": { town: "Calvinia", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8190" },
  "carnarvon": { town: "Carnarvon", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8925" },
  "sutherland": { town: "Sutherland", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "6920" },
  "port nolloth": { town: "Port Nolloth", province: "Northern Cape", provinceSlug: "northern-cape", postalCode: "8280" },

  // Western Cape Overberg & Garden Route & Winelands
  "mossel bay": { town: "Mossel Bay", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6500", suburbs: ["Mossel Bay Central", "Diaz Beach", "Hartenbos", "Dana Bay", "Da Nova"] },
  "knysna": { town: "Knysna", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6571", suburbs: ["Knysna Central", "Heads", "Leisure Isle", "Thesen Island", "Hunters Home"] },
  "plettenberg bay": { town: "Plettenberg Bay", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6600", suburbs: ["Plett Central", "Robberg", "Lookout Beach", "Keurboomstrand", "Goose Valley"] },
  "george": { town: "George", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6529", suburbs: ["George Central", "Heatherlands", "Fancourt", "Deneo", "Wilderness", "Victoria Bay"] },
  "wilderness": { town: "Wilderness", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6560" },
  "hermanus": { town: "Hermanus", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7200", suburbs: ["Hermanus Central", "Voëlklip", "Westcliff", "Eastcliff", "Sandbaai", "Onrus"] },
  "stellenbosch": { town: "Stellenbosch", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7600", suburbs: ["Stellenbosch Central", "Die Boord", "Paradyskloof", "Dalsig", "Kayamandi", "Idas Valley"] },
  "paarl": { town: "Paarl", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7646", suburbs: ["Paarl Central", "Lemoenkloof", "Courtrai", "Northern Paarl", "Mbekweni"] },
  "franschhoek": { town: "Franschhoek", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7690" },
  "somerset west": { town: "Somerset West", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7130", suburbs: ["Heldervue", "Audas Estate", "Spanish Farm", "Helderberg Estate", "Rome Glen"] },
  "strand": { town: "Strand", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7140" },
  "gordons bay": { town: "Gordon's Bay", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7140" },
  "worcester": { town: "Worcester", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6850" },
  "robertson": { town: "Robertson", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6705" },
  "montagu": { town: "Montagu", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6720" },
  "swelledam": { town: "Swellendam", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6740" },
  "swellendam": { town: "Swellendam", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6740" },
  "oudtshoorn": { town: "Oudtshoorn", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6625" },
  "beaufort west": { town: "Beaufort West", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6970" },
  "langebaan": { town: "Langebaan", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7357" },
  "saldanha": { town: "Saldanha", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7395" },
  "vredenburg": { town: "Vredenburg", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7380" },
  "paternoster": { town: "Paternoster", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7381" },
  "malmesbury": { town: "Malmesbury", province: "Western Cape", provinceSlug: "western-cape", postalCode: "7300" },
  "ceres": { town: "Ceres", province: "Western Cape", provinceSlug: "western-cape", postalCode: "6835" },
};

// Pre-built O(1) Lookup Indexes for instant sub-millisecond location resolution
interface IndexedSuburbEntry {
  suburb: string;
  town: string;
  province: string;
  provinceSlug: string;
  postalCode: string;
}

interface IndexedTownEntry {
  town: string;
  province: string;
  provinceSlug: string;
  postalCode: string;
}

const FAST_PROVINCE_MAP = new Map<string, { name: string; slug: string }>();
const FAST_TOWN_MAP = new Map<string, IndexedTownEntry>();
const FAST_SUBURB_MAP = new Map<string, IndexedSuburbEntry>();
const FAST_POSTAL_MAP = new Map<string, IndexedSuburbEntry>();
const RESULT_LRU_CACHE = new Map<string, LocationMatchResult>();

(function buildFastLocationLookupMaps() {
  for (const prov of SA_PROVINCES) {
    if (prov.slug !== 'national') {
      FAST_PROVINCE_MAP.set(prov.slug.toLowerCase(), { name: prov.name, slug: prov.slug });
      FAST_PROVINCE_MAP.set(prov.name.toLowerCase(), { name: prov.name, slug: prov.slug });
    }
    for (const tName of prov.towns) {
      const tLower = tName.toLowerCase().trim();
      if (tLower === 'all locations') continue;
      const pCode = (TOWN_POSTAL_CODES as Record<string, string>)[tName] || (EXTENDED_SA_PLACES[tLower]?.postalCode) || '';
      if (!FAST_TOWN_MAP.has(tLower)) {
        FAST_TOWN_MAP.set(tLower, {
          town: tName,
          province: prov.name,
          provinceSlug: prov.slug,
          postalCode: pCode
        });
      }
      if (pCode && !FAST_POSTAL_MAP.has(pCode)) {
        FAST_POSTAL_MAP.set(pCode, {
          suburb: '',
          town: tName,
          province: prov.name,
          provinceSlug: prov.slug,
          postalCode: pCode
        });
      }
    }
  }

  for (const [key, ext] of Object.entries(EXTENDED_SA_PLACES)) {
    const kLower = key.toLowerCase().trim();
    const tEntry: IndexedTownEntry = {
      town: ext.town,
      province: ext.province,
      provinceSlug: ext.provinceSlug,
      postalCode: ext.postalCode
    };
    FAST_TOWN_MAP.set(kLower, tEntry);
    FAST_TOWN_MAP.set(ext.town.toLowerCase().trim(), tEntry);
    if (ext.postalCode && !FAST_POSTAL_MAP.has(ext.postalCode)) {
      FAST_POSTAL_MAP.set(ext.postalCode, {
        suburb: '',
        town: ext.town,
        province: ext.province,
        provinceSlug: ext.provinceSlug,
        postalCode: ext.postalCode
      });
    }
    if (ext.suburbs) {
      for (const s of ext.suburbs) {
        const sLower = s.toLowerCase().trim();
        if (!FAST_SUBURB_MAP.has(sLower)) {
          FAST_SUBURB_MAP.set(sLower, {
            suburb: s,
            town: ext.town,
            province: ext.province,
            provinceSlug: ext.provinceSlug,
            postalCode: ext.postalCode
          });
        }
      }
    }
  }

  const allSubMaps = [
    { slug: 'kwazulu-natal', name: 'KwaZulu-Natal', map: KZN_SUBURBS },
    { slug: 'gauteng', name: 'Gauteng', map: GAUTENG_SUBURBS },
    { slug: 'western-cape', name: 'Western Cape', map: WESTERN_CAPE_SUBURBS },
    { slug: 'eastern-cape', name: 'Eastern Cape', map: EASTERN_CAPE_SUBURBS },
    { slug: 'free-state', name: 'Free State', map: FREE_STATE_SUBURBS },
    { slug: 'limpopo', name: 'Limpopo', map: LIMPOPO_SUBURBS },
    { slug: 'mpumalanga', name: 'Mpumalanga', map: MPUMALANGA_SUBURBS },
    { slug: 'north-west', name: 'North West', map: NORTH_WEST_SUBURBS },
    { slug: 'northern-cape', name: 'Northern Cape', map: NORTHERN_CAPE_SUBURBS }
  ];

  for (const entry of allSubMaps) {
    for (const [townName, suburbsList] of Object.entries(entry.map)) {
      const tLower = townName.toLowerCase().trim();
      const tPostal = (TOWN_POSTAL_CODES as Record<string, string>)[townName] || suburbsList[0]?.postalCode || '';
      if (!FAST_TOWN_MAP.has(tLower)) {
        FAST_TOWN_MAP.set(tLower, {
          town: townName,
          province: entry.name,
          provinceSlug: entry.slug,
          postalCode: tPostal
        });
      }
      for (const sub of suburbsList) {
        const sLower = sub.name.toLowerCase().trim();
        if (!FAST_SUBURB_MAP.has(sLower)) {
          FAST_SUBURB_MAP.set(sLower, {
            suburb: sub.name,
            town: townName,
            province: entry.name,
            provinceSlug: entry.slug,
            postalCode: sub.postalCode
          });
        }
        if (sub.postalCode && !FAST_POSTAL_MAP.has(sub.postalCode)) {
          FAST_POSTAL_MAP.set(sub.postalCode, {
            suburb: sub.name,
            town: townName,
            province: entry.name,
            provinceSlug: entry.slug,
            postalCode: sub.postalCode
          });
        }
      }
    }
  }
})();

/**
 * Finds location metadata (Province, City/Town, Suburb, Postal Code) for any query, keyword or explicit location in O(1).
 */
export function resolveLocationDetails(options: {
  query?: string;
  province?: string;
  town?: string;
  suburb?: string;
}): LocationMatchResult {
  const { query = '', province = '', town = '', suburb = '' } = options;
  const cacheKey = `${province}|${town}|${suburb}|${query}`.toLowerCase();
  const cached = RESULT_LRU_CACHE.get(cacheKey);
  if (cached) return cached;

  const rawQ = query.trim();
  const lowerQ = rawQ.toLowerCase().replace(/['"`]/g, '').trim();

  const cacheAndReturn = (res: LocationMatchResult): LocationMatchResult => {
    if (RESULT_LRU_CACHE.size > 5000) RESULT_LRU_CACHE.clear();
    RESULT_LRU_CACHE.set(cacheKey, res);
    return res;
  };

  // 1. Check if user provided explicit structured fields (suburb, town, province)
  if (suburb || town || province) {
    let matchedProvName = "";
    let matchedProvSlug = province.toLowerCase().trim();
    let matchedTown = town.trim();
    let matchedSub = suburb.trim();
    let matchedPostalCode = "";

    const provObj = FAST_PROVINCE_MAP.get(matchedProvSlug);
    if (provObj) {
      matchedProvName = provObj.name;
      matchedProvSlug = provObj.slug;
    }

    if (matchedSub) {
      const subHit = FAST_SUBURB_MAP.get(matchedSub.toLowerCase());
      if (subHit) {
        matchedPostalCode = subHit.postalCode;
        if (!matchedTown) matchedTown = subHit.town;
        if (!matchedProvName) {
          matchedProvName = subHit.province;
          matchedProvSlug = subHit.provinceSlug;
        }
      }
    }

    if (matchedTown) {
      const townHit = FAST_TOWN_MAP.get(matchedTown.toLowerCase());
      if (townHit) {
        if (!matchedPostalCode) matchedPostalCode = townHit.postalCode;
        if (!matchedProvName) {
          matchedProvName = townHit.province;
          matchedProvSlug = townHit.provinceSlug;
        }
      }
    }

    if (matchedProvName || matchedTown || matchedSub) {
      return cacheAndReturn({
        isLocation: true,
        isMapped: true,
        type: matchedSub ? 'suburb' : matchedTown ? 'town' : 'province',
        name: matchedSub || matchedTown || matchedProvName,
        suburb: matchedSub || undefined,
        town: matchedTown || undefined,
        city: matchedTown || undefined,
        province: matchedProvName || (matchedProvSlug ? matchedProvSlug.toUpperCase() : undefined),
        provinceSlug: matchedProvSlug || undefined,
        postalCode: matchedPostalCode || undefined,
        query: rawQ || [matchedSub, matchedTown, matchedProvName].filter(Boolean).join(', ')
      });
    }
  }

  if (!lowerQ) {
    return cacheAndReturn({
      isLocation: false,
      isMapped: false,
      query: ''
    });
  }

  // 2. Check 4-digit South African Postal Code search in O(1)
  if (/^\d{4}$/.test(lowerQ)) {
    const postalHit = FAST_POSTAL_MAP.get(lowerQ);
    if (postalHit) {
      return cacheAndReturn({
        isLocation: true,
        isMapped: true,
        type: 'postal_code',
        name: postalHit.suburb ? `${postalHit.suburb}, ${postalHit.town} (${lowerQ})` : `${postalHit.town} (${lowerQ})`,
        suburb: postalHit.suburb || undefined,
        town: postalHit.town,
        city: postalHit.town,
        province: postalHit.province,
        provinceSlug: postalHit.provinceSlug,
        postalCode: lowerQ,
        query: rawQ
      });
    }
  }

  // 3. O(1) Exact Province Match
  const provHit = FAST_PROVINCE_MAP.get(lowerQ);
  if (provHit) {
    return cacheAndReturn({
      isLocation: true,
      isMapped: true,
      type: 'province',
      name: provHit.name,
      province: provHit.name,
      provinceSlug: provHit.slug,
      postalCode: 'Province-wide',
      query: rawQ
    });
  }

  // 4. O(1) Exact Town Match
  const townHit = FAST_TOWN_MAP.get(lowerQ);
  if (townHit) {
    return cacheAndReturn({
      isLocation: true,
      isMapped: true,
      type: 'town',
      name: townHit.town,
      town: townHit.town,
      city: townHit.town,
      province: townHit.province,
      provinceSlug: townHit.provinceSlug,
      postalCode: townHit.postalCode || undefined,
      query: rawQ
    });
  }

  // 5. O(1) Exact Suburb Match
  const subHit = FAST_SUBURB_MAP.get(lowerQ);
  if (subHit) {
    return cacheAndReturn({
      isLocation: true,
      isMapped: true,
      type: 'suburb',
      name: subHit.suburb,
      suburb: subHit.suburb,
      town: subHit.town,
      city: subHit.town,
      province: subHit.province,
      provinceSlug: subHit.provinceSlug,
      postalCode: subHit.postalCode,
      query: rawQ
    });
  }

  // 6. Fast token/comma fallback for multi-part queries (e.g. "12 Main Rd, Sandton, Johannesburg")
  if (lowerQ.includes(',')) {
    const parts = lowerQ.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const sMatch = FAST_SUBURB_MAP.get(part);
      if (sMatch) {
        return cacheAndReturn({
          isLocation: true,
          isMapped: true,
          type: 'suburb',
          name: sMatch.suburb,
          suburb: sMatch.suburb,
          town: sMatch.town,
          city: sMatch.town,
          province: sMatch.province,
          provinceSlug: sMatch.provinceSlug,
          postalCode: sMatch.postalCode,
          query: rawQ
        });
      }
      const tMatch = FAST_TOWN_MAP.get(part);
      if (tMatch) {
        return cacheAndReturn({
          isLocation: true,
          isMapped: true,
          type: 'town',
          name: tMatch.town,
          town: tMatch.town,
          city: tMatch.town,
          province: tMatch.province,
          provinceSlug: tMatch.provinceSlug,
          postalCode: tMatch.postalCode || undefined,
          query: rawQ
        });
      }
    }
  }

  // 7. Not in list of places mapped
  return cacheAndReturn({
    isLocation: false,
    isMapped: false,
    query: rawQ
  });
}
