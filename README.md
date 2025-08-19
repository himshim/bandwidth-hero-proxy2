# Bandwidth Hero Data Compression Service 🚀

This is a **serverless** port of the [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) Data Compression Service.  
It compresses images on-the-fly using [Sharp](https://github.com/lovell/sharp), reducing bandwidth and speeding up browsing.  

👉 Works perfectly with the [Bandwidth Hero browser extension](https://bandwidth-hero.com).

---

## ✨ Features
- Converts images to low-res **WebP** or **JPEG** on demand.
- Optional **grayscale** mode for extra savings.
- Runs on **Netlify Functions** → no sleeping servers, faster startup.
- Automatically forwards cookies and IP headers, so sites work normally.
- Landing page **shows your deployed domain automatically** (no manual copy needed).

---

## 🚀 Deployment (One-Click)
Click the button below to deploy your own proxy service on Netlify:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/himshim/bandwidth-hero-proxy2)

---

## 🔧 Setup in Bandwidth Hero Extension
1. Install the [Bandwidth Hero extension](https://bandwidth-hero.com).  
2. Open extension settings → **Data Compression Service**.  
3. Copy the URL shown on your deployed Netlify site’s homepage (it will look like):https://your-app-name.netlify.app/api/index
4. Save and enjoy compressed browsing 🎉  

*(No need to type your domain manually — just open your deployed homepage and copy the URL shown there.)*

---

## 📝 Notes
## 📝 Notes
- Compression quality is usually set **from the Bandwidth Hero extension** (via its slider).  
- If the extension does not specify a quality, the proxy uses `DEFAULT_QUALITY` (default = 40, can be changed in Netlify environment variables).  
- Images are fetched and compressed **on-the-fly**. Nothing is stored.  
- Works best with image-heavy websites where bandwidth savings matter.
---

## 🙏 Credits
- Original project: [adi-g15/bandwidth-hero-proxy](https://github.com/adi-g15/bandwidth-hero-proxy)  
- Built on the excellent [Sharp](https://github.com/lovell/sharp) library  
- Maintained by: [@himshim](https://github.com/himshim)  

---

## 📜 License
MIT License – Free to use, modify, and share.