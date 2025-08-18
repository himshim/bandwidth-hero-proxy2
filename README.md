# Bandwidth Hero Proxy2

A server stateless image compression proxy for the Bandwidth Hero browser extension. It compresses images to WebP or JPEG (with optional grayscale) to save bandwidth. This is a hobby project maintained by someone with limited coding knowledge, so contributions and help to improve it are very welcome!

## Credits
This project is a fork with updates to make it more user-friendly and serverless-focused. Special thanks to:
- [**adi-g15/bandwidth-hero-proxy**](https://github.com/adi-g15/bandwidth-hero-proxy) for the original Netlify deployment code.
- [**ayastreb/bandwidth-hero-proxy**](https://github.com/ayastreb/bandwidth-hero-proxy) for the original proxy code.

## Features
- Compresses images on the fly using Sharp.
- Supports WebP and JPEG formats.
- Optional grayscale conversion.
- Deployable on Netlify or self-hosted (local/Docker).

## Deployment

### Option 1: One-Click Deploy to Netlify
Click below to deploy instantly:
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/himshim/bandwidth-hero-proxy2)

After deployment:
1. Copy the Netlify URL (e.g., `https://your-site.netlify.app/api/index`).
2. Open the Bandwidth Hero extension settings.
3. Paste the URL in the "Data Compression Service" field.
4. Save and test.

### Option 2: Manual Netlify Deployment
1. Fork this repository.
2. In Netlify, go to "New site from Git" and select your fork.
3. Set:
   - Build command: `npm run build`
   - Functions directory: `functions`
   - Publish directory: `.`
4. Deploy and use the `/api/index` endpoint in the extension.

### Option 3: Self-Hosting with Docker
1. Install [Docker](https://www.docker.com/get-started).
2. Clone this repo: `git clone https://github.com/himshim/bandwidth-hero-proxy2`
3. Build: `5643 docker build -t bandwidth-hero-proxy .`
4. Run: `docker run -p 3000:3000 bandwidth-hero-proxy`
5. Use `http://localhost:3000/api/index` in the extension.

### Option 4: Local Development
1. Clone this repo: `git clone https://github.com/himshim/bandwidth-hero-proxy2`
2. Install Node.js (v20+).
3. Run `npm install` in the repo folder.
4. Start: `npm run start:local`
5. Test at `http://localhost:3000/api/index?url=https://example.com/image.jpg&quality=50`

## Configuration
- **Query Parameters**:
  - `url`: Image URL to compress (required).
  - `quality`: Compression level (1–100, default 50).
  - `grayscale`: Set to `true` for grayscale (default `false`).
  - `format`: Output format (`webp` or `jpeg`, default `webp`).
- **Environment Variables** (optional):
  - `PORT`: Server port (default 3000).
  - `DEFAULT_QUALITY`: Default compression level (default 50).

## Troubleshooting
- **Netlify Deploy Fails**: Check Node version (20+) in `package.json`.
- **"Invalid Compression Service Address"**: Ensure endpoint is `/api/index`.
- **Image Not Loading**: Verify the image URL works and check server logs.
- **Need Help?**: File an issue at https://github.com/himshim/bandwidth-hero-proxy2/issues.

## Contributing
This is a hobby project, and I have very limited coding knowledge. Please contribute by submitting issues, pull requests, or suggestions to improve the project! Check out https://github.com/himshim/bandwidth-hero-proxy2/issues.

## License
MIT