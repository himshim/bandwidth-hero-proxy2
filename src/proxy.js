const request = require("request-compose").client;
const pick = require("../util/pick");
const shouldCompress = require("./shouldCompress");
const redirect = require("./redirect");
const compress = require("./compress");
const bypass = require("./bypass");
const copyHeaders = require("./copyHeaders");

async function proxy(org_req, org_res) {
	request({
		method: "GET",
		url: org_req.params.url,
		headers: {
			...pick(org_req.headers, ["cookie", "dnt", "referer"]),
			"user-agent": "Bandwidth-Hero Compressor",
			"x-forwarded-for": org_req.headers["x-forwarded-for"] || org_req.ip,
			via: "1.1 bandwidth-hero"
		}
		// timeout: 10000,
		// maxRedirects: 5,
		// encoding: null,
		// strictSSL: false,
		// gzip: true,
		// jar: true
	}).then(({res, body}) => {
		if( res.statusCode >= 400 )	return redirect(org_req, org_res);

		copyHeaders( res, org_res );

		org_res.setHeader("content-encoding", "identity");
		org_req.params.originType = res.headers["content-type"] || "";
		org_req.params.originSize = body.length;

		if( shouldCompress(org_req) ){
			compress(org_req, org_res, body);
		}else{
			bypass(org_req, org_res, body);
		}
	})
		.catch(err => {
			console.log("Error while fetching url");
			return redirect(org_req, org_res);
		});
}

module.exports = proxy;
