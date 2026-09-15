/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mupdf", "sharp"],
  outputFileTracingIncludes: { "/api/upload": ["./static/temp_watermark.png"] },
};

export default nextConfig;
