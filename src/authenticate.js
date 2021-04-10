// require("dotenv").config();
// const PASSCODE = process.env.PASSCODE;

module.exports = (req, res, next) => {
	// if (PASSCODE) {
	// 	const pass = (req.body ? req.body.pass: "") || "";
	// 	if ( pass !== PASSCODE ) {
	// 		// @todo @me -> Read abt this
	// 		res.setHeader("WWW-Authenticate", "Basic realm=\"Bandwidth-Hero Compression Service\"");

	// 		return res.sendStatus(401);
	// 	}
	// }

	next();
};
