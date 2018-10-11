import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';

import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { SearchParams, TaskerAdditionalinfo } from '../models/user';

export const search: Handler = async (event: APIGatewayEvent) => {
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

    // const searchResult: any[] = [];
    const searchResult: any[] = await Promise.all(
      addressResponse.Items.map(async address => {
        const additionalInfoParams = {
          TableName: apiConfig.DbTable.UserAdditionalInfo,
          Key: {
            UserId: address.UserId
          }
        };

        const additionalInfo = await dynamoDb.get(additionalInfoParams).promise();

        if (!additionalInfo || !additionalInfo.Item) {
          console.error(additionalInfo);
          console.error(`Couldnt retrieve the user - ${address.UserId} - additional Information`);
          return;
        }

        const costRanges = data.costRange.split(' - ');

        if ((additionalInfo.Item as TaskerAdditionalinfo).perHourCost <= +costRanges[1]) {
          const userParams = {
            TableName: apiConfig.DbTable.UserProfile,
            Key: {
              UserId: address.UserId
            }
          };

          const userProfile = await dynamoDb.get(userParams).promise();

          if (!userProfile || !userProfile.Item) {
            console.error(userProfile);
            console.error(`Couldnt retrieve the user - ${address.UserId} - profile`);
            return;
          }

          const { firstName, lastName, picture, emailAddress, phoneNumber } = userProfile.Item;

          const reviewParams = {
            TableName: apiConfig.DbTable.Reviews,
            FilterExpression: 'UserId = :userId',
            ExpressionAttributeValues: {
              ':userId': address.UserId
            }
          };

          const reviews = await dynamoDb.scan(reviewParams).promise();
          console.log(`...........------- ${JSON.stringify(userProfile.Item)}`);
          if (reviews.Items.length !== 0) {
            return {
              ...addressResponse,
              ...additionalInfo.Item,
              firstName,
              lastName,
              picture,
              emailAddress,
              phoneNumber,
              rating: reviews.Items['rating'],
              comments: reviews.Items['comments']
            };
          } else {
            return {
              ...addressResponse,
              ...additionalInfo.Item,
              firstName,
              lastName,
              picture,
              emailAddress,
              phoneNumber
            };
          }
        }
      })
    );
    console.log('*** SearchResut 2 ' + JSON.stringify(searchResult));
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

function searchResultMap(addressResponse: any) {}
