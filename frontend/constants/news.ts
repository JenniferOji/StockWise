export interface NewsItem {
  companyName: string;
  headline: string;
  imageUrl: string;
  sentiment: number;
  date: string;
}

export const NEWS: NewsItem[] = [
  {
    companyName: "BBC News - AAPL",
    headline: "Apple reports stronger-than-expected iPhone sales as holiday demand rises",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BBC_News_2019.svg/500px-BBC_News_2019.svg.png",
    sentiment: 0.78,
    date: "2025-10-28",
  },
  {
    companyName: "CNN - MSFT",
    headline: "Microsoft announces cloud services expansion in Europe to meet growing enterprise demand",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/500px-CNN.svg.png",
    sentiment: 0.65,
    date: "2025-10-30",
  },
  {
    companyName: "Fox News - TSLA",
    headline: "Tesla delays next-gen battery rollout but confirms factory upgrades to boost capacity",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Fox_News_Channel_logo.svg/500px-Fox_News_Channel_logo.svg.png",
    sentiment: -0.12,
    date: "2025-10-25",
  },
  {
    companyName: "CNBC - AMZN",
    headline: "Amazon unveils new logistics hub and same-day delivery pilot in major metro areas",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/CNBC_logo.svg/500px-CNBC_logo.svg.png",
    sentiment: 0.55,
    date: "2025-10-27",
  },
  {
    companyName: "The Guardian - GOOGL",
    headline: "Alphabet's AI unit secures strategic partnerships to accelerate search and advertising features",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Guardian.svg/500px-The_Guardian.svg.png",
    sentiment: 0.69,
    date: "2025-10-29",
  },
];
