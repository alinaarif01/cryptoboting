import './globals.css';

export const metadata = {
  title: 'CypherBot Pro | High-Accuracy Algorithmic Crypto Trading Platform',
  description: 'Advanced quantitative crypto trading bot with persistent database, live candlestick charts, 85%+ accuracy AI alpha backtesting engine, and multi-strategy execution.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>
        <div className="app-container">{children}</div>
      </body>
    </html>
  );
}
