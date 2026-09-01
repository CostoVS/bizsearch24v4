// South African Location, Town, and Area Code Detector

export function detectProvinceFromCoordinates(lat: number, lng: number): string | null {
  // KwaZulu-Natal: Approx Lat -31.1 to -26.8, Lng 28.8 to 33.0
  if (lat >= -31.2 && lat <= -26.8 && lng >= 28.8 && lng <= 33.0) {
    return "kwazulu-natal";
  }
  // Western Cape: Approx Lat -34.9 to -30.4, Lng 17.5 to 24.3
  if (lat >= -34.9 && lat <= -30.4 && lng >= 17.5 && lng <= 24.3) {
    return "western-cape";
  }
  // Gauteng: Approx Lat -26.9 to -25.2, Lng 27.2 to 29.0
  if (lat >= -26.9 && lat <= -25.2 && lng >= 27.2 && lng <= 29.0) {
    return "gauteng";
  }
  // Eastern Cape: Approx Lat -34.3 to -30.0, Lng 23.5 to 30.2
  if (lat >= -34.3 && lat <= -30.0 && lng >= 23.5 && lng <= 30.2) {
    return "eastern-cape";
  }
  // Limpopo: Approx Lat -25.5 to -22.1, Lng 26.5 to 32.0
  if (lat >= -25.5 && lat <= -22.1 && lng >= 26.5 && lng <= 32.0) {
    return "limpopo";
  }
  // Mpumalanga: Approx Lat -27.5 to -24.5, Lng 28.5 to 32.2
  if (lat >= -27.5 && lat <= -24.5 && lng >= 28.5 && lng <= 32.2) {
    return "mpumalanga";
  }
  // Free State: Approx Lat -30.8 to -26.5, Lng 24.3 to 29.9
  if (lat >= -30.8 && lat <= -26.5 && lng >= 24.3 && lng <= 29.9) {
    return "free-state";
  }
  // North West: Approx Lat -28.2 to -24.6, Lng 22.5 to 28.5
  if (lat >= -28.2 && lat <= -24.6 && lng >= 22.5 && lng <= 28.5) {
    return "north-west";
  }
  // Northern Cape: Approx Lat -32.9 to -24.7, Lng 16.4 to 25.5
  if (lat >= -32.9 && lat <= -24.7 && lng >= 16.4 && lng <= 25.5) {
    return "northern-cape";
  }
  return null;
}

export function detectLocationFromPhoneAndText(
  phone: string,
  text: string,
  defaultProvince = "gauteng",
  coords?: { lat: number; lng: number }
): { province: string; city: string } {
  const t = (text || "").toLowerCase();
  const cleanPhone = (phone || "").replace(/[^0-9]/g, '');

  // 0. GPS Coordinates Check (if available)
  if (coords && coords.lat && coords.lng) {
    const geoProv = detectProvinceFromCoordinates(coords.lat, coords.lng);
    if (geoProv) {
      // Find town in text if any, or pick appropriate default city for province
      if (geoProv === "kwazulu-natal") {
        if (t.includes("umzinto")) return { province: "kwazulu-natal", city: "Umzinto" };
        if (t.includes("isipingo")) return { province: "kwazulu-natal", city: "Isipingo" };
        if (t.includes("pinetown")) return { province: "kwazulu-natal", city: "Pinetown" };
        if (t.includes("scottburgh")) return { province: "kwazulu-natal", city: "Scottburgh" };
        if (t.includes("pietermaritzburg")) return { province: "kwazulu-natal", city: "Pietermaritzburg" };
        if (t.includes("ballito")) return { province: "kwazulu-natal", city: "Ballito" };
        if (coords.lat < -30.1) return { province: "kwazulu-natal", city: "Umzinto" };
        return { province: "kwazulu-natal", city: "Durban" };
      }
      if (geoProv === "western-cape") {
        if (t.includes("stellenbosch")) return { province: "western-cape", city: "Stellenbosch" };
        if (t.includes("george")) return { province: "western-cape", city: "George" };
        if (t.includes("paarl")) return { province: "western-cape", city: "Paarl" };
        return { province: "western-cape", city: "Cape Town" };
      }
      if (geoProv === "eastern-cape") {
        if (t.includes("east london")) return { province: "eastern-cape", city: "East London" };
        return { province: "eastern-cape", city: "Gqeberha" };
      }
      if (geoProv === "gauteng") {
        if (t.includes("pretoria") || t.includes("centurion")) return { province: "gauteng", city: "Pretoria" };
        return { province: "gauteng", city: "Johannesburg" };
      }
      if (geoProv === "free-state") return { province: "free-state", city: "Bloemfontein" };
      if (geoProv === "limpopo") return { province: "limpopo", city: "Polokwane" };
      if (geoProv === "mpumalanga") return { province: "mpumalanga", city: "Mbombela" };
      if (geoProv === "north-west") return { province: "north-west", city: "Rustenburg" };
      if (geoProv === "northern-cape") return { province: "northern-cape", city: "Kimberley" };
    }
  }

  // 1. KwaZulu-Natal towns & suburbs
  if (
    t.includes("kzn") || t.includes("natal") || t.includes("durban") || t.includes("pietermaritzburg") ||
    t.includes("umhlanga") || t.includes("ballito") || t.includes("pinetown") || t.includes("westville") ||
    t.includes("hillcrest") || t.includes("kloof") || t.includes("amanzimtoti") || t.includes("margate") ||
    t.includes("port shepstone") || t.includes("richards bay") || t.includes("empangeni") || t.includes("newcastle") ||
    t.includes("ladysmith") || t.includes("stanger") || t.includes("kwadukuza") || t.includes("scottburgh") ||
    t.includes("umzinto") || t.includes("isipingo") || t.includes("chatsworth") || t.includes("phoenix") ||
    t.includes("umkomaas") || t.includes("craigieburn") || t.includes("rossburgh") || t.includes("clairwood") ||
    t.includes("mobeni") || t.includes("waterfall") || t.includes("shallcross") || t.includes("queensburgh")
  ) {
    let city = "Durban";
    if (t.includes("umzinto")) city = "Umzinto";
    else if (t.includes("isipingo")) city = "Isipingo";
    else if (t.includes("pinetown")) city = "Pinetown";
    else if (t.includes("scottburgh")) city = "Scottburgh";
    else if (t.includes("umkomaas") || t.includes("craigieburn")) city = "Umkomaas";
    else if (t.includes("pietermaritzburg")) city = "Pietermaritzburg";
    else if (t.includes("umhlanga")) city = "Umhlanga";
    else if (t.includes("ballito")) city = "Ballito";
    else if (t.includes("richards bay")) city = "Richards Bay";
    else if (t.includes("newcastle")) city = "Newcastle";
    else if (t.includes("port shepstone")) city = "Port Shepstone";
    else if (t.includes("margate")) city = "Margate";
    return { province: "kwazulu-natal", city };
  }

  // 2. Western Cape
  if (
    t.includes("western cape") || t.includes("cape town") || t.includes("stellenbosch") || t.includes("paarl") ||
    t.includes("somerset west") || t.includes("george") || t.includes("knysna") || t.includes("mossel bay") ||
    t.includes("hermanus") || t.includes("bellville") || t.includes("durbanville") || t.includes("table view") ||
    t.includes("milnerton") || t.includes("claremont") || t.includes("wynberg") || t.includes("sea point") ||
    t.includes("brackenfell") || t.includes("strand") || t.includes("worcester")
  ) {
    return { 
      province: "western-cape", 
      city: t.includes("stellenbosch") ? "Stellenbosch" : t.includes("george") ? "George" : t.includes("paarl") ? "Paarl" : "Cape Town" 
    };
  }

  // 3. Eastern Cape
  if (
    t.includes("eastern cape") || t.includes("port elizabeth") || t.includes("gqeberha") || t.includes("east london") ||
    t.includes("mthatha") || t.includes("grahamstown") || t.includes("makhanda") || t.includes("uitenhage") ||
    t.includes("kariega") || t.includes("jeffreys bay") || t.includes("st francis") || t.includes("queenstown")
  ) {
    return { 
      province: "eastern-cape", 
      city: (t.includes("gqeberha") || t.includes("port elizabeth")) ? "Gqeberha" : t.includes("east london") ? "East London" : "Gqeberha" 
    };
  }

  // 4. Free State
  if (
    t.includes("free state") || t.includes("bloemfontein") || t.includes("welkom") || t.includes("sasolburg") ||
    t.includes("kroonstad") || t.includes("bethlehem") || t.includes("parys") || t.includes("harrismith")
  ) {
    return { 
      province: "free-state", 
      city: t.includes("welkom") ? "Welkom" : t.includes("sasolburg") ? "Sasolburg" : "Bloemfontein" 
    };
  }

  // 5. Limpopo
  if (
    t.includes("limpopo") || t.includes("polokwane") || t.includes("tzaneen") || t.includes("mokopane") ||
    t.includes("thohoyandou") || t.includes("bela-bela") || t.includes("lephalale") || t.includes("musina") ||
    t.includes("louis trichardt") || t.includes("makhado")
  ) {
    return { 
      province: "limpopo", 
      city: t.includes("tzaneen") ? "Tzaneen" : t.includes("mokopane") ? "Mokopane" : "Polokwane" 
    };
  }

  // 6. Mpumalanga
  if (
    t.includes("mpumalanga") || t.includes("nelspruit") || t.includes("mbombela") || t.includes("witbank") ||
    t.includes("emalahleni") || t.includes("middelburg") || t.includes("secunda") || t.includes("standerton") ||
    t.includes("white river") || t.includes("ermelo")
  ) {
    return { 
      province: "mpumalanga", 
      city: t.includes("witbank") || t.includes("emalahleni") ? "eMalahleni" : "Mbombela" 
    };
  }

  // 7. North West
  if (
    t.includes("north west") || t.includes("rustenburg") || t.includes("potchefstroom") || t.includes("klerksdorp") ||
    t.includes("brits") || t.includes("mahikeng") || t.includes("hartbeespoort")
  ) {
    return { 
      province: "north-west", 
      city: t.includes("potchefstroom") ? "Potchefstroom" : t.includes("klerksdorp") ? "Klerksdorp" : "Rustenburg" 
    };
  }

  // 8. Northern Cape
  if (
    t.includes("northern cape") || t.includes("kimberley") || t.includes("upington") || t.includes("springbok") ||
    t.includes("kuruman") || t.includes("de aar")
  ) {
    return { 
      province: "northern-cape", 
      city: t.includes("upington") ? "Upington" : "Kimberley" 
    };
  }

  // 9. Gauteng
  if (
    t.includes("gauteng") || t.includes("johannesburg") || t.includes("joburg") || t.includes("pretoria") ||
    t.includes("sandton") || t.includes("randburg") || t.includes("midrand") || t.includes("centurion") ||
    t.includes("roodepoort") || t.includes("kempton park") || t.includes("boksburg") || t.includes("benoni") ||
    t.includes("germiston") || t.includes("springs") || t.includes("krugersdorp") || t.includes("soweto") ||
    t.includes("alberton") || t.includes("bedfordview") || t.includes("edenvale") || t.includes("rosebank") ||
    t.includes("fourways") || t.includes("bryanston")
  ) {
    return { 
      province: "gauteng", 
      city: (t.includes("pretoria") || t.includes("centurion")) ? "Pretoria" : "Johannesburg" 
    };
  }

  // 10. South African Landline & Area Code Heuristic
  // KwaZulu-Natal (031, 032, 033, 034, 035, 036, 039)
  if (
    cleanPhone.startsWith("039") || cleanPhone.startsWith("2739") ||
    cleanPhone.startsWith("031") || cleanPhone.startsWith("2731") ||
    cleanPhone.startsWith("032") || cleanPhone.startsWith("2732") ||
    cleanPhone.startsWith("033") || cleanPhone.startsWith("2733") ||
    cleanPhone.startsWith("034") || cleanPhone.startsWith("2734") ||
    cleanPhone.startsWith("035") || cleanPhone.startsWith("2735") ||
    cleanPhone.startsWith("036") || cleanPhone.startsWith("2736")
  ) {
    let kznCity = "Durban";
    if (cleanPhone.startsWith("039") || cleanPhone.startsWith("2739")) {
      if (cleanPhone.startsWith("039974") || cleanPhone.startsWith("2739974")) kznCity = "Umzinto";
      else if (cleanPhone.startsWith("039976") || cleanPhone.startsWith("2739976")) kznCity = "Scottburgh";
      else if (cleanPhone.startsWith("039979") || cleanPhone.startsWith("2739979")) kznCity = "Umkomaas";
      else kznCity = "Port Shepstone";
    } else if (cleanPhone.startsWith("033") || cleanPhone.startsWith("2733")) {
      kznCity = "Pietermaritzburg";
    } else if (cleanPhone.startsWith("032") || cleanPhone.startsWith("2732")) {
      kznCity = "Ballito";
    } else if (cleanPhone.startsWith("034") || cleanPhone.startsWith("2734")) {
      kznCity = "Newcastle";
    } else if (cleanPhone.startsWith("035") || cleanPhone.startsWith("2735")) {
      kznCity = "Richards Bay";
    } else if (cleanPhone.startsWith("036") || cleanPhone.startsWith("2736")) {
      kznCity = "Ladysmith";
    }
    return { province: "kwazulu-natal", city: kznCity };
  }

  // Western Cape (021, 022, 023, 028, 044)
  if (
    cleanPhone.startsWith("021") || cleanPhone.startsWith("2721") ||
    cleanPhone.startsWith("022") || cleanPhone.startsWith("2722") ||
    cleanPhone.startsWith("023") || cleanPhone.startsWith("2723") ||
    cleanPhone.startsWith("028") || cleanPhone.startsWith("2728") ||
    cleanPhone.startsWith("044") || cleanPhone.startsWith("2744")
  ) {
    return { 
      province: "western-cape", 
      city: (cleanPhone.startsWith("044") || cleanPhone.startsWith("2744")) ? "George" : "Cape Town" 
    };
  }

  // Eastern Cape (041, 042, 043, 045, 046, 047, 048, 049)
  if (
    cleanPhone.startsWith("041") || cleanPhone.startsWith("2741") ||
    cleanPhone.startsWith("042") || cleanPhone.startsWith("2742") ||
    cleanPhone.startsWith("043") || cleanPhone.startsWith("2743") ||
    cleanPhone.startsWith("045") || cleanPhone.startsWith("2745") ||
    cleanPhone.startsWith("046") || cleanPhone.startsWith("2746") ||
    cleanPhone.startsWith("047") || cleanPhone.startsWith("2747")
  ) {
    return { 
      province: "eastern-cape", 
      city: (cleanPhone.startsWith("043") || cleanPhone.startsWith("2743")) ? "East London" : "Gqeberha" 
    };
  }

  // Free State (051, 056, 057, 058)
  if (
    cleanPhone.startsWith("051") || cleanPhone.startsWith("2751") ||
    cleanPhone.startsWith("056") || cleanPhone.startsWith("2756") ||
    cleanPhone.startsWith("057") || cleanPhone.startsWith("2757") ||
    cleanPhone.startsWith("058") || cleanPhone.startsWith("2758")
  ) {
    return { province: "free-state", city: "Bloemfontein" };
  }

  // Limpopo (015)
  if (cleanPhone.startsWith("015") || cleanPhone.startsWith("2715")) {
    return { province: "limpopo", city: "Polokwane" };
  }

  // Mpumalanga (013, 017)
  if (cleanPhone.startsWith("013") || cleanPhone.startsWith("2713") || cleanPhone.startsWith("017") || cleanPhone.startsWith("2717")) {
    return { province: "mpumalanga", city: "Mbombela" };
  }

  // North West (014, 018)
  if (cleanPhone.startsWith("018") || cleanPhone.startsWith("2718") || cleanPhone.startsWith("014") || cleanPhone.startsWith("2714")) {
    return { province: "north-west", city: "Rustenburg" };
  }

  // Northern Cape (053, 054, 027)
  if (cleanPhone.startsWith("053") || cleanPhone.startsWith("2753") || cleanPhone.startsWith("054") || cleanPhone.startsWith("2754") || cleanPhone.startsWith("027") || cleanPhone.startsWith("2727")) {
    return { province: "northern-cape", city: "Kimberley" };
  }

  // Gauteng (011, 012, 016)
  if (cleanPhone.startsWith("011") || cleanPhone.startsWith("2711") || cleanPhone.startsWith("012") || cleanPhone.startsWith("2712") || cleanPhone.startsWith("016") || cleanPhone.startsWith("2716")) {
    return { province: "gauteng", city: (cleanPhone.startsWith("012") || cleanPhone.startsWith("2712")) ? "Pretoria" : "Johannesburg" };
  }

  const defProv = (defaultProvince || "gauteng").toLowerCase();
  return { 
    province: defProv, 
    city: defProv === "kwazulu-natal" ? "Durban" : defProv === "western-cape" ? "Cape Town" : defProv === "eastern-cape" ? "Gqeberha" : "Johannesburg" 
  };
}
