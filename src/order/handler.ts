import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';
import * as uuid from 'uuid';
import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { Order, OrderStatus } from '../models/user';
import { config } from '../enviornment/enviornment';
import { skipNullAttributes } from '../shared/utilities';

export const get: Handler = async (event: APIGatewayEvent) => {
  console.log('event.pathParameters!.orderId ' + event.pathParameters!.id);
  if (!event.pathParameters!.id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Request is empty.' }),
      headers: apiConfig.headers
    };
  }

  const params = {
    TableName: `Order_${config.enviornment}`,
    Key: {
      orderId: event.pathParameters!.id
    }
  };

  const response = await dynamoDb.get(params).promise();
  if (!response) {
    console.error(response);
    console.error(`No Orders found for ${event.pathParameters!.id}`);

    return {
      statusCode: 404,
      body: JSON.stringify({ message: ' No Order matching the given params' }),
      headers: apiConfig.headers
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ order: response.Item }),
    headers: apiConfig.headers
  };
};

export const getByParams: Handler = async (event: APIGatewayEvent) => {
  const userId: string = event.pathParameters!.id;
  const status: string = event.pathParameters!.status;
  const userType: string = event.pathParameters!.userType;

  let expressionName = '#taskerId';
  let idType = 'taskerId';
  if (userType.toUpperCase() === 'C') {
    expressionName = ':customerId';
    idType = 'customerId';
  }

  const params = {
    TableName: `Order_${config.enviornment}`,
    FilterExpression: `#status = :status and  #userId = ${expressionName}`,
    ExpressionAttributeNames: {
      '#userId': idType,
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      [expressionName]: userId,
      ':status': status.toUpperCase()
    }
  };

  console.log(`params - ${JSON.stringify(params)}`);

  const orders = await dynamoDb.scan(params).promise();

  if (!orders || orders.Items.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: ' No Order matching the given params' }),
      headers: apiConfig.headers
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ orders: orders.Items }),
    headers: apiConfig.headers
  };
};

export const put: Handler = async (event: APIGatewayEvent) => {
  const orderRequest: Order = validator.isRequestValid(event);

  if (orderRequest.statusCode) {
    // invalid request.
    return orderRequest;
  }

  if (
    !orderRequest.customerId ||
    !orderRequest.taskerId ||
    !orderRequest.scheduledWorkHours ||
    !orderRequest.scheduledTime ||
    !orderRequest.scheduledDate ||
    !orderRequest.expectedCost ||
    !orderRequest.currency ||
    !orderRequest.serviceType
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing mandatory fields.' }),
      headers: apiConfig.headers
    };
  }

  const timeStamp = new Date().getTime();
  const orderId = uuid.v1();
  try {
    const existingOrders: Order = await getOrderByUserAndCustomerIds(orderRequest);

    if (!existingOrders) {
      const params = {
        TableName: `Order_${config.enviornment}`,
        Item: {
          orderId: orderId,
          ...orderRequest,
          createdTime: timeStamp,
          modifiedTime: timeStamp
        }
      };

      await dynamoDb.put(params).promise();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ orderNumber: (existingOrders && existingOrders.orderId) || orderId }),
      headers: apiConfig.headers
    };
  } catch (error) {
    console.error(`Couldnt create the order ${orderRequest}. ${JSON.stringify(error)}`);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Couldnt create the customer ${orderRequest}.` }),
      headers: apiConfig.headers
    };
  }
};

export const post: Handler = async (event: APIGatewayEvent) => {
  const orderUpdateRequest: Order = validator.isRequestValid(event);

  if (orderUpdateRequest['statusCode']) {
    // invalid request.
    return orderUpdateRequest;
  }

  if (!orderUpdateRequest.orderId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing mandatory fields.' }),
      headers: apiConfig.headers
    };
  }

  const timeStamp = new Date().getTime();

  if (orderUpdateRequest.status.toUpperCase() === OrderStatus.Completed) {
    if (
      !orderUpdateRequest.completionDate ||
      !orderUpdateRequest.endTime ||
      !orderUpdateRequest.startTime ||
      !orderUpdateRequest.totalCost ||
      !orderUpdateRequest.totalWorkHours ||
      !orderUpdateRequest.isCompleted
    ) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: `Missing mandatory fields to set the status as COMPLETE for order - ${orderUpdateRequest.orderId} `
        }),
        headers: apiConfig.headers
      };
    }
  }

  try {
    const attributes = {
      scheduledDate: { Action: 'PUT', Value: orderUpdateRequest.scheduledDate },
      scheduledTime: { Action: 'PUT', Value: orderUpdateRequest.scheduledTime },
      expectedCost: { Action: 'PUT', Value: orderUpdateRequest.expectedCost },
      isCompleted: { Action: 'PUT', Value: orderUpdateRequest.isCompleted },
      completionDate: { Action: 'PUT', Value: orderUpdateRequest.completionDate },
      startTime: { Action: 'PUT', Value: orderUpdateRequest.startTime },
      endTime: { Action: 'PUT', Value: orderUpdateRequest.endTime },
      status: { Action: 'PUT', Value: orderUpdateRequest.status },
      totalCost: { Action: 'PUT', Value: orderUpdateRequest.totalCost },
      totalWorkHours: { Action: 'PUT', Value: orderUpdateRequest.totalWorkHours },
      ModifiedTime: { Action: 'PUT', Value: timeStamp }
    };

    const params = {
      TableName: `Order_${config.enviornment}`,
      Key: {
        orderId: orderUpdateRequest.orderId
      },

      AttributeUpdates: skipNullAttributes(attributes)
    };

    await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'Success' }),
      headers: apiConfig.headers
    };
  } catch (error) {
    console.error(`Couldnt update the order ${orderUpdateRequest}. ${JSON.stringify(error)}`);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Couldnt update the order ${orderUpdateRequest}.` }),
      headers: apiConfig.headers
    };
  }
};

async function getOrderByUserAndCustomerIds(orderRequest: Order) {
  const params = {
    TableName: `Order_${config.enviornment}`,
    FilterExpression:
      'taskerId = :taskerId and customerId = :customerId and serviceType = :serviceType and scheduledDate = :scheduledDate',
    ExpressionAttributeValues: {
      ':taskerId': orderRequest.taskerId,
      ':customerId': orderRequest.customerId,
      ':scheduledDate': orderRequest.scheduledDate,
      ':serviceType': orderRequest.serviceType
    }
  };

  const response = await dynamoDb.scan(params).promise();
  console.log(`response  ${JSON.stringify(response.Items[0])}`);
  return response.Items[0] as Order;
}
