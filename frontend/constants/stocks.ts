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
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/500px-Apple_logo_black.svg.png'
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    shares: 10,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Nvidia_logo.svg/500px-Nvidia_logo.svg.png'
  },
  {
    symbol: 'NFLX',
    companyName: 'Netflix, Inc.',
    shares: 8,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/500px-Netflix_2015_logo.svg.png'
  },
  {
    symbol: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    shares: 25,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/JPMorgan_Chase_Logo_2016.svg/500px-JPMorgan_Chase_Logo_2016.svg.png'
  },
  {
    symbol: 'BAC',
    companyName: 'Bank of America Corporation',
    shares: 30,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Bank_of_America_logo.svg/500px-Bank_of_America_logo.svg.png'
  },
  {
    symbol: 'DIS',
    companyName: 'The Walt Disney Company',
    shares: 14,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney_wordmark.svg/500px-Disney_wordmark.svg.png'
  },
  {
    symbol: 'KO',
    companyName: 'The Coca-Cola Company',
    shares: 40,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Coca-Cola_logo.svg/500px-Coca-Cola_logo.svg.png'
  },
  {
    symbol: 'PFE',
    companyName: 'Pfizer Inc.',
    shares: 18,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Pfizer_logo.svg/500px-Pfizer_logo.svg.png'
  },
  {
    symbol: 'ORCL',
    companyName: 'Oracle Corporation',
    shares: 12,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Oracle_logo.svg/500px-Oracle_logo.svg.png'
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    shares: 32,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/500px-Microsoft_logo.svg.png'
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc. (Google)',
    shares: 15,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/500px-Google_2015_logo.svg.png'
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com, Inc.',
    shares: 6,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/500px-Amazon_logo.svg.png'
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    shares: 12,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/500px-Tesla_Motors.svg.png'
  }
];