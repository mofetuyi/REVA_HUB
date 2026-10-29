// Nigeria data: Lagos LGAs and material categories

export const LAGOS_LGAS = [
  'Agege',
  'Ajeromi-Ifelodun',
  'Alimosho',
  'Amuwo-Odofin',
  'Apapa',
  'Badagry',
  'Epe',
  'Eti Osa',
  'Ibeju-Lekki',
  'Ifako-Ijaiye',
  'Ikeja',
  'Ikorodu',
  'Kosofe',
  'Lagos Island',
  'Lagos Mainland',
  'Mushin',
  'Ojo',
  'Oshodi-Isolo',
  'Shomolu',
  'Surulere',
] as const

export type LagosLGA = typeof LAGOS_LGAS[number]

export type ProductGroupId = 'circular_materials' | 'upcycled_products' | 'raw_materials'

export interface ProductGroupConfig {
  id: string
  label: string
  shortLabel: string
  icon: string
  badgeText: string
  tagline: string
  description: string
  categoryValues: string[]
}

export const PRODUCT_GROUPS: Record<string, ProductGroupConfig> = {
  circular_materials: {
    id: 'circular_materials',
    label: 'Circular Material Hub',
    shortLabel: 'Circular Materials',
    icon: '🌿',
    badgeText: 'Circular Material',
    tagline: 'Organic byproducts, agro-waste, recovered plastics, cardboard & industrial feedstocks',
    description: 'Clean, sorted circular materials, organic biomass, and recovered feedstocks ready for processing, manufacturing & bio-energy across Lagos.',
    categoryValues: ['organic_products', 'plastic', 'fabric', 'leather', 'wood', 'cardboard', 'clothes', 'other'],
  },
  raw_materials: {
    id: 'raw_materials',
    label: 'Circular Material Hub',
    shortLabel: 'Circular Materials',
    icon: '🌿',
    badgeText: 'Circular Material',
    tagline: 'Organic byproducts, agro-waste, recovered plastics, cardboard & industrial feedstocks',
    description: 'Clean, sorted circular materials, organic biomass, and recovered feedstocks ready for processing, manufacturing & bio-energy across Lagos.',
    categoryValues: ['organic_products', 'plastic', 'fabric', 'leather', 'wood', 'cardboard', 'clothes', 'other'],
  },
  upcycled_products: {
    id: 'upcycled_products',
    label: 'Upcycled Products Hub',
    shortLabel: 'Upcycled Products',
    icon: '✨',
    badgeText: 'Upcycled Product',
    tagline: 'Artisan handcrafts, refurbished furniture, circular fashion & finished lifestyle wares',
    description: 'High-quality finished goods, refurbished hardwood furniture, handcrafted designer bags, and circular home goods made from 100% recovered materials.',
    categoryValues: ['furniture', 'fashion', 'crafts', 'circular_products', 'wood', 'leather', 'clothes'],
  },
}

export const CIRCULAR_MATERIAL_CATEGORIES = [
  { value: 'organic_products', label: 'Organic Products', icon: '🌾', group: 'circular_materials' },
  { value: 'plastic', label: 'Recovered Plastics', icon: '🍾', group: 'circular_materials' },
  { value: 'wood', label: 'Reclaimed Timber & Pallets', icon: '🪵', group: 'circular_materials' },
  { value: 'cardboard', label: 'Cardboard Bales', icon: '📦', group: 'circular_materials' },
  { value: 'clothes', label: 'Denim & Garments', icon: '👖', group: 'circular_materials' },
  { value: 'fabric', label: 'Textile Scraps', icon: '🧵', group: 'circular_materials' },
  { value: 'leather', label: 'Leather Offcuts', icon: '👞', group: 'circular_materials' },
  { value: 'other', label: 'Other Circular Materials', icon: '♻️', group: 'circular_materials' },
] as const

export const RAW_MATERIAL_CATEGORIES = CIRCULAR_MATERIAL_CATEGORIES

export const UPCYCLED_PRODUCT_CATEGORIES = [
  { value: 'furniture', label: 'Upcycled Furniture & Stools', icon: '🪑', group: 'upcycled_products' },
  { value: 'fashion', label: 'Circular Fashion & Bags', icon: '👜', group: 'upcycled_products' },
  { value: 'crafts', label: 'Handmade Crafts & Stationery', icon: '📓', group: 'upcycled_products' },
] as const

export const MATERIAL_CATEGORIES = [
  { value: 'organic_products', label: 'Organic Products', icon: '🌾', group: 'circular_materials' },
  { value: 'plastic', label: 'Recovered Plastics', icon: '🍾', group: 'circular_materials' },
  { value: 'wood', label: 'Reclaimed Timber & Pallets', icon: '🪵', group: 'circular_materials' },
  { value: 'cardboard', label: 'Cardboard Bales', icon: '📦', group: 'circular_materials' },
  { value: 'clothes', label: 'Denim & Garments', icon: '👖', group: 'circular_materials' },
  { value: 'fabric', label: 'Textile Scraps', icon: '🧵', group: 'circular_materials' },
  { value: 'leather', label: 'Leather Offcuts', icon: '👞', group: 'circular_materials' },
  { value: 'furniture', label: 'Upcycled Furniture & Stools', icon: '🪑', group: 'upcycled_products' },
  { value: 'fashion', label: 'Circular Fashion & Bags', icon: '👜', group: 'upcycled_products' },
  { value: 'crafts', label: 'Handmade Crafts & Stationery', icon: '📓', group: 'upcycled_products' },
  { value: 'circular_products', label: 'Organic Products', icon: '🌾', group: 'circular_materials' },
  { value: 'other', label: 'Other', icon: '♻️', group: 'circular_materials' },
] as const

export const LISTING_UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'tonnes', label: 'Tonnes' },
  { value: 'bags', label: 'Bags' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'bundles', label: 'Bundles' },
  { value: 'litres', label: 'Litres' },
] as const

export const UNITS = LISTING_UNITS

export const LISTING_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'used', label: 'Used' },
  { value: 'mixed', label: 'Mixed' },
] as const

export const CONDITIONS = LISTING_CONDITIONS

export const COLLECTION_METHODS = [
  { value: 'delivery', label: 'Direct Doorstep Delivery' },
  { value: 'buyer_arranges', label: 'Direct Doorstep Delivery' },
  { value: 'seller_arranges', label: 'Direct Doorstep Delivery' },
  { value: 'either', label: 'Direct Doorstep Delivery' },
] as const

export const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const

export const DISPUTE_REASONS = [
  { value: 'condition_not_as_described', label: 'Condition not as described' },
  { value: 'quantity_mismatch', label: 'Quantity mismatch' },
  { value: 'delivery_not_received', label: 'Delivery not received' },
  { value: 'damaged_in_transit', label: 'Damaged in transit' },
  { value: 'other', label: 'Other' },
] as const

export function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

export function formatRelativeDate(iso: string): string {
  const now = new Date()
  const date = new Date(iso)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(iso)
}
