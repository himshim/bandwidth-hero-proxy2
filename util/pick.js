// Since only single function required from lodash or underscore, writing it self

// Picks specific properties from an object
module.exports = (object, properties) => {
  let picked = {};
  for (let key in object || (object = {})) {
    if (Object.hasOwnProperty.call(object, key) && properties.includes(key)) {
      picked[key] = object[key];
    }
  }
  return picked;
};