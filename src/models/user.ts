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
  services: any[];

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

export interface Order {
  orderId: string;
  taskerId: string;
  customerId: string;
  isCompleted: boolean;
  completionDate?: string;
  totalCost?: number;
  currency: string;
  status: OrderStatus; // Always Completed Or Cancelled
  startTime?: string;
  endTime?: string;
  expectedCost: number;
  totalWorkHours?: number;
  scheduledDate: string;
  scheduledTime: string;
  scheduledWorkHours: string; // always provide contigency to complete work and travel to next site.
  statusCode?: string;
  serviceType: string;
  createdTime: string;
  modifiedTime: string;
}

export enum OrderStatus {
  Completed = 'COMPLETED',
  Pending = 'PENDING',
  InProgress = 'INPROGRESS',
  Cancelled = 'CANCELLED',
  ReScheduled = 'RESCHEDULED '
}
