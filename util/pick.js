// Since only single function required from lodash or underscore, writing it self

module.exports = (obj, keys) => {
	const new_obj = {};

	if(!obj)	obj={};
	if( ! Array.isArray(keys) ){
		keys = [keys];	// convert to array
	}

	for (const key in obj) {
		if (Object.hasOwnProperty.call(obj, key) && keys.includes(key)) {
			new_obj[key] = obj[key];
		}
	}

	return new_obj;
};
