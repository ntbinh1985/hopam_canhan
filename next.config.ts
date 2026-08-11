import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Cho phép tải tài nguyên Dev từ tên miền OrbStack và localhost (Fix lỗi 403 Forbidden)
  allowedDevOrigins: [
    "hopam.local",
    "hopam.local:80",
    "hopam.local:3000",
    "localhost:3001",
    "localhost:3000",
  ],
  // 2. Cho phép gửi dữ liệu API/Server Actions từ các tên miền này
  experimental: {
    serverActions: {
      allowedOrigins: [
        "hopam.local",
        "hopam.local:80",
        "localhost:3001",
      ],
    },
  },
};

export default nextConfig;