export interface Stock {
  symbol: string;
  companyName: string;
  shares: number;
  imageUrl: string;
}

export const STOCKS: Stock[] = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    shares: 48,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
  },
  {
    symbol: 'META',
    companyName: 'Meta Platforms, Inc.',
    shares: 20,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Meta_Platforms_Logo_2023.svg'
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    shares: 10,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Nvidia_logo.svg'
  },
  {
    symbol: 'NFLX',
    companyName: 'Netflix, Inc.',
    shares: 8,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg'
  },
  {
    symbol: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    shares: 25,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/JPMorgan_Chase_Logo_2016.svg'
  },
  {
    symbol: 'BAC',
    companyName: 'Bank of America Corporation',
    shares: 30,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Bank_of_America_logo.svg'
  },
  {
    symbol: 'DIS',
    companyName: 'The Walt Disney Company',
    shares: 14,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney_wordmark.svg'
  },
  {
    symbol: 'KO',
    companyName: 'The Coca-Cola Company',
    shares: 40,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Coca-Cola_logo.svg'
  },
  {
    symbol: 'PFE',
    companyName: 'Pfizer Inc.',
    shares: 18,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Pfizer_logo.svg'
  },
  {
    symbol: 'ORCL',
    companyName: 'Oracle Corporation',
    shares: 12,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg'
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    shares: 32,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg'
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc. (Google)',
    shares: 15,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg'
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    shares: 6,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg'
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    shares: 12,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Tesla_Motors.svg'
  }
];