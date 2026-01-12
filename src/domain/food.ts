import type { FoodKind } from './place'

export type FoodFilter = {
  kind: FoodKind
  values: string[]
}

export type FoodCategory = {
  id: string
  label: string
  description: string
  filters: FoodFilter[]
}

export const EAT_AND_DRINK_CATEGORY_ID = 'eat-drink'
const EAT_AND_DRINK_VALUES = ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'biergarten', 'ice_cream', 'food_court']
export const BUY_FOOD_CATEGORY_ID = 'buy-food'

const BUY_FOOD_VALUES = [
  'alcohol',
  'bakery',
  'beverages',
  'brewing_supplies',
  'butcher',
  'cheese',
  'chocolate',
  'coffee',
  'confectionery',
  'convenience',
  'dairy',
  'deli',
  'farm',
  'food',
  'frozen_food',
  'greengrocer',
  'health_food',
  'ice_cream',
  'nuts',
  'pasta',
  'pastry',
  'seafood',
  'spices',
  'tea',
  'tortilla',
  'water',
  'wine',
  'supermarket',
]

export const FOOD_CATEGORIES: FoodCategory[] = [
  {
    id: EAT_AND_DRINK_CATEGORY_ID,
    label: 'Eat & Drink Out',
    description: 'Restaurants, cafes, pubs, and quick bites.',
    filters: [{ kind: 'amenity', values: EAT_AND_DRINK_VALUES }],
  },
  {
    id: BUY_FOOD_CATEGORY_ID,
    label: 'Buy Food',
    description: 'Groceries and specialty food shops.',
    filters: [{ kind: 'shop', values: BUY_FOOD_VALUES }],
  },
]

export const DEFAULT_FOOD_CATEGORY_IDS = FOOD_CATEGORIES.map((category) => category.id)

export function ensureFoodSelection(ids: string[]) {
  const validIds = new Set(FOOD_CATEGORIES.map((category) => category.id))
  const filtered = ids.filter((id) => validIds.has(id))
  return filtered.length ? filtered : DEFAULT_FOOD_CATEGORY_IDS
}

export function getAmenityOptionsForGroups(ids: string[]) {
  const selected = new Set(ids)
  const options = new Set<string>()

  FOOD_CATEGORIES.forEach((category) => {
    if (!selected.has(category.id)) return
    category.filters.forEach((filter) => {
      if (filter.kind === 'amenity') {
        filter.values.forEach((value) => options.add(value))
      }
    })
  })

  return Array.from(options)
}

export function getShopOptionsForGroups(ids: string[]) {
  const selected = new Set(ids)
  const options = new Set<string>()

  FOOD_CATEGORIES.forEach((category) => {
    if (!selected.has(category.id)) return
    category.filters.forEach((filter) => {
      if (filter.kind === 'shop') {
        filter.values.forEach((value) => options.add(value))
      }
    })
  })

  return Array.from(options)
}

export function resolveAmenitySelection(selection: string[], available: string[]) {
  const allowed = new Set(available)
  const sanitized = selection.filter((value) => allowed.has(value))
  return sanitized.length ? sanitized : available
}

export function resolveShopSelection(selection: string[], available: string[]) {
  const allowed = new Set(available)
  const sanitized = selection.filter((value) => allowed.has(value))
  return sanitized.length ? sanitized : available
}

export function getFiltersForCategories(ids: string[]) {
  const amenity = new Set<string>()
  const shop = new Set<string>()
  const selected = new Set(ids)

  FOOD_CATEGORIES.filter((category) => selected.has(category.id)).forEach((category) => {
    category.filters.forEach((filter) => {
      filter.values.forEach((value) => {
        if (filter.kind === 'amenity') {
          amenity.add(value)
        } else {
          shop.add(value)
        }
      })
    })
  })

  return {
    amenity: Array.from(amenity),
    shop: Array.from(shop),
  }
}

export function formatFoodType(kind: FoodKind, type: string) {
  const friendly = type.replace(/_/g, ' ')
  const prefix = kind === 'amenity' ? 'Amenity' : 'Shop'
  return `${prefix} • ${friendly}`
}
