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

export const MATERIAL_CATEGORIES = [
  { value: 'plastic', label: 'Plastic', icon: '♻️' },
  { value: 'fabric', label: 'Fabric', icon: '🧵' },
  { value: 'leather', label: 'Leather', icon: '👜' },
  { value: 'wood', label: 'Wood', icon: '🪵' },
  { value: 'cardboard', label: 'Cardboard', icon: '📦' },
  { value: 'clothes', label: 'Clothes', icon: '👕' },
  { value: 'circular_products', label: 'Circular Products', icon: '🔄' },
  { value: 'other', label: 'Other', icon: '🔧' },
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
  { value: 'buyer_arranges', label: 'Buyer Arranges Collection' },
  { value: 'seller_arranges', label: 'Seller Arranges Delivery' },
  { value: 'either', label: 'Either Works' },
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
