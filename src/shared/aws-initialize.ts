import * as AWS from 'aws-sdk';
import { config } from '../enviornment/enviornment';

AWS.config.update({
  region: config.aws.region
});

export const dynamoDb = new AWS.DynamoDB.DocumentClient();

/*
var rawClient = dynamodb.raw;  // returns an instance of new AWS.DynamoDB()

var dynamoDb = dynamodb.doc;  // return an instance of new AWS.DynamoDB.DocumentClient()
  */
