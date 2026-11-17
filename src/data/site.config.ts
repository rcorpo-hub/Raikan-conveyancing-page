/**
 * Site Configuration & Business Constants
 * 
 * RULE: Where a business fact is unconfirmed, it must be marked with a clear
 * placeholder prefix '[CONFIRM: ...]' and documented in docs/open-decisions.md.
 */

export interface SiteConfig {
  businessName: string;
  tagline: string;
  phone: string;
  phoneRaw: string;
  email: string;
  officeLocation: string;
  addressPlaceholder: string;
  abnPlaceholder: string;
  licencePlaceholder: string;
  openingHours: string;
  baseFee: string;
  gstNote: string;
  jurisdiction: string;
  pexaCertified: boolean;
}

export const siteConfig: SiteConfig = {
  businessName: 'Raikan Corporation',
  tagline: 'Fixed-Fee Conveyancing South Australia',
  phone: '08 7076 9899',
  phoneRaw: '0870769899',
  email: 'info@rcorpo.com',
  officeLocation: 'Broadview, Adelaide SA 5083',
  addressPlaceholder: '[CONFIRM: Street address in Broadview SA 5083]',
  abnPlaceholder: '[CONFIRM: ABN (Australian Business Number)]',
  licencePlaceholder: '[CONFIRM: SA Conveyancer Licence Number / Legal Practitioner ID]',
  openingHours: 'Mon - Fri: 9:00 am - 5:00 pm ACST',
  baseFee: '$600',
  gstNote: '+ GST',
  jurisdiction: 'South Australia',
  pexaCertified: true
};
