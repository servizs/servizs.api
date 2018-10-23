import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';
import { config } from '../enviornment/enviornment';
import * as uuid from 'uuid';
import * as _ from 'lodash';
import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { User, Address } from '../models/user';
import { skipNullAttributes } from '../shared/utilities';
import { AddressData } from './address.data';

export class UserData {
  private readonly addressData: AddressData;

  constructor() {
    this.addressData = new AddressData();
  }
  async getProfile(userId: string) {
    const params = {
      TableName: `User_Profle_${config.enviornment}`,
      Key: {
        userId: userId
      }
    };

    const response = await dynamoDb.get(params).promise();
    if (!response) {
      console.error(response);
      console.error(`Error while retrieving the  Customer - ${userId} ${JSON.stringify(response)}`);

      return null;
    }

    return response.Item;
  }

  async getProfileByEmail(emailAddress: string) {
    console.log('------ Get Profile By Email ------');
    const params = {
      TableName: `User_Profle_${config.enviornment}`,
      FilterExpression: 'emailAddress = :emailAddress',
      ExpressionAttributeValues: {
        ':emailAddress': emailAddress
      }
    };

    const response = await dynamoDb.scan(params).promise();
    console.log('------ Get Profile By Email - Response ------' + JSON.stringify(response));
    return response.Items;
  }

  async insertUser(data: User): Promise<string> {
    const timeStamp = new Date().getTime();
    const userId = data.uid;

    delete data.uid;

    const params = {
      TableName: `User_Profle_${config.enviornment}`,
      Item: {
        userId: userId,
        ...data,
        createdTime: timeStamp,
        modifiedTime: timeStamp
      }
    };

    console.log(`####### - ${JSON.stringify(params)}`);
    await dynamoDb.put(params).promise();

    return userId;
  }

  async updateUser(data): Promise<string> {
    const timeStamp = new Date().getTime();

    const attributes = {
      firstName: { Action: 'PUT', Value: data.firstName },
      lastName: { Action: 'PUT', Value: data.lastName },
      dateOfBirth: { Action: 'PUT', Value: data.dateOfBirth },
      photoPath: { Action: 'PUT', Value: data.picture },
      phoneNumber: { Action: 'PUT', Value: data.phoneNumber },
      ModifiedTime: { Action: 'PUT', Value: timeStamp }
    };

    const params = {
      TableName: `User_Profle_${config.enviornment}`,
      Key: {
        userId: data.uid
      },

      AttributeUpdates: skipNullAttributes(attributes)
    };

    await dynamoDb.update(params).promise();

    // Update additional user Info
    await this.updateAdditionalInfo(data);

    return data.uid;
  }

  private async updateAdditionalInfo(data: any) {
    const tableName = `User_Profle_Additional_Info_${config.enviornment}`;
    const params = {
      TableName: tableName,
      Key: {
        userId: data.uid
      }
    };

    const response = await dynamoDb.get(params).promise();
    const timeStamp = new Date().getTime();

    const { uid, perHourCost, currency, minimumWorkHours, stripeAccountId, services } = data;

    if (response.Item) {
      // post
      console.log('--------- + additional info post');
      const attributes = {
        services: { Action: 'PUT', Value: data.services },
        perHourCost: { Action: 'PUT', Value: +perHourCost },
        currency: { Action: 'PUT', Value: currency },
        minimumWorkHours: { Action: 'PUT', Value: +minimumWorkHours },
        stripeAccountId: { Action: 'PUT', Value: stripeAccountId },
        ModifiedTime: { Action: 'PUT', timeStamp }
      };

      const postParams = {
        TableName: tableName,
        Key: {
          userId: uid
        },

        AttributeUpdates: skipNullAttributes(attributes)
      };

      await dynamoDb.update(postParams).promise();
    } else {
      // put
      console.log('--------- + additional info put');
      const putParams = {
        TableName: tableName,
        Item: {
          userId: uid,
          perHourCost,
          currency,
          minimumWorkHours,
          stripeAccountId,
          services,
          createdTime: timeStamp,
          modifiedTime: timeStamp
        }
      };

      await dynamoDb.put(putParams).promise();
    }
  }
}
