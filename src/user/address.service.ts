import { AddressData } from './address.data';
import { APIGatewayEvent } from 'aws-lambda';
import * as validator from '../shared/validator';
import { User } from '../models/user';

import * as apiConfig from '../shared/api-config';

export class AddressService {
  private readonly addressData: AddressData;

  constructor() {
    this.addressData = new AddressData();
  }

  async updateAddress(event: APIGatewayEvent) {
    const data: User = validator.isRequestValid(event);
    if (data['statusCode'] || !data.uid) {
      // invalid request.
      return data;
    }

    try {
      await this.addressData.updateAddress(data, data.uid);
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'Success' }),
        headers: apiConfig.headers
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: { error: `Couldnt update the customer ${data}.` },
        headers: apiConfig.headers
      };
    }
  }
}
