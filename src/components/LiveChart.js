'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

export default function LiveChart({
  klinesData,
  currentPair,
  onPairChange,
  timeframe,
  onTimeframeChange,
  evalResult,
  executionMode,
  onExecuteTrade
}) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [tradeAmount, setTradeAmount] = useState(100);
  const [isTrading, setIsTrading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !klinesData || klinesData.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labels = klinesData.map(c => new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const closePrices = klinesData.map(c => c.close);
    const volumes = klinesData.map(c => c.volume);

    // EMA calculation
    const ema20 = calculateEMA(closePrices, 20);

    const priceGradient = ctx.createLinearGradient(0, 0, 0, 400);
    priceGradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    priceGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Close Price ($)',
            data: closePrices,
            borderColor: '#38bdf8',
            borderWidth: 2,
            backgroundColor: priceGradient,
            fill: true,
            tension: 0.15,
            pointRadius: 0,
            pointHoverRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'EMA 20 Trend',
            data: ema20,
            borderColor: '#a855f7',
            borderWidth: 1.5,
            borderDash: [4, 4],
            fill: false,
            pointRadius: 0,
            yAxisID: 'y'
          },
          {
            label: 'Volume',
            data: volumes,
            type: 'bar',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            yAxisID: 'yVolume'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, labels: { color: '#94a3b8', font: { size: 11 } } },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#f8fafc',
            bodyColor: '#38bdf8',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { position: 'right', grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
          yVolume: { position: 'left', display: false, max: Math.max(...volumes, 1) * 4 }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [klinesData]);

  function calculateEMA(prices, period) {
    if (prices.length < period) return new Array(prices.length).fill(null);
    const k = 2 / (period + 1);
    const ema = [];
    let prevEma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ema.push(null);
      } else if (i === period - 1) {
        ema.push(prevEma);
      } else {
        prevEma = prices[i] * k + prevEma * (1 - k);
        ema.push(prevEma);
      }
    }
    return ema;
  }

  const latestPrice = evalResult?.price || (klinesData && klinesData.length > 0 ? klinesData[klinesData.length - 1].close : null);
  const emaValues = klinesData && klinesData.length >= 20 ? calculateEMA(klinesData.map(c => c.close), 20) : [];
  const latestEma = evalResult?.ema50 || (emaValues.length > 0 ? emaValues[emaValues.length - 1] : null);

  let latestRsi = evalResult?.rsi;
  if (!latestRsi && klinesData && klinesData.length >= 15) {
    const closes = klinesData.map(c => c.close);
    let gains = 0, losses = 0;
    for (let i = 1; i <= 14; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / 14, avgLoss = losses / 14;
    for (let i = 15; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * 13 + (diff >= 0 ? diff : 0)) / 14;
      avgLoss = (avgLoss * 13 + (diff < 0 ? Math.abs(diff) : 0)) / 14;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    latestRsi = parseFloat((100 - (100 / (1 + rs))).toFixed(2));
  }

  const signal = evalResult?.signal || (latestRsi <= 30 ? 'BUY' : latestRsi >= 70 ? 'SELL' : 'HOLD');
  const signalClass = signal.toLowerCase();

  const handleTrade = async (side) => {
    setIsTrading(true);
    await onExecuteTrade(side, tradeAmount);
    setIsTrading(false);
  };

  return (
    <div className="chart-dashboard-grid">
      {/* Main Chart Panel */}
      <div className="panel chart-panel">
        <div className="panel-header">
          <div className="pair-selector-group">
            <h3><i className="fa-solid fa-chart-candlestick"></i> Market Candle Stream</h3>
            <select value={currentPair} onChange={(e) => onPairChange(e.target.value)}>
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
            </select>
          </div>

          <div className="timeframe-group">
            {['15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => onTimeframeChange(tf)}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="chart-indicators-readout">
            <span className="indicator-badge">RSI (14): <strong>{latestRsi ? latestRsi : '--'}</strong></span>
            <span className="indicator-badge">EMA 20: <strong>${latestEma ? Number(latestEma).toFixed(2) : '--'}</strong></span>
            <span className="indicator-badge signal">SIGNAL: {signal}</span>
          </div>
        </div>

        <div className="chart-container">
          <canvas ref={canvasRef} id="mainCandleChart" />
        </div>
      </div>

      {/* Side Signal Feed & Trade Execution Panel */}
      <div className="side-feed-panel">
        <div className="panel signal-panel">
          <div className="panel-header">
            <h3><i className="fa-solid fa-bolt"></i> Live Trade Execution</h3>
            <span className="pulse-badge" style={{ background: executionMode === 'LIVE' ? 'rgba(245, 158, 11, 0.2)' : undefined, color: executionMode === 'LIVE' ? '#f59e0b' : undefined }}>
              {executionMode === 'LIVE' ? 'LIVE EXCHANGE' : 'PAPER SIMULATION'}
            </span>
          </div>

          <div className="signal-card">
            <div className={`signal-type ${signalClass}`}>{signal}</div>
            <div className="signal-details">
              <div className="row">
                <span>Symbol Pair:</span>
                <strong>{currentPair.replace('USDT', '/USDT')}</strong>
              </div>
              <div className="row">
                <span>Current Price:</span>
                <strong>${latestPrice ? Number(latestPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</strong>
              </div>
              <div className="row">
                <span>Execution Mode:</span>
                <strong style={{ color: executionMode === 'LIVE' ? '#f59e0b' : '#10b981' }}>{executionMode || 'PAPER'}</strong>
              </div>
            </div>

            {/* Instant Trade Action Controls */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>Order Value ($ USD)</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  className="btn btn-start"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleTrade('BUY')}
                  disabled={isTrading}
                >
                  <i className="fa-solid fa-arrow-trend-up"></i> BUY MARKET
                </button>
                <button
                  className="btn btn-stop"
                  style={{ justifyContent: 'center' }}
                  onClick={() => handleTrade('SELL')}
                  disabled={isTrading}
                >
                  <i className="fa-solid fa-arrow-trend-down"></i> SELL MARKET
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
