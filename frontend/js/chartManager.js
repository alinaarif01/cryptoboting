// Chart Manager using Chart.js for Candlestick and Indicator visualization

class ChartManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
  }

  initChart(klinesData = []) {
    const ctx = document.getElementById(this.canvasId).getContext('2d');
    
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = klinesData.map(c => new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const closePrices = klinesData.map(c => c.close);
    const volumes = klinesData.map(c => c.volume);

    // Calculate 50 EMA for overlay
    const ema50 = this.calculateEMA(closePrices, 20);

    // Gradient fills
    const priceGradient = ctx.createLinearGradient(0, 0, 0, 400);
    priceGradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    priceGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    this.chart = new Chart(ctx, {
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
            data: ema50,
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
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
          },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#f8fafc',
            bodyColor: '#38bdf8',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            titleFont: { family: 'Outfit', size: 13 },
            bodyFont: { family: 'JetBrains Mono', size: 12 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } }
          },
          yVolume: {
            position: 'left',
            display: false,
            grid: { display: false },
            max: Math.max(...volumes) * 4
          }
        }
      }
    });
  }

  updateLatestPrice(price) {
    if (!this.chart || !this.chart.data.datasets[0].data.length) return;
    const len = this.chart.data.datasets[0].data.length;
    this.chart.data.datasets[0].data[len - 1] = price;
    this.chart.update('none'); // Update without full animation redraw for performance
  }

  calculateEMA(prices, period) {
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
}

const chartManager = new ChartManager('mainCandleChart');
