
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export", // Required for static export
  images: {
    unoptimized: true, // GitHub Pages does not support Next.js Image Optimization
  },
  basePath: isProd ? "/tiled-clone" : "", // Replace 'your-repo-name' with your GitHub repo name
  assetPrefix: isProd ? "/tiled-clone/" : "",
};

export default nextConfig;