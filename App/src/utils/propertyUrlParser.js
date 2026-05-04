// utils/propertyUrlParser.js
// ─── 100% Frontend, No Backend, No Cost ──────────────────────

// ─── Detect site ──────────────────────────────────────────────
export const detectSite = (url = '') => {
  if (url.includes('zillow.com'))     return 'zillow';
  if (url.includes('apartments.com')) return 'apartments';
  if (url.includes('realtor.com'))    return 'realtor';
  if (url.includes('trulia.com'))     return 'trulia';
  return 'generic';
};

// ─── Extract JSON-LD from raw HTML string ─────────────────────
// No cheerio needed — pure regex
export const extractJsonLD = (html) => {
  const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const json  = JSON.parse(match[1].trim());
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const validTypes = [
          'RealEstateListing', 'Residence', 'Apartment',
          'House', 'SingleFamilyResidence', 'Accommodation',
        ];
        if (validTypes.includes(item['@type'])) return item;
      }
    } catch {}
  }
  return null;
};

// ─── Extract __NEXT_DATA__ (Zillow, Realtor.com) ──────────────
export const extractNextData = (html) => {
  const match = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
};

// ─── Extract meta tag from raw HTML ───────────────────────────
export const extractMeta = (html, name) => {
  const regexes = [
    new RegExp(`<meta[^>]*property="${name}"[^>]*content="([^"]*)"`, 'i'),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${name}"`, 'i'),
    new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, 'i'),
  ];
  for (const r of regexes) {
    const m = html.match(r);
    if (m?.[1]) return m[1].trim();
  }
  return '';
};

// ─── Normalize property type ───────────────────────────────────
export const normalizeType = (raw = '') => {
  const t = raw.toLowerCase();
  if (/condo/i.test(t))               return 'Condo';
  if (/townhouse|townhome/i.test(t))  return 'Townhouse';
  if (/studio/i.test(t))              return 'Studio';
  if (/single.family|house/i.test(t)) return 'House';
  if (/duplex/i.test(t))              return 'Duplex';
  if (/villa/i.test(t))               return 'Villa';
  return 'Apartment';
};

// ─── Map amenity text → amenities object ──────────────────────
export const mapAmenities = (list = []) => {
  const text = (Array.isArray(list) ? list.join(' ') : String(list)).toLowerCase();
  return {
    furnished:           /furnished/i.test(text),
    parking:             /parking|garage/i.test(text),
    elevator:            /elevator/i.test(text),
    ac:                  /air.condition|a\/c|hvac|cooling/i.test(text),
    gym:                 /gym|fitness/i.test(text),
    pool:                /pool|swimming/i.test(text),
    washer_dryer:        /washer|dryer|laundry/i.test(text),
    dishwasher:          /dishwasher/i.test(text),
    fireplace:           /fireplace/i.test(text),
    hardwood_floors:     /hardwood/i.test(text),
    pet_friendly:        /pet.friendly|pets.allowed/i.test(text),
    cats_allowed:        /cats.allowed/i.test(text),
    dogs_allowed:        /dogs.allowed/i.test(text),
    balcony:             /balcony|patio|deck/i.test(text),
    high_speed_internet: /internet|wifi/i.test(text),
    refrigerator:        /refrigerator|fridge/i.test(text),
    microwave:           /microwave/i.test(text),
    bbq_area:            /bbq|grill|barbecue/i.test(text),
    security_system:     /security.system/i.test(text),
    ev_charging:         /ev.charging/i.test(text),
    wheelchair_access:   /wheelchair|accessible/i.test(text),
  };
};

// ─── Parse Zillow from __NEXT_DATA__ ──────────────────────────
const parseZillow = (nextData) => {
  try {
    const cache = nextData?.props?.pageProps?.gdpClientCache;
    if (!cache) return null;
    const prop = Object.values(cache)[0]?.property;
    if (!prop) return null;
    const addr = prop.address || {};
    return {
      name:          prop.streetAddress || addr.streetAddress || '',
      description:   prop.description || '',
      street:        addr.streetAddress || '',
      city:          addr.city || '',
      state:         addr.state || '',
      zip_code:      addr.zipcode || '',
      property_type: normalizeType(prop.homeType || ''),
      bedrooms:      String(prop.bedrooms || prop.beds || ''),
      bathrooms:     String(prop.bathrooms || prop.baths || ''),
      area_sqft:     String(prop.livingArea || ''),
      year_built:    String(prop.yearBuilt || ''),
      monthly_rent:  String(prop.price || prop.rentZestimate || ''),
      images:        (prop.photos || [])
                       .slice(0, 9)
                       .map(p => p.mixedSources?.jpeg?.[0]?.url || p.url || '')
                       .filter(Boolean),
      amenities:     mapAmenities(prop.amenityDetails || []),
    };
  } catch { return null; }
};

// ─── Parse Realtor.com from __NEXT_DATA__ ─────────────────────
const parseRealtor = (nextData) => {
  try {
    const listing =
      nextData?.props?.pageProps?.initialReduxState?.ldpData?.listing;
    if (!listing) return null;
    const loc = listing.location?.address || {};
    return {
      name:          loc.line || '',
      description:   listing.description?.text || '',
      street:        loc.line || '',
      city:          loc.city || '',
      state:         loc.state_code || '',
      zip_code:      loc.postal_code || '',
      property_type: normalizeType(listing.description?.type || ''),
      bedrooms:      String(listing.description?.beds || ''),
      bathrooms:     String(listing.description?.baths || ''),
      area_sqft:     String(listing.description?.sqft || ''),
      year_built:    String(listing.description?.year_built || ''),
      monthly_rent:  String(listing.list_price || ''),
      images:        (listing.photos || [])
                       .slice(0, 9)
                       .map(p => p.href || '')
                       .filter(Boolean),
      amenities:     mapAmenities(listing.tags || []),
    };
  } catch { return null; }
};

// ─── Generic: JSON-LD + meta tags fallback ────────────────────
const parseGeneric = (html) => {
  const ld  = extractJsonLD(html) || {};
  const addr = ld.address || {};
  const images = [];
  const imgRegex = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) images.push(m[1]);

  return {
    name:          ld.name        || extractMeta(html, 'og:title')       || '',
    description:   ld.description || extractMeta(html, 'og:description') || '',
    street:        addr.streetAddress   || '',
    city:          addr.addressLocality || '',
    state:         addr.addressRegion   || '',
    zip_code:      addr.postalCode      || '',
    property_type: normalizeType(ld['@type'] || ''),
    bedrooms:      String(ld.numberOfRooms || ''),
    bathrooms:     '',
    area_sqft:     String(ld.floorSize?.value || ''),
    year_built:    '',
    monthly_rent:  String(ld.offers?.price || ld.price || ''),
    images:        images.slice(0, 9),
    amenities:     mapAmenities(
      (ld.amenityFeature || []).map(a => a.name || '')
    ),
  };
};

// ─── METHOD 1: Direct fetch + parse ───────────────────────────
// React Native has NO CORS restrictions — fetch works on any URL
export const scrapeViaFetch = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control':   'no-cache',
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html     = await response.text();
  const site     = detectSite(url);
  const nextData = extractNextData(html);

  let result = null;
  if (site === 'zillow')  result = parseZillow(nextData);
  if (site === 'realtor') result = parseRealtor(nextData);
  if (!result?.name)      result = parseGeneric(html);

  return result;
};
