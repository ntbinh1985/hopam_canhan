import type { NextConfig } from "next";

// Kỹ thuật "Rải thảm" IP:
// Tạo sẵn toàn bộ các trường hợp IP phổ biến để Next.js tự động chấp nhận kết nối.
const generateAllowedIps = () => {
  const ips: string[] = [];
  
  // 1. Phủ toàn bộ dải mạng 192.168.x.x (Mạng gia đình, công ty, nhà trọ...)
  for (let i = 0; i <= 255; i++) {
    for (let j = 0; j <= 255; j++) {
      const ip = `192.168.${i}.${j}`;
      ips.push(ip, `${ip}:3001`, `${ip}:3000`);
    }
  }
  
  // 2. Phủ toàn bộ dải mạng 10.0.x.x (Các quán Cafe, hệ thống mạng diện rộng)
  for (let i = 0; i <= 255; i++) {
    for (let j = 0; j <= 255; j++) {
      const ip = `10.0.${i}.${j}`;
      ips.push(ip, `${ip}:3001`, `${ip}:3000`);
    }
  }
  
  return ips;
};

const dynamicAllowedIps = generateAllowedIps();

const nextConfig: NextConfig = {
  // Cho phép điện thoại tải giao diện từ bất kỳ lớp mạng nào
  allowedDevOrigins: [
    "hopam.local",
    "hopam.local:80",
    "hopam.local:3000",
    "localhost:3001",
    "localhost:3000",
    ...dynamicAllowedIps, 
  ],
  
  // Cho phép điện thoại gửi lệnh Thêm/Sửa/Xóa Bài Hát
  experimental: {
    serverActions: {
      allowedOrigins: [
        "hopam.local",
        "hopam.local:80",
        "localhost:3001",
        ...dynamicAllowedIps,
      ],
    },
  },
};

export default nextConfig;
