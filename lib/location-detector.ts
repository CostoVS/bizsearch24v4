// South African Location and Area Code Detector
export function detectLocationFromPhoneAndText(phone: string, text: string, defaultProvince = "gauteng"): { province: string; city: string } {
  const t = (text || "").toLowerCase();
  const cleanPhone = (phone || "").replace(/[^0-9]/g, '');

  // 1. Check text/address for specific South African provinces & cities
  if (
    t.includes("kzn") || t.includes("natal") || t.includes("durban") || t.includes("pietermaritzburg") ||
    t.includes("umhlanga") || t.includes("ballito") || t.includes("pinetown") || t.includes("westville") ||
    t.includes("hillcrest") || t.includes("kloof") || t.includes("amanzimtoti") || t.includes("margate") ||
    t.includes("port shepstone") || t.includes("richards bay") || t.includes("empangeni") || t.includes("newcastle") ||
    t.includes("ladysmith") || t.includes("stanger") || t.includes("kwadukuza") || t.includes("scottburgh")
  ) {
    return { 
      province: "kwazulu-natal", 
      city: t.includes("umhlanga") ? "Umhlanga" : t.includes("pietermaritzburg") ? "Pietermaritzburg" : t.includes("ballito") ? "Ballito" : "Durban" 
    };
  }

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

  if (
    t.includes("free state") || t.includes("bloemfontein") || t.includes("welkom") || t.includes("sasolburg") ||
    t.includes("kroonstad") || t.includes("bethlehem") || t.includes("parys") || t.includes("harrismith")
  ) {
    return { 
      province: "free-state", 
      city: t.includes("welkom") ? "Welkom" : t.includes("sasolburg") ? "Sasolburg" : "Bloemfontein" 
    };
  }

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

  if (
    t.includes("mpumalanga") || t.includes("nelspruit") || t.includes("mbombela") || t.includes("witbank") ||
    t.includes("emalahleni") || t.includes("middelburg") || t.includes("secunda") || t.includes("standerton") ||
    t.includes("white river") || t.includes("ermelo")
  ) {
    return { 
      province: "mpumalanga", 
      city: t.includes("witbank") || t.includes("emalahleni") ? "eMalahleni" : (t.includes("nelspruit") || t.includes("mbombela")) ? "Mbombela" : "Mbombela" 
    };
  }

  if (
    t.includes("north west") || t.includes("rustenburg") || t.includes("potchefstroom") || t.includes("klerksdorp") ||
    t.includes("brits") || t.includes("mahikeng") || t.includes("hartbeespoort")
  ) {
    return { 
      province: "north-west", 
      city: t.includes("potchefstroom") ? "Potchefstroom" : t.includes("klerksdorp") ? "Klerksdorp" : "Rustenburg" 
    };
  }

  if (
    t.includes("northern cape") || t.includes("kimberley") || t.includes("upington") || t.includes("springbok") ||
    t.includes("kuruman") || t.includes("de aar")
  ) {
    return { 
      province: "northern-cape", 
      city: t.includes("upington") ? "Upington" : "Kimberley" 
    };
  }

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

  // 2. Fallback to telephone landline area codes
  if (cleanPhone.startsWith("031") || cleanPhone.startsWith("2731") || cleanPhone.startsWith("033") || cleanPhone.startsWith("2733")) {
    return { province: "kwazulu-natal", city: (cleanPhone.startsWith("033") || cleanPhone.startsWith("2733")) ? "Pietermaritzburg" : "Durban" };
  }
  if (cleanPhone.startsWith("021") || cleanPhone.startsWith("2721") || cleanPhone.startsWith("028") || cleanPhone.startsWith("044")) {
    return { province: "western-cape", city: "Cape Town" };
  }
  if (cleanPhone.startsWith("041") || cleanPhone.startsWith("2741") || cleanPhone.startsWith("043") || cleanPhone.startsWith("2743")) {
    return { province: "eastern-cape", city: (cleanPhone.startsWith("043") || cleanPhone.startsWith("2743")) ? "East London" : "Gqeberha" };
  }
  if (cleanPhone.startsWith("051") || cleanPhone.startsWith("2751") || cleanPhone.startsWith("057") || cleanPhone.startsWith("058")) {
    return { province: "free-state", city: "Bloemfontein" };
  }
  if (cleanPhone.startsWith("015") || cleanPhone.startsWith("2715")) {
    return { province: "limpopo", city: "Polokwane" };
  }
  if (cleanPhone.startsWith("013") || cleanPhone.startsWith("2713")) {
    return { province: "mpumalanga", city: "Mbombela" };
  }
  if (cleanPhone.startsWith("018") || cleanPhone.startsWith("2718") || cleanPhone.startsWith("014") || cleanPhone.startsWith("2714")) {
    return { province: "north-west", city: "Rustenburg" };
  }
  if (cleanPhone.startsWith("053") || cleanPhone.startsWith("2753") || cleanPhone.startsWith("027") || cleanPhone.startsWith("2727")) {
    return { province: "northern-cape", city: "Kimberley" };
  }
  if (cleanPhone.startsWith("011") || cleanPhone.startsWith("2711") || cleanPhone.startsWith("012") || cleanPhone.startsWith("2712") || cleanPhone.startsWith("016") || cleanPhone.startsWith("2716")) {
    return { province: "gauteng", city: (cleanPhone.startsWith("012") || cleanPhone.startsWith("2712")) ? "Pretoria" : "Johannesburg" };
  }

  const defProv = (defaultProvince || "gauteng").toLowerCase();
  return { 
    province: defProv, 
    city: defProv === "kwazulu-natal" ? "Durban" : defProv === "western-cape" ? "Cape Town" : defProv === "eastern-cape" ? "Gqeberha" : "Johannesburg" 
  };
}
