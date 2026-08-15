// Application Controller Script

class AppController {
  constructor() {
    this.currentPair = 'BTCUSDT';
    this.currentStrategy = 'RSI';
    this.botStatus = 'STOPPED';
    this.klinesCache = [];
  }

  init() {
    this.bindTabEvents();
    this.bindTimeframeEvents();
    this.connectBackend();
    this.loadCandleData(this.currentPair);
  }

  // TAB NAVIGATION
  bindTabEvents() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');
      });
    });
  }

  bindTimeframeEvents() {
    const btns = document.querySelectorAll('.tf-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tf = btn.getAttribute('data-tf');
        this.loadCandleData(this.currentPair, tf);
      });
    });
  }

  // CONNECT TO BACKEND WS & REST
  connectBackend() {
    api.connectWebSocket(
      (payload) => this.handleWsMessage(payload),
      (isConnected) => this.updateConnectionStatus(isConnected)
    );

    // Fetch initial status snapshot
    api.getStatus().then(res => {
      if (res.success && res.data) {
        this.updateStateUI(res.data);
      }
    });
  }

  updateConnectionStatus(isConnected) {
    const el = document.getElementById('wsStatus');
    const txt = document.getElementById('wsStatusText');
    if (isConnected) {
      el.className = 'status-indicator online';
      txt.innerText = 'Connected';
    } else {
      el.className = 'status-indicator offline';
      txt.innerText = 'Disconnected';
    }
  }

  // WEBSOCKET DISPATCHER
  handleWsMessage(payload) {
    if (payload.type === 'INIT_STATE' || payload.type === 'TICK') {
      const data = payload.type === 'INIT_STATE' ? payload.data : payload.data;
      if (data) {
        if (data.paperWallet) this.renderWallet(data.paperWallet);
        if (data.status) this.updateBotButton(data.status);
        if (data.evalResult) this.renderSignal(data.evalResult);
        if (data.positions) this.renderPositions(data.positions);
        if (data.price) chartManager.updateLatestPrice(data.price);
      }
    } else if (payload.type === 'TICKERS_UPDATE') {
      this.renderTickers(payload.data);
    } else if (payload.type === 'LOG') {
      this.appendLog(payload.data);
    }
  }

  // LOAD OHLCV CANDLES FOR CHART
  async loadCandleData(symbol, timeframe = '1h') {
    this.currentPair = symbol;
    const res = await api.getKlines(symbol, timeframe, 100);
    if (res.success && res.data) {
      this.klinesCache = res.data;
      chartManager.initChart(res.data);
    }
  }

  changePair(pair) {
    this.currentPair = pair;
    this.loadCandleData(pair);
  }

  // RENDER TICKERS TAPE
  renderTickers(tickers) {
    for (const key in tickers) {
      const item = tickers[key];
      const pEl = document.getElementById(`price-${key}`);
      const cEl = document.getElementById(`change-${key}`);

      if (pEl) pEl.innerText = `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      if (cEl) {
        const sign = item.change24h > 0 ? '+' : '';
        cEl.innerText = `${sign}${item.change24h.toFixed(2)}%`;
        cEl.className = `change ${item.change24h > 0 ? 'positive' : item.change24h < 0 ? 'negative' : 'neutral'}`;
      }
    }
  }

  // STATE & METRICS UI
  updateStateUI(state) {
    this.botStatus = state.status;
    this.currentStrategy = state.activeStrategy;

    this.updateBotButton(state.status);
    document.getElementById('valActiveStrategy').innerText = state.activeStrategy;

    if (state.paperWallet) this.renderWallet(state.paperWallet);
    if (state.positions) this.renderPositions(state.positions);
    if (state.tradeHistory) this.renderTradeHistory(state.tradeHistory);
    if (state.logs) {
      document.getElementById('terminalConsole').innerHTML = '';
      state.logs.reverse().forEach(l => this.appendLog(l));
    }
  }

  renderWallet(wallet) {
    document.getElementById('valTotalEquity').innerText = `$${wallet.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('valPaperBalance').innerText = `$${wallet.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const pnlEl = document.getElementById('valTotalPnL');
    const sign = wallet.totalPnL >= 0 ? '+' : '';
    pnlEl.innerText = `${sign}$${wallet.totalPnL.toFixed(2)} (${sign}${wallet.totalPnLPercent.toFixed(2)}%)`;
    pnlEl.className = `value ${wallet.totalPnL > 0 ? 'positive' : wallet.totalPnL < 0 ? 'negative' : 'neutral'}`;
  }

  renderSignal(evalRes) {
    const typeEl = document.getElementById('sigType');
    typeEl.className = `signal-type ${evalRes.signal.toLowerCase()}`;
    typeEl.innerText = evalRes.signal;

    document.getElementById('sigSymbol').innerText = this.currentPair.replace('USDT', '/USDT');
    document.getElementById('sigPrice').innerText = `$${evalRes.price}`;
    document.getElementById('sigReason').innerText = evalRes.reason;

    document.getElementById('readoutRsi').innerText = evalRes.rsi ? evalRes.rsi : '--';
    document.getElementById('readoutEma').innerText = evalRes.ema50 ? evalRes.ema50 : '--';
    
    const sigBadge = document.getElementById('readoutSignal');
    sigBadge.innerText = `Signal: ${evalRes.signal}`;
  }

  // POSITIONS & TRADES TABLE
  renderPositions(positions) {
    document.getElementById('valOpenPositions').innerText = positions.length;
    document.getElementById('quickPosCount').innerText = positions.length;

    const tbody = document.getElementById('openPositionsTableBody');
    const quickList = document.getElementById('quickPositionsList');

    if (positions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No active open positions</td></tr>';
      quickList.innerHTML = '<div class="empty-state">No open positions</div>';
      return;
    }

    let rows = '';
    let quickRows = '';

    positions.forEach(p => {
      rows += `
        <tr>
          <td>${p.id}</td>
          <td><strong>${p.symbol}</strong></td>
          <td>$${p.entryPrice.toFixed(2)}</td>
          <td>$${p.entryPrice.toFixed(2)}</td>
          <td>${p.amount.toFixed(6)}</td>
          <td>$${p.costUSD.toFixed(2)}</td>
          <td><span class="change neutral">$0.00 (0.00%)</span></td>
          <td><button class="btn btn-sm btn-outline" onclick="app.closePos('${p.id}')">Close</button></td>
        </tr>
      `;

      quickRows += `
        <div class="signal-card" style="margin-top: 8px;">
          <div class="row"><strong>${p.symbol}</strong> <span>Amount: ${p.amount.toFixed(4)}</span></div>
          <div class="row"><span>Entry: $${p.entryPrice.toFixed(2)}</span> <span>Cost: $${p.costUSD.toFixed(2)}</span></div>
        </div>
      `;
    });

    tbody.innerHTML = rows;
    quickList.innerHTML = quickRows;
  }

  renderTradeHistory(trades) {
    const tbody = document.getElementById('tradeHistoryTableBody');
    if (!trades || trades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">No trades executed yet</td></tr>';
      return;
    }

    let rows = '';
    trades.forEach(t => {
      const isBuy = t.type === 'BUY';
      const pnlText = t.pnlUSD !== undefined ? `${t.pnlUSD >= 0 ? '+' : ''}$${t.pnlUSD.toFixed(2)}` : '--';
      const pnlClass = t.pnlUSD > 0 ? 'positive' : t.pnlUSD < 0 ? 'negative' : 'neutral';

      rows += `
        <tr>
          <td>${t.id}</td>
          <td><strong>${t.symbol}</strong></td>
          <td><span class="change ${isBuy ? 'positive' : 'negative'}">${t.type}</span></td>
          <td>$${t.price ? t.price.toFixed(2) : (t.exitPrice || 0).toFixed(2)}</td>
          <td>$${t.totalUSD.toFixed(2)}</td>
          <td>$${t.feeUSD.toFixed(2)}</td>
          <td><span class="change ${pnlClass}">${pnlText}</span></td>
          <td>${t.time}</td>
          <td><small>${t.reason || 'Strategy Trigger'}</small></td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  }

  // MASTER BOT CONTROL SWITCH
  async toggleMasterBot() {
    const btn = document.getElementById('masterBotBtn');
    if (this.botStatus === 'RUNNING') {
      const res = await api.stopBot();
      if (res.success) {
        this.botStatus = 'STOPPED';
        this.updateBotButton('STOPPED');
      }
    } else {
      const res = await api.startBot(this.currentPair, this.currentStrategy);
      if (res.success) {
        this.botStatus = 'RUNNING';
        this.updateBotButton('RUNNING');
      }
    }
  }

  async emergencyStop() {
    if (confirm('🚨 EMERGENCY WARNING: Are you sure you want to activate the Kill-Switch? This will instantly close ALL open positions and stop the bot!')) {
      const res = await api.emergencyStop();
      if (res.success) {
        alert(res.message || 'Emergency Kill-Switch executed!');
        if (res.data) this.updateStateUI(res.data);
      }
    }
  }

  async closePos(positionId) {
    const res = await api.closePosition(positionId);
    if (res.success) {
      if (res.data) this.updateStateUI(res.data);
    } else {
      alert(res.error || 'Could not close position');
    }
  }

  updateBotButton(status) {
    this.botStatus = status;
    const btn = document.getElementById('masterBotBtn');
    if (status === 'RUNNING') {
      btn.className = 'btn btn-stop';
      btn.innerHTML = '<i class="fa-solid fa-square"></i> STOP BOT';
    } else {
      btn.className = 'btn btn-start';
      btn.innerHTML = '<i class="fa-solid fa-play"></i> START BOT';
    }
  }

  selectStrategy(stratName) {
    this.currentStrategy = stratName;
    document.querySelectorAll('.strategy-option-card').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-strategy') === stratName);
    });

    document.getElementById('paramSectionRSI').style.display = stratName === 'RSI' ? 'block' : 'none';
    document.getElementById('paramSectionGRID').style.display = stratName === 'GRID' ? 'block' : 'none';
  }

  async saveStrategyConfig(e) {
    e.preventDefault();
    const config = {
      rsiOversold: parseFloat(document.getElementById('inputRsiOversold').value),
      rsiOverbought: parseFloat(document.getElementById('inputRsiOverbought').value),
      rsiPeriod: parseInt(document.getElementById('inputRsiPeriod').value),
      gridLower: parseFloat(document.getElementById('inputGridLower').value),
      gridUpper: parseFloat(document.getElementById('inputGridUpper').value),
      gridLevels: parseInt(document.getElementById('inputGridLevels').value),
      stopLossPercent: parseFloat(document.getElementById('inputStopLoss').value),
      takeProfitPercent: parseFloat(document.getElementById('inputTakeProfit').value),
      tradeAllocationUSD: parseFloat(document.getElementById('inputTradeAlloc').value)
    };

    const res = await api.updateConfig(config);
    if (res.success) {
      alert('Bot Strategy Configuration applied successfully!');
    }
  }

  async resetWallet() {
    if (confirm('Are you sure you want to reset your paper trading wallet balance to $10,000 USD?')) {
      const res = await api.resetWallet();
      if (res.success) {
        this.updateStateUI(res.data);
      }
    }
  }

  // RUN HISTORICAL BACKTEST
  async runBacktest(e) {
    e.preventDefault();
    const btn = document.getElementById('btnRunBt');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Simulating Backtest...';

    const symbol = document.getElementById('btSymbol').value;
    const interval = document.getElementById('btInterval').value;
    const limit = parseInt(document.getElementById('btLimit').value);
    const strategy = document.getElementById('btStrategy').value;
    const capital = parseFloat(document.getElementById('btCapital').value);
    const tradeSize = parseFloat(document.getElementById('btTradeSize').value);

    const res = await api.runBacktest(symbol, interval, limit, {
      initialBalance: capital,
      tradeAmount: tradeSize,
      strategy
    });

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Launch Backtest Engine';

    if (res.success && res.data) {
      this.renderBacktestReport(res.data);
    }
  }

  renderBacktestReport(rpt) {
    const roiEl = document.getElementById('btRoi');
    const sign = rpt.totalProfit >= 0 ? '+' : '';
    roiEl.innerText = `${sign}$${rpt.totalProfit.toFixed(2)} (${sign}${rpt.roi.toFixed(2)}%)`;
    roiEl.className = rpt.totalProfit >= 0 ? 'positive' : 'negative';

    document.getElementById('btWinRate').innerText = `${rpt.winRate.toFixed(2)}% (${rpt.completedTradesCount} Trades)`;
    document.getElementById('btProfitFactor').innerText = rpt.profitFactor;
    document.getElementById('btMaxDrawdown').innerText = `-${rpt.maxDrawdown.toFixed(2)}%`;
    document.getElementById('btBadge').innerText = 'Simulation Complete';
    document.getElementById('btBadge').className = 'badge positive';

    const tbody = document.getElementById('btTradesTableBody');
    if (rpt.trades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No trades triggered during backtest period</td></tr>';
      return;
    }

    let rows = '';
    rpt.trades.forEach(t => {
      const isBuy = t.type === 'BUY';
      const pnlText = t.pnl !== undefined ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '--';
      const pnlClass = t.pnl > 0 ? 'positive' : t.pnl < 0 ? 'negative' : 'neutral';

      rows += `
        <tr>
          <td>${t.id}</td>
          <td><span class="change ${isBuy ? 'positive' : 'negative'}">${t.type}</span></td>
          <td>$${t.price.toFixed(2)}</td>
          <td>${new Date(t.timestamp).toLocaleString()}</td>
          <td><span class="change ${pnlClass}">${pnlText}</span></td>
          <td>${t.pnlPercent ? t.pnlPercent + '%' : '--'}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rows;
  }

  // EXCHANGE & EXECUTION MODE HANDLERS
  async saveExchangeConfig(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnTestConn');
    const exchange = document.getElementById('exName').value;
    const isTestnet = document.getElementById('exNetwork').value === 'testnet';
    const apiKey = document.getElementById('exApiKey').value;
    const apiSecret = document.getElementById('exApiSecret').value;

    if (!apiKey || !apiSecret) {
      alert('Please enter both API Key and API Secret.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing Connection...';

    const res = await api.saveExchangeConfig({ exchange, apiKey, apiSecret, isTestnet });
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plug"></i> Test Connection & Save API Keys';

    const badge = document.getElementById('exchangeConnBadge');
    if (res.success) {
      badge.className = 'badge badge-success';
      badge.innerText = 'CONNECTED';
      alert(res.data.message || 'Successfully connected to Binance!');
      this.fetchExchangeBalances();
    } else {
      badge.className = 'badge badge-danger';
      badge.innerText = 'FAILED';
      alert(res.error || (res.data ? res.data.message : 'Connection failed. Check API keys.'));
    }

    if (res.botState) this.updateStateUI(res.botState);
  }

  async setExecutionMode(mode) {
    const res = await api.setExecutionMode(mode);
    if (!res.success) {
      alert(res.error || 'Failed to switch execution mode.');
      return;
    }

    const paperCard = document.getElementById('modeCardPaper');
    const liveCard = document.getElementById('modeCardLive');

    if (mode === 'LIVE') {
      paperCard.className = 'mode-option';
      paperCard.querySelector('.radio-indicator').innerHTML = '<i class="fa-regular fa-circle"></i>';
      liveCard.className = 'mode-option active-live';
      liveCard.querySelector('.radio-indicator').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
      liveCard.className = 'mode-option';
      liveCard.querySelector('.radio-indicator').innerHTML = '<i class="fa-regular fa-circle"></i>';
      paperCard.className = 'mode-option active-paper';
      paperCard.querySelector('.radio-indicator').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    }

    if (res.data) this.updateStateUI(res.data);
  }

  async fetchExchangeBalances() {
    const res = await api.getExchangeBalance();
    if (res.success && res.data) {
      document.getElementById('exUsdtBal').innerText = `$${res.data.usdtFree.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      document.getElementById('exBtcBal').innerText = `${res.data.btcFree.toFixed(5)} BTC`;
    }
  }

  // TERMINAL LOGGING
  appendLog(log) {
    const consoleEl = document.getElementById('terminalConsole');
    const div = document.createElement('div');
    div.className = `log-entry ${log.category ? log.category.toLowerCase() : 'info'}`;
    div.innerHTML = `
      <span class="time">[${log.timeFormatted || new Date().toLocaleTimeString()}]</span>
      <span class="tag">${log.category || 'INFO'}</span>
      <span class="msg">${log.message}</span>
    `;

    consoleEl.prepend(div);
    if (consoleEl.children.length > 150) {
      consoleEl.removeChild(consoleEl.lastChild);
    }
  }

  clearLogs() {
    document.getElementById('terminalConsole').innerHTML = '';
  }
}

const app = new AppController();
document.addEventListener('DOMContentLoaded', () => app.init());
