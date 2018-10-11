import * as _ from 'lodash';

export const skipNullAttributes = attributes => {
  return _.omitBy(attributes, attr => {
    return _.isNil(attr.Value);
  });
};
