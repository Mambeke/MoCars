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
  { id: 'engine-air-filter-new', reference: 'MOC-GEN-PN-002', name: 'Engine Air Filter', condition: 'New', category: 'Service Parts' },
].map(makePart);

export const generatedUsedParts = [];
