/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.33"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sibfrwzhsvkhtshakoaf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};
module.exports = nextConfig;
