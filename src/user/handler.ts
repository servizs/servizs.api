import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';
import { config } from '../enviornment/enviornment';
import * as uuid from 'uuid';

import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { User, Address } from '../models/user';

export const get: Handler = async (event: APIGatewayEvent) => {
  if (!event.pathParameters!.userId) {
    return {
      statusCode: 400,
      body: { error: 'Request is empty.' },
      headers: apiConfig.headers
    };
  }

  const response = await getProfile(event.pathParameters!.userId);

  if (!response) {
    return {
      statusCode: 404,
      headers: apiConfig.headers,
      body: {
        errorMessage: `Couldnt retrieve the details for user ${event.pathParameters!.userId}`
      }
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response.Item),
    headers: apiConfig.headers
  };
};

export const put: Handler = async (event: APIGatewayEvent) => {
  const data = validator.isRequestValid(event);

  if (data.statusCode) {
    // invalid request.
    return data;
  }

  if (!isRequestValid(data)) {
    console.error('Request is empty.');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing mandatory fields.' }),
      headers: apiConfig.headers
    };
  }

  const timeStamp = new Date().getTime();
  const userId = uuid.v1();

  const params = {
    TableName: `User_Profle_${config.enviornment}`,
    Item: {
      UserId: userId,
      ...data,
      createdTime: timeStamp,
      modifiedTime: timeStamp
    }
  };

  try {
    // check for existing user.
    const profile = await getProfileByEmail(data.emailAddress);
    if (profile) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          errorMessage: `The user email address or Id ${data.emailAddress} already exists.`
        }),
        headers: apiConfig.headers
      };
    }

    // PUT user into db.
    await dynamoDb.put(params).promise();
    const address = {
      city: data.city,
      province: data.province,
      country: data.country
    };

    await updateAddress(address, userId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        userId: userId
      }),
      headers: apiConfig.headers
    };
  } catch (error) {
    console.error(`Couldnt create the user ${params}. ${JSON.stringify(error)}`);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Couldnt create the customer ${data}.` }),
      headers: apiConfig.headers
    };
  }
};

export const post: Handler = async (event: APIGatewayEvent) => {
  const data: User = validator.isRequestValid(event);

  if (data['statusCode']) {
    // invalid request.
    return data;
  }

  if (!data.userId) {
    console.error('Request is empty.');
    return {
      statusCode: 400,
      body: { error: 'Missing mandatory fields.' },
      headers: apiConfig.headers
    };
  }

  const timeStamp = new Date().getTime();

  try {
    const params = {
      TableName: `User_Profle_${config.enviornment}`,
      Key: {
        UserId: data.userId
      },

      UpdateExpression: `set 
                firstName = :firstName, 
                lastName = :lastName, 
                dateOfBirth = :dateOfBirth,
                photoPath = :photoPath,
                phoneNumber = :phoneNumber,
                modifiedTime = :modifiedTime`,
      ExpressionAttributeValues: {
        ':firstName': data.firstName,
        ':lastName': data.lastName,
        ':dateOfBirth': data.dateOfBirth,
        ':phoneNumber': data.phoneNumber,
        ':modifiedTime': timeStamp,
        ':photoPath': data.picture
      }
    };

    await dynamoDb.update(params).promise();

    // Update additional user Info
    await updateAdditionalInfo(data);

    const address = {
      unitNo: data.unitNo,
      streetName: data.streetName,
      streetNumber: data.streetNumber,
      postalCode: data.postalCode,
      city: data.city,
      province: data.province,
      country: data.country
    };

    // Update Address
    await updateAddress(address, data.userId);

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'Success' }),
      headers: apiConfig.headers
    };
  } catch (error) {
    console.error(`Couldnt update the user ${data}. ${JSON.stringify(error)}`);

    return {
      statusCode: 500,
      body: { error: `Couldnt update the customer ${data}.` },
      headers: apiConfig.headers
    };
  }
};

export const addressUpdate: Handler = async (event: APIGatewayEvent) => {
  const data: User = validator.isRequestValid(event);

  if (data['statusCode'] || !data.userId) {
    // invalid request.
    return data;
  }

  try {
    await updateAddress(data, data.userId);
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
};

function isRequestValid(data: User): boolean {
  console.log('-----' + JSON.stringify(data));
  if (!data.firstName || !data.lastName || !data.city || !data.province || !data.country || !data.emailAddress) {
    return false;
  }

  return true;
}

async function updateAddress(data: Address, userId: string) {
  const tableName = `Address_${config.enviornment}`;
  const params = {
    TableName: tableName,
    Key: {
      UserId: userId
    }
  };

  const response = await dynamoDb.get(params).promise();
  const timeStamp = new Date().getTime();

  if (response.Item) {
    // post
    const postParams = {
      TableName: tableName,
      Key: {
        UserId: userId
      },

      UpdateExpression: `set 
                UnitNo = :unitNo, 
                StreetNumber = :streetNumber, 
                StreetName = :streetName,
                City = :city, 
                Province = :province,
                Country = :country
                PostalCode = :postalCode,
                ModifiedTime = :modifiedTime
                `,
      ExpressionAttributeValues: {
        ':unitNo': data.unitNo,
        ':streetNumber': data.streetNumber,
        ':streetName': data.streetName,
        ':city': data.city,
        ':province': data.province,
        ':country': data.country,
        ':postalCode': data.postalCode,
        ':modifiedTime': timeStamp
      }
    };

    await dynamoDb.update(postParams).promise();
  } else {
    // put
    const putParams = {
      TableName: tableName,
      Item: {
        UserId: userId,
        ...data,
        createdTime: timeStamp,
        modifiedTime: timeStamp
      }
    };

    await dynamoDb.put(putParams).promise();
  }
}

async function updateAdditionalInfo(data: any) {
  const tableName = `User_Profle_Additional_Info${config.enviornment}`;
  const params = {
    TableName: tableName,
    Key: {
      UserId: data.userId
    }
  };

  const response = await dynamoDb.get(params).promise();
  const timeStamp = new Date().getTime();

  const { userId, perHourCost, currency, minimumWorkHours, stripeAccountId } = data;

  if (response.Item) {
    // post
    const postParams = {
      TableName: tableName,
      Key: {
        UserId: userId
      },

      UpdateExpression: `set 
                PerHourCost = :perHourCost, 
                Currency = :currency, 
                MinimumWorkHours = :minimumWorkHours,
                ModifiedTime = :modifiedTime,
                StripeAccountId = :stripeAccountId`,
      ExpressionAttributeValues: {
        ':perHourCost': perHourCost,
        ':currency': currency,
        ':minimumWorkHours': minimumWorkHours,
        ':stripeAccountId': stripeAccountId,
        ':modifiedTime': timeStamp
      }
    };

    await dynamoDb.update(postParams).promise();
  } else {
    // put

    const putParams = {
      TableName: tableName,
      Item: {
        UserId: userId,
        perHourCost,
        currency,
        minimumWorkHours,
        stripeAccountId,
        createdTime: timeStamp,
        modifiedTime: timeStamp
      }
    };

    await dynamoDb.put(putParams).promise();
  }
}

async function getProfile(userId: string) {
  const params = {
    TableName: `User_Profle_${config.enviornment}`,
    Key: {
      UserId: userId
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

async function getProfileByEmail(emailAddress: string) {
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
  if (response.Items.length === 0) {
    console.error(response);
    console.error(`Error while retrieving the  user - ${emailAddress} ${JSON.stringify(response)}`);

    return null;
  }

  return response.Items;
}
