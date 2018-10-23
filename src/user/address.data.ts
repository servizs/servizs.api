import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';
import { config } from '../enviornment/enviornment';
import * as uuid from 'uuid';
import * as _ from 'lodash';
import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { User, Address } from '../models/user';
import { skipNullAttributes } from '../shared/utilities';

export class AddressData {
  async createAddress(data: Address, userId: string) {
    const address = {
      city: data.city,
      province: data.province,
      country: data.country
    };

    await this.updateAddress(address, userId);
  }

  async updateAddress(data: Address, userId: string) {
    const tableName = `Address_${config.enviornment}`;
    const params = {
      TableName: tableName,
      Key: {
        userId: userId
      }
    };

    const response = await dynamoDb.get(params).promise();
    const timeStamp = new Date().getTime();

    if (response.Item) {
      const attributes = {
        unitNo: { Action: 'PUT', Value: data.unitNo },
        streetNumber: { Action: 'PUT', Value: data.streetNumber },
        streetName: { Action: 'PUT', Value: data.streetName },
        city: { Action: 'PUT', Value: data.city },
        province: { Action: 'PUT', Value: data.province },
        country: { Action: 'PUT', Value: data.country },
        postalCode: { Action: 'PUT', Value: data.postalCode },
        ModifiedTime: { Action: 'PUT', Value: timeStamp }
      };

      // post
      const postParams = {
        TableName: tableName,
        Key: {
          userId: userId
        },

        AttributeUpdates: skipNullAttributes(attributes)
      };

      await dynamoDb.update(postParams).promise();
    } else {
      // put
      const putParams = {
        TableName: tableName,
        Item: {
          userId: userId,
          ...data,
          createdTime: timeStamp,
          modifiedTime: timeStamp
        }
      };

      await dynamoDb.put(putParams).promise();
    }
  }
}
