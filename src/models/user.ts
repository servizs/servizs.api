export interface User extends Address {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  emailAddress: string;
  createdTime: string;
  modifiedTime: string;
  userId?: string;
  phoneNumber?: string;
  picture?: string;
}

export interface Address {
  unitNo?: string;
  streetNumber?: string;
  streetName?: string;
  city: string;
  province: string;
  country: string;
  postalCode?: string;
  userId?: string;
}

export interface TaskerAdditionalinfo {
  perHourCost: number;
  currency: string; // default it based on the location.
  minimumWorkHours: number;
  stripeAccountId?: string;

  // might need avaialbilty params like weekends, week days, certain hours etc.
  // Also, isInsured, isCertitifed, profileValidatedREfNo? etc. TBA
}

export interface SearchParams {
  searchText: string;
  city: string;
  province: string;
  country: string;
  costRange: string;
  expectedWorkHours: number;
}

export interface SearchResult extends User, TaskerAdditionalinfo {}

export interface Reviews {
  userId: string;
  reviewerId: string;
  rating: number;
  comments: any[];
}
