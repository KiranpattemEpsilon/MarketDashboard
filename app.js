// ─── CLOCK ───────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
}
setInterval(updateClock, 1000);
updateClock();

// ─── TRADINGVIEW CHARTS ───────────────────────────────────────────────────────
function initCharts() {
  const commonConfig = {
    autosize: true,
    interval: '5',
    timezone: 'Asia/Kolkata',
    theme: 'dark',
    style: '1',
    locale: 'en',
    toolbar_bg: '#161b22',
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies']
  };
  new TradingView.widget({ ...commonConfig, symbol: 'NSE:NIFTY', container_id: 'nifty-chart' });
  new TradingView.widget({
    autosize: true,
    symbol: 'BSE:SENSEX',
    interval: 'D',
    timezone: 'Asia/Kolkata',
    theme: 'dark',
    style: '1',
    locale: 'en',
    toolbar_bg: '#161b22',
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    studies: [],
    container_id: 'sensex-chart'
  });
}

// ─── PATTERN-BASED PREDICTION ENGINE ─────────────────────────────────────────
function marketSessionBias() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const totalMin = ist.getHours() * 60 + ist.getMinutes();

  if (totalMin < 555) return { label: 'Pre-Market',       bias: 0,    note: 'Market not open yet' };
  if (totalMin > 930) return { label: 'After-Market',      bias: 0,    note: 'Market closed for today' };
  if (totalMin < 600) return { label: 'Opening Bell',      bias: 0.6,  note: 'High volatility — opening 45 mins' };
  if (totalMin < 690) return { label: 'Morning Session',   bias: 0.3,  note: 'Trend usually establishes here' };
  if (totalMin < 780) return { label: 'Midday Lull',       bias: -0.1, note: 'Low volume, sideways likely' };
  if (totalMin < 870) return { label: 'Afternoon Session', bias: 0.2,  note: 'FII activity picks up' };
  return               { label: 'Power Hour',              bias: 0.5,  note: 'High volume close — watch for reversals' };
}

function dayOfWeekBias() {
  const day = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const biases = { Monday: -0.1, Tuesday: 0.1, Wednesday: 0.2, Thursday: 0.1, Friday: -0.2 };
  return { day, bias: biases[day] ?? 0 };
}

function updatePrediction() {
  const panel     = document.getElementById('prediction-panel');
  const session   = marketSessionBias();
  const dayBias   = dayOfWeekBias();
  const composite = (session.bias * 0.6) + (dayBias.bias * 0.4);

  let direction, dirClass, confidence;
  if (composite > 0.1)       { direction = '▲ BULLISH';  dirClass = 'up';      confidence = Math.min(95, 50 + composite * 80); }
  else if (composite < -0.1) { direction = '▼ BEARISH';  dirClass = 'down';    confidence = Math.min(95, 50 + Math.abs(composite) * 80); }
  else                       { direction = '◆ SIDEWAYS'; dirClass = 'neutral'; confidence = 50; }

  const indicators = [
    { label: 'Session',         val: session.label,        cls: 'yellow' },
    { label: 'Day',             val: dayBias.day,          cls: dayBias.bias >= 0 ? 'green' : 'red' },
    { label: 'Session Bias',    val: session.bias.toFixed(1),  cls: session.bias > 0 ? 'green' : session.bias < 0 ? 'red' : 'yellow' },
    { label: 'Day Bias',        val: dayBias.bias.toFixed(1),  cls: dayBias.bias >= 0 ? 'green' : 'red' },
    { label: 'Composite Score', val: composite.toFixed(2), cls: composite > 0 ? 'green' : composite < 0 ? 'red' : 'yellow' },
  ];

  panel.innerHTML = `
    <div class="prediction-card">
      <h4>Predicted Direction</h4>
      <div class="signal ${dirClass}">${direction}</div>
      <div class="signal-detail">${session.note}</div>
      <div class="confidence-bar-wrap">
        <div class="confidence-bar ${dirClass}" style="width:${confidence}%"></div>
      </div>
      <div class="signal-detail" style="margin-top:4px">Confidence: ${confidence.toFixed(0)}%</div>
    </div>
    <div class="prediction-card">
      <h4>Indicators</h4>
      ${indicators.map(i => `
        <div class="indicator-row">
          <span class="ind-label">${i.label}</span>
          <span class="ind-val ${i.cls}">${i.val}</span>
        </div>`).join('')}
    </div>
    <div class="prediction-card">
      <h4>How This Works</h4>
      <div class="signal-detail">
        • 60% weight → Market session pattern<br/>
        • 40% weight → Day-of-week historical bias<br/>
        • News panel → TradingView live feed (left)<br/>
        <br/>⚠️ Pattern-based only. Not financial advice.
      </div>
    </div>
  `;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  initCharts();
  updatePrediction();
});
