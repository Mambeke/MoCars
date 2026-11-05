const gallery = (id) => [
  `/images/generated/parts/${id}/front.jpg`,
  `/images/generated/parts/${id}/rear.jpg`,
];

const confirmation = 'Contact MoCars to confirm the actual part, condition, fitment and availability before ordering.';

const makePart = ({ id, reference, name, condition, category }) => ({
  id,
  reference,
  name,
  category,
  condition,
  partNumber: null,
  compatibleMakes: [],
  compatibleModels: [],
  compatibleYears: [],
  description: confirmation,
  specifications: [],
  manufacturer: null,
  price: null,
  stockQuantity: null,
  availability: 'Enquire to confirm',
  dateAdded: '2026-11-05',
  featured: false,
  searchableKeywords: [],
  images: gallery(id),
});

export const generatedNewParts = [
  { id: 'starter-motor-new', reference: 'MOC-GEN-PN-001', name: 'Starter Motor', condition: 'New', category: 'Electrical Components' },
  { id: 'engine-air-filter-new', reference: 'MOC-GEN-PN-002', name: 'Engine Air Filter', condition: 'New', category: 'Service Parts' },
  { id: 'cabin-air-filter-new', reference: 'MOC-GEN-PN-003', name: 'Cabin Air Filter', condition: 'New', category: 'Service Parts' },
  { id: 'oil-filter-new', reference: 'MOC-GEN-PN-004', name: 'Oil Filter', condition: 'New', category: 'Service Parts' },
  { id: 'fuel-filter-new', reference: 'MOC-GEN-PN-005', name: 'Fuel Filter', condition: 'New', category: 'Fuel System' },
  { id: 'spark-plug-set-new', reference: 'MOC-GEN-PN-006', name: 'Spark Plug Set', condition: 'New', category: 'Ignition Components' },
].map(makePart);

export const generatedUsedParts = [];
