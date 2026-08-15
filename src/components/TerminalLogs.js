'use client';

export default function TerminalLogs({ logs = [] }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3><i className="fa-solid fa-code"></i> Live Execution Terminal Logs</h3>
      </div>

      <div className="terminal-window">
        {logs && logs.length > 0 ? (
          logs.slice().reverse().map((log, idx) => {
            const tagClass = (log.tag || 'INFO').toLowerCase();
            return (
              <div key={idx} className={`log-entry ${tagClass}`}>
                <span className="time">[{log.time || '00:00:00'}]</span>
                <span className="tag">{log.tag || 'SYSTEM'}</span>
                <span className="msg">{log.message}</span>
              </div>
            );
          })
        ) : (
          <div className="log-entry info">
            <span className="time">[00:00:00]</span>
            <span className="tag">SYSTEM</span>
            <span className="msg">Dashboard connected to Next.js Bot Engine...</span>
          </div>
        )}
      </div>
    </div>
  );
}
