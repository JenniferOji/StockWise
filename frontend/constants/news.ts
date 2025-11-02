export interface NewsItem {
  companyName: string;
  headline: string;
  imageUrl: string;
  sentiment: number;
  date: string;
}

export const NEWS: NewsItem[] = [
  {
    companyName: "Apple Inc.",
    headline: "Apple reports stronger-than-expected iPhone sales as holiday demand rises",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    sentiment: 0.78,
    date: "2025-10-28",
  },
  {
    companyName: "Microsoft Corporation",
    headline: "Microsoft announces cloud services expansion in Europe to meet growing enterprise demand",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
    sentiment: 0.65,
    date: "2025-10-30",
  },
  {
    companyName: "Tesla, Inc.",
    headline: "Tesla delays next-gen battery rollout but confirms factory upgrades to boost capacity",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Tesla_Motors.svg",
    sentiment: -0.12,
    date: "2025-10-25",
  },
  {
    companyName: "Amazon.com, Inc.",
    headline: "Amazon unveils new logistics hub and same-day delivery pilot in major metro areas",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    sentiment: 0.55,
    date: "2025-10-27",
  },
  {
    companyName: "Alphabet Inc.",
    headline: "Alphabet's AI unit secures strategic partnerships to accelerate search and advertising features",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
    sentiment: 0.69,
    date: "2025-10-29",
  },
];
