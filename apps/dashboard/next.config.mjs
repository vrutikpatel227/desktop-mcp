/** @type {import('next').NextConfig} */
const commonHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
];

const developmentCsp = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss:; img-src 'self' data:;";
const productionCsp = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; img-src 'self' data:;";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    const csp = process.env.NODE_ENV === 'production' ? productionCsp : developmentCsp;
    return [{ source: '/(.*)', headers: [...commonHeaders, { key: 'Content-Security-Policy', value: csp }] }];
  }
};

export default nextConfig;
