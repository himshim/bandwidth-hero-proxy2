# Bandwidth Hero Data Compression Service

This is a fork of Bandwidth Hero Proxy, that focuses on providing serverless functions, instead of a dedicated server.

Currently using Netlify functions, which has a genorous limit of calls you can make, mostly enough for personal use, or small scale use, for faster and much more users, a dedicated server (code on original repo) maybe preferable :D

[![CodeFactor](https://www.codefactor.io/repository/github/adi-g15/bandwidth-hero-proxy/badge)](https://www.codefactor.io/repository/github/adi-g15/bandwidth-hero-proxy)

The original and this fork, both are, data compression service used by
[Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) browser extension. It compresses given image to low-res [WebP](https://developers.google.com/speed/webp/) or JPEG image. Optionally it also converts image to greyscale to save even more data.

It downloads original image and transforms it with [Sharp](https://github.com/lovell/sharp) on the fly without saving images on disk.

**Benefits** - In my case, it is faster to response than heroku, likely not what i thought though

> Note: It downloads images on user's behalf (By passing in same headers to the domain with required image), passing cookies and user's IP address through to the origin host.

## Deployment

You can deploy the functions to Netlify:

[![Deploy](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/adi-g15/bandwidth-hero-proxy)

Then, in the **Data Compression Service** in Bandwidth Hero extension, add `https://your-netlify-domain.netlify.app/api/index`, and you are good to go.

<!-- READ THIS ARTICLE LATER AdityaG
Check out [this guide](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04)
on how to setup Node.js on Ubuntu. 
DigitalOcean also provides an
[easy way](https://www.digitalocean.com/products/one-click-apps/node-js/) to setup a server ready to
host Node.js apps.
-->
