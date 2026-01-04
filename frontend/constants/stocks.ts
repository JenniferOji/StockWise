export interface Stock {
  symbol: string;
  companyName: string;
  shares: number;
  sector: string;
  imageUrl: string;
}

export const STOCKS: Stock[] = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    shares: 0,
    sector: 'Technology',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/500px-Apple_logo_black.svg.png'
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    shares: 0,
    sector: 'Technology',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/500px-Nvidia_logo.svg.png'
  },
  {
    symbol: 'NFLX',
    companyName: 'Netflix, Inc.',
    shares: 0,
    sector: 'Communication Services',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Netflix_icon.svg/500px-Netflix_icon.svg.png'
  },
  {
    symbol: 'KO',
    companyName: 'The Coca-Cola Company',
    shares: 0,
    sector: 'Consumer Staples',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/500px-Coca-Cola_logo.svg.png'
  },
  {
    symbol: 'ORCL',
    companyName: 'Oracle Corporation',
    shares: 0,
    sector: 'Technology',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Oracle_Logo.svg/500px-Oracle_Logo.svg.png'
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    shares: 0,
    sector: 'Technology',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/500px-Microsoft_logo_%282012%29.svg.png'
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc. (Google)',
    shares: 0,
    sector: 'Technology',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/500px-Google_2015_logo.svg.png'
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    shares: 0,
    sector: 'Consumer Discretionary',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Amazon_icon.svg/500px-Amazon_icon.svg.png'
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    shares: 0,
    sector: 'Consumer Discretionary',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Tesla_logo.png/800px-Tesla_logo.png'
  }
];