import type { City, CollectionPoint, Country, PricingRule, ShipmentType, Zone } from '@/lib/mock-data';

export const shipmentTypeLabels: Record<ShipmentType, string> = {
  STANDARD: 'Standard',
  EXPRESS: 'Express',
  ECONOMY: 'Economique',
};

export function calculateOperationPrice(rule: PricingRule, weight: number, distanceKm: number) {
  return (rule.basePrice + rule.pricePerKg * weight + rule.pricePerKm * distanceKm) * rule.zoneMultiplier;
}

export function getPricingRuleForShipmentType(
  pricingRules: PricingRule[],
  shipmentType: ShipmentType
) {
  return pricingRules.find((rule) => rule.shipmentType === shipmentType);
}

function getZone(point: CollectionPoint | undefined, zones: Zone[]) {
  return point ? zones.find((zone) => zone.id === point.zoneId) : undefined;
}

function getCity(zone: Zone | undefined, cities: City[]) {
  return zone ? cities.find((city) => city.id === zone.cityId) : undefined;
}

function getCountry(city: City | undefined, countries: Country[]) {
  return city ? countries.find((country) => country.id === city.countryId) : undefined;
}

export function estimateRouteDistanceKm(
  originPoint: CollectionPoint | undefined,
  destinationPoint: CollectionPoint | undefined,
  zones: Zone[],
  cities: City[],
  countries: Country[]
) {
  if (!originPoint || !destinationPoint) {
    return 0;
  }

  if (originPoint.id === destinationPoint.id) {
    return 5;
  }

  const originZone = getZone(originPoint, zones);
  const destinationZone = getZone(destinationPoint, zones);

  if (originZone?.id && originZone.id === destinationZone?.id) {
    return 8;
  }

  const originCity = getCity(originZone, cities);
  const destinationCity = getCity(destinationZone, cities);

  if (originCity?.id && originCity.id === destinationCity?.id) {
    return 18;
  }

  const originCountry = getCountry(originCity, countries);
  const destinationCountry = getCountry(destinationCity, countries);

  if (originCountry?.id && originCountry.id === destinationCountry?.id) {
    return 95;
  }

  return 850;
}
