import { APIGatewayEvent } from 'aws-lambda';
import * as apiConfig from './api-config';

export function isRequestValid(event: APIGatewayEvent): any {
  console.log(JSON.stringify(event));

  const jsonData = event.body || '';

  if (!event.body) {
    console.error('Request is empty.');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Request is empty.' }),
      headers: apiConfig.headers
    };
  }

  return JSON.parse(jsonData);
}
