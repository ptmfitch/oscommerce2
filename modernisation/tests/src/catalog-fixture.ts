import { config } from './config';

/**
 * Business facts from the stock osCommerce sample catalogue. A rebuild must ship
 * (or migrate) the same sample data for these characterization tests to hold.
 */
export const catalog = {
  topCategories: ['Hardware', 'Software', 'DVD Movies'],
  graphicsCards: {
    path: ['Hardware', 'Graphics Cards'],
    products: ['Matrox G200 MMS', 'Matrox G400 32MB'],
  },
  matroxG200: {
    name: 'Matrox G200 MMS',
    price: '$299.99',
    options: ['Memory', 'Model'],
  },
  specialOffer: {
    name: 'Blade Runner - Director\'s Cut',
    regularPrice: '$35.99',
    specialPrice: '$30.00',
  },
  manufacturerMatrox: { name: 'Matrox', products: ['Matrox G200 MMS', 'Matrox G400 32MB'] },
  searchTerm: 'matrox',
};

/** Florida customer: the sample store charges 7% FL tax and a flat $5.00 shipping. */
export const floridaAddress = {
  street: '1 Test Street',
  city: 'Miami',
  postcode: '33101',
  state: 'Florida',
  country: 'United States',
  telephone: '5550100',
};

const checkoutBase = {
  product: 'Matrox G200 MMS',
  subtotal: '$299.99',
  shipping: '$5.00',
  paymentMethod: 'Cash on Delivery',
  shippingMethod: 'Flat Rate',
  initialStatus: 'Pending',
};

/**
 * Legacy defect: storefront address forms never persist the zone (fetchAll() then valueInt()
 * in create_account.php and friends), so a Florida customer is not charged FL tax.
 */
export const expectedCheckout = config.legacyBugs
  ? { ...checkoutBase, tax: null, total: '$304.99', taxRate: 0, totalRows: [['ot_subtotal', 299.99], ['ot_shipping', 5], ['ot_total', 304.99]] }
  : { ...checkoutBase, tax: '$21.00', total: '$325.99', taxRate: 7, totalRows: [['ot_subtotal', 299.99], ['ot_tax', 20.9993], ['ot_shipping', 5], ['ot_total', 325.9893]] };

export const uniqueEmail = (tag: string) =>
  `char-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
