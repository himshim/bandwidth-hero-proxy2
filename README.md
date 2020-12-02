# Bandwidth Hero Data Compression Service

This is a fork NOT primarily for adding new features. It just keeps it updated, and for minor changes.

[![CodeFactor](https://www.codefactor.io/repository/github/adityagupta150/bandwidth-hero-proxy/badge)](https://www.codefactor.io/repository/github/adityagupta150/bandwidth-hero-proxy)

The original and this fork, both are, data compression service used by
[Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) browser extension. It compresses given
image to low-res [WebP](https://developers.google.com/speed/webp/) or JPEG image. Optionally it also
converts image to greyscale to save even more data.

It downloads original image and transforms it with [Sharp](https://github.com/lovell/sharp) on the
fly without saving images on disk.

This is **NOT** an anonymizing proxy -- it downloads images on user's behalf, passing cookies
and user's IP address through to the origin host.

## Deployment

You can deploy this service to Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/AdityaGupta150/bandwidth-hero-proxy)

<!-- READ THIS ARTICLE LATER AdityaG
### Self-hosted
Data compression service is a Node.js app which you can run on any server that supports Node.js.
Check out
[this guide](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04)
on how to setup Node.js on Ubuntu. 
DigitalOcean also provides an
[easy way](https://www.digitalocean.com/products/one-click-apps/node-js/) to setup a server ready to
host Node.js apps.
-->
