import { APIGatewayEvent, Handler } from 'aws-lambda';
import * as apiConfig from '../shared/api-config';
import { config } from '../enviornment/enviornment';
import * as uuid from 'uuid';
import * as _ from 'lodash';
import { dynamoDb } from '../shared/aws-initialize';
import * as validator from '../shared/validator';
import { User, Address } from '../models/user';
import { skipNullAttributes } from '../shared/utilities';
import { UserService } from './user.service';
import { AddressData } from './address.data';
import { AddressService } from './address.service';

export const get: Handler = async (event: APIGatewayEvent) => {
  console.log('event.pathParameters!.userId ' + event.pathParameters!.userId);
  const userService = new UserService();

  return await userService.getById(event.pathParameters!.userId);
};

export const put: Handler = async (event: APIGatewayEvent) => {
  const userService = new UserService();
  return await userService.put(event);
};

export const post: Handler = async (event: APIGatewayEvent) => {
  const userService = new UserService();
  return await userService.post(event);
};

export const addressUpdate: Handler = async (event: APIGatewayEvent) => {
  const addressService = new AddressService();
  return await addressService.updateAddress(event);
};
