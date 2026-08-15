'use client';

export default function PositionsAudit({ positions = [], tradeHistory = [], onClosePosition }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Active Open Positions Table */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-layer-group"></i> Active Open Positions</h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Position ID</th>
                <th>Pair</th>
                <th>Side</th>
                <th>Entry Price</th>
                <th>Amount</th>
                <th>Stop Loss</th>
                <th>Take Profit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {positions && positions.length > 0 ? (
                positions.map((pos) => (
                  <tr key={pos.id}>
                    <td style={{ fontSize: '11px', color: '#94a3b8' }}>{pos.id}</td>
                    <td>{pos.symbol}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{pos.side || 'BUY'}</td>
                    <td>${pos.entryPrice ? pos.entryPrice.toFixed(2) : '0.00'}</td>
                    <td>{pos.amount ? pos.amount.toFixed(4) : '0.00'}</td>
                    <td style={{ color: '#f43f5e' }}>${pos.stopLoss ? pos.stopLoss.toFixed(2) : '--'}</td>
                    <td style={{ color: '#10b981' }}>${pos.takeProfit ? pos.takeProfit.toFixed(2) : '--'}</td>
                    <td>
                      <button className="btn btn-stop" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => onClosePosition(pos.id)}>
                        Close Position
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">No open positions. Bot scanning for signals...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Audit History Table */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-receipt"></i> Completed Trade History Audit</h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Type</th>
                <th>Pair</th>
                <th>Price</th>
                <th>Amount</th>
                <th>PnL ($)</th>
                <th>Reason</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory && tradeHistory.length > 0 ? (
                tradeHistory.map((t, idx) => {
                  const displayTime = t.time || (t.timestamp && !isNaN(new Date(t.timestamp).getTime()) ? new Date(t.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString());
                  return (
                    <tr key={idx}>
                      <td style={{ fontSize: '11px', color: '#94a3b8' }}>{t.id || t.tradeId || idx}</td>
                      <td style={{ color: t.type === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{t.type}</td>
                      <td>{t.symbol}</td>
                      <td>${t.price ? Number(t.price).toFixed(2) : '0.00'}</td>
                      <td>{t.amount ? Number(t.amount).toFixed(4) : '0.00'}</td>
                      <td style={{ color: t.pnlUSD > 0 ? '#10b981' : t.pnlUSD < 0 ? '#f43f5e' : '#94a3b8' }}>
                        {t.pnlUSD !== undefined ? `$${Number(t.pnlUSD).toFixed(2)}` : '--'}
                      </td>
                      <td style={{ fontSize: '11px', color: '#94a3b8' }}>{t.reason || '--'}</td>
                      <td style={{ fontSize: '11px', color: '#64748b' }}>{displayTime}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">No trades executed yet. Click BUY or SELL button to place a trade.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
