import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';
import { config } from '../enviornment/enviornment';
import * as uuid from 'uuid';
import * as _ from 'lodash';
import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { User, Address } from '../models/user';
import { skipNullAttributes } from '../shared/utilities';
import { UserData } from './user.data';
import { AddressData } from './address.data';

export class UserService {
  private readonly userData: UserData;
  private readonly addressData: AddressData;

  constructor() {
    this.userData = new UserData();
    this.addressData = new AddressData();
  }

  async getById(userId: string) {
    if (!userId) {
      return {
        statusCode: 400,
        body: { error: 'Request is empty.' },
        headers: apiConfig.headers
      };
    }

    const profile = await this.userData.getProfile(userId);

    if (!profile) {
      return {
        statusCode: 404,
        headers: apiConfig.headers,
        body: JSON.stringify({
          errorMessage: `Couldnt retrieve the details for user ${userId}`
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(profile),
      headers: apiConfig.headers
    };
  }

  async getByEmailAddress(emailAddress: string) {
    if (!emailAddress) {
      return {
        statusCode: 400,
        body: { error: 'Request is empty.' },
        headers: apiConfig.headers
      };
    }

    const profile = await this.userData.getProfile(emailAddress);

    if (!profile) {
      return {
        statusCode: 404,
        headers: apiConfig.headers,
        body: JSON.stringify({
          errorMessage: `Couldnt retrieve the details for user ${emailAddress}`
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(profile),
      headers: apiConfig.headers
    };
  }

  async put(event: APIGatewayEvent) {
    const data = validator.isRequestValid(event);

    if (data.statusCode) {
      // invalid request.
      return data;
    }

    if (!this.isRequestValid(data)) {
      console.error('Request is empty.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing mandatory fields.' }),
        headers: apiConfig.headers
      };
    }

    try {
      const profile = await this.userData.getProfileByEmail(data.emailAddress);

      if (profile && profile.length > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            errorMessage: `The user email address or Id ${data.emailAddress} already exists.`
          }),
          headers: apiConfig.headers
        };
      }

      const userId = await this.userData.insertUser(data);
      await this.addressData.createAddress(data, userId);

      return {
        statusCode: 200,
        body: JSON.stringify({
          userId: userId
        }),
        headers: apiConfig.headers
      };
    } catch (error) {
      if (typeof error === 'string') {
        const errorData = JSON.parse(error);
        return {
          statusCode: errorData.statusCode,
          body: JSON.stringify({ error: errorData.errorMessage }),
          headers: apiConfig.headers
        };
      }

      console.error(`Couldnt create the user ${JSON.stringify(data)}. ${JSON.stringify(error)}`);

      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Couldnt create the customer ${data}.` }),
        headers: apiConfig.headers
      };
    }
  }

  async postOAuth(event: APIGatewayEvent) {
    const data: User = validator.isRequestValid(event);

    if (data['statusCode']) {
      // invalid request.
      return data;
    }

    if (!data.uid) {
      console.error('Request is empty.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing email address in the POST request.' }),
        headers: apiConfig.headers
      };
    }

    try {
      const profile = await this.userData.getProfileByEmail(data.emailAddress);

      if (profile && profile.length > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ userId: profile[0].userId }),
          headers: apiConfig.headers
        };
      } else {
        // Insert
        // by OAuth
        await this.userData.insertUser(data);
      }
    } catch (error) {
      if (typeof error === 'string') {
        const errorData = JSON.parse(error);
        return {
          statusCode: errorData.statusCode,
          body: JSON.stringify({ error: errorData.errorMessage }),
          headers: apiConfig.headers
        };
      }

      console.error(`Couldnt create/update the user ${JSON.stringify(data)}. ${JSON.stringify(error)}`);

      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Couldnt create/update the customer ${data}.` }),
        headers: apiConfig.headers
      };
    }
  }

  async post(event: APIGatewayEvent) {
    const data: User = validator.isRequestValid(event);

    if (data['statusCode']) {
      // invalid request.
      return data;
    }

    if (!data.uid) {
      console.error('Request is empty.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing email address in the POST request.' }),
        headers: apiConfig.headers
      };
    }

    console.log(`######## - ${JSON.stringify(data)}`);
    try {
      const profile = await this.userData.getProfileByEmail(data.emailAddress);

      if (profile && profile.length > 0) {
        // Update
        const userId = await this.userData.updateUser(data);

        const address = {
          unitNo: data.unitNo,
          streetNumber: data.streetNumber,
          streetName: data.streetName,
          city: data.city,
          province: data.province,
          country: data.country,
          postalCode: data.postalCode
        };
        await this.addressData.updateAddress(address, userId);

        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'Success' }),
          headers: apiConfig.headers
        };
      }
    } catch (error) {
      if (typeof error === 'string') {
        const errorData = JSON.parse(error);
        return {
          statusCode: errorData.statusCode,
          body: JSON.stringify({ error: errorData.errorMessage }),
          headers: apiConfig.headers
        };
      }

      console.error(`Couldnt create/update the user ${JSON.stringify(data)}. ${JSON.stringify(error)}`);

      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Couldnt create/update the customer ${data}.` }),
        headers: apiConfig.headers
      };
    }
  }

  private isRequestValid(data: User): boolean {
    console.log('-----' + JSON.stringify(data));
    if (!data.firstName || !data.lastName || !data.city || !data.province || !data.country || !data.emailAddress) {
      return false;
    }

    return true;
  }
}
