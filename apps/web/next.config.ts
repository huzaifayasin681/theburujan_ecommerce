import type { NextConfig } from 'next';
const nextConfig:NextConfig={output:'standalone',images:{remotePatterns:[{protocol:'http',hostname:'localhost'},{protocol:'https',hostname:'**'}]},experimental:{optimizePackageImports:['lucide-react']}};export default nextConfig;
