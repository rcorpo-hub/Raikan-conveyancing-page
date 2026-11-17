export type ServiceType = 
  | 'Buying in SA' 
  | 'Selling in SA' 
  | 'Family Transfer' 
  | 'Contract Review' 
  | 'Land Division' 
  | 'Other Conveyancing';

export interface FormData {
  name: string;
  email: string;
  phone: string;
  serviceType: ServiceType;
  serviceDetail: string;
  propertyPrice: string;
  questions: string;
}

export type PropertyState = 'SA' | 'VIC' | 'NSW' | 'QLD' | 'WA' | 'Other';

export type ServiceCategory = 
  | 'buying'
  | 'selling'
  | 'family-transfer'
  | 'contract-review'
  | 'land-division'
  | 'other';

export type PropertyType = 
  | 'House'
  | 'Unit / Apartment'
  | 'Townhouse'
  | 'Vacant Land'
  | 'Commercial / Rural'
  | 'Other';

export type TransactionTiming = 
  | 'urgent'      // Immediately
  | '7-days'      // Within 7 days
  | '30-days'     // Within 30 days
  | '3-months'    // Within 3 months
  | 'researching';// Just researching

export type PreferredContactMethod = 'Phone' | 'Email' | 'SMS' | 'Any';

export interface IntelligentEnquiryData {
  // Step 1: Location
  propertyState: PropertyState;
  suburb: string;
  postcode: string;
  propertyAddress?: string;

  // Step 2: Service
  serviceCategory: ServiceCategory;

  // Step 3: Dynamic Property Details
  propertyType?: PropertyType;
  estimatedPrice?: string;
  
  // Purchasing specific
  isUnderContract?: 'yes' | 'no' | 'auction-pending';
  purchasingViaAgent?: 'agent' | 'private' | 'not-sure';
  isFirstHomeBuyer?: 'yes' | 'no';
  occupancyType?: 'primary-residence' | 'investment';

  // Selling specific
  sellingMethod?: 'agent' | 'private';
  isStrataTitled?: 'torrens-title' | 'strata' | 'community' | 'not-sure';
  contractPrepared?: 'yes' | 'no' | 'in-progress';

  // Family transfer specific
  transferRelationship?: 'spouse' | 'parent-child' | 'matrimonial-separation' | 'siblings' | 'other';
  currentOwnership?: 'sole' | 'joint-tenants' | 'tenants-in-common' | 'not-sure';
  transferReason?: 'spousal-addition' | 'gift' | 'family-court-order' | 'estate-planning';

  // Contract review specific
  contractSigned?: 'signed' | 'unsigned-review-only';
  hasForm1?: 'yes' | 'no' | 'not-sure';
  coolingOffDeadline?: string;

  // Land division specific
  councilArea?: string;
  proposedAllotments?: string;
  surveyorEngaged?: 'yes' | 'no';

  // Step 4: Timing
  timing: TransactionTiming;
  expectedSettlementDate?: string;

  // Step 5: Contact
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: PreferredContactMethod;
  comments?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  image: string;
  description?: string;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role?: string;
  location?: string;
}
