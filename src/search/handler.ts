import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';

import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { SearchParams, TaskerAdditionalinfo } from '../models/user';

export const addressUpdate: Handler = async (event: APIGatewayEvent) => {
  const data: SearchParams = validator.isRequestValid(event);

  if (data['statusCode']) {
    // invalid request.
    return data;
  }

  if (data.city || data.province) {
    const addressParams = {
      TableName: apiConfig.DbTable.Address,
      FilterExpression: 'city = :city and province = :province and country = :country',
      ExpressionAttributeValues: {
        ':city': data.city,
        ':province': data.province,
        ':country': data.country
      }
    };

    const addressResponse = await dynamoDb.scan(addressParams).promise();

    if (!addressResponse || !addressResponse.Items) {
      console.error(addressResponse);
      console.error('Couldnt retrieve any users on your locality');

      return {
        statusCode: 400,
        body: { error: 'Couldnt retrieve any users on your locality' },
        headers: apiConfig.headers
      };
    }

    const searchResult: any[] = [];
    addressResponse.Items.forEach(async address => {
      const additionalInfoParams = {
        TableName: apiConfig.DbTable.UserAdditionalInfo,
        Key: {
          userId: address.userId
        }
      };

      const additionalInfo = await dynamoDb.get(additionalInfoParams).promise();

      if (!additionalInfo || !additionalInfo.Item) {
        console.error(additionalInfo);
        console.error(`Couldnt retrieve the user - ${address.userId} - additional Information`);
        return;
      }

      const costRanges = data.costRange.split(' - ');

      if ((additionalInfo.Item as TaskerAdditionalinfo).perHourCost <= +costRanges[2]) {
        const userParams = {
          TableName: apiConfig.DbTable.UserProfile,
          Key: {
            userId: address.userId
          }
        };

        const userProfile = await dynamoDb.get(userParams).promise();

        if (!userProfile || !userProfile.Item) {
          console.error(userProfile);
          console.error(`Couldnt retrieve the user - ${address.userId} - profile`);
          return;
        }

        const { firtName, lastName, picture, emailAddress, phoneNumber } = userProfile.Item;

        const reviewParams = {
          TableName: apiConfig.DbTable.Reviews,
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': address.userId
          }
        };

        const reviews = await dynamoDb.scan(reviewParams).promise();

        if (reviews.Items) {
          searchResult.push({
            ...addressResponse,
            ...additionalInfo.Item,
            firtName,
            lastName,
            picture,
            emailAddress,
            phoneNumber,
            rating: reviews.Items['rating'],
            comments: reviews.Items['comments']
          });
        } else {
          searchResult.push({
            ...addressResponse,
            ...additionalInfo.Item,
            firtName,
            lastName,
            picture,
            emailAddress,
            phoneNumber
          });
        }
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(searchResult),
      headers: apiConfig.headers
    };
  } else {
    console.error('Request is empty.');
    return {
      statusCode: 400,
      body: { error: 'Missing either City Or Provice in the Search Params' },
      headers: apiConfig.headers
    };
  }
};
