export type LandingUrls = {
  hub: string;
  pos: string;
  hr: string;
  techservices: string;
};

export function getLandingUrls(): LandingUrls {
  return {
    hub: process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3001",
    pos: process.env.NEXT_PUBLIC_POS_URL ?? "http://localhost:3002",
    hr: process.env.NEXT_PUBLIC_HR_URL ?? "http://localhost:3003",
    techservices: process.env.NEXT_PUBLIC_TECHSERVICES_URL ?? "http://localhost:3004",
  };
}
