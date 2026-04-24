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
  new TradingView.widget({ ...commonConfig, symbol: 'NSE:NIFTY',  container_id: 'nifty-chart' });
  new TradingView.widget({ ...commonConfig, symbol: 'BSE:SENSEX', container_id: 'sensex-chart' });
}

// ─── NEWS via rss2json.com (CORS-safe, no proxy needed) ───────────────────────
// rss2json converts RSS to JSON with proper CORS headers — works from any browser
const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';
const NEWS_FEEDS = [
  'https://economictimes.indiatimes.com/markets/stocks/rss.cms',
  'https://www.moneycontrol.com/rss/latestnews.xml',
  'https://feeds.feedburner.com/ndtvprofit-latest'
];

function sentimentTag(title) {
  const t = title.toLowerCase();
  const bullish = ['rise', 'gain', 'surge', 'rally', 'high', 'bull', 'up', 'positive', 'growth', 'record', 'boost', 'jump', 'soar'];
  const bearish = ['fall', 'drop', 'crash', 'decline', 'low', 'bear', 'down', 'negative', 'loss', 'sell', 'weak', 'slip', 'plunge'];
  if (bullish.some(w => t.includes(w))) return 'bullish';
  if (bearish.some(w => t.includes(w))) return 'bearish';
  return 'neutral';
}

async function fetchNews() {
  const feed = document.getElementById('news-feed');
  feed.innerHTML = '<div class="loading">Fetching latest news...</div>';

  for (const rssUrl of NEWS_FEEDS) {
    try {
      const res = await fetch(RSS2JSON + encodeURIComponent(rssUrl),
        { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.status !== 'ok' || !data.items?.length) continue;

      feed.innerHTML = '';
      data.items.slice(0, 15).forEach(item => {
        const title     = item.title || '';
        const link      = item.link  || '#';
        const pubDate   = item.pubDate || '';
        const sentiment = sentimentTag(title);
        const timeStr   = pubDate
          ? new Date(pubDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : '';

        const div = document.createElement('div');
        div.className = `news-item ${sentiment}`;
        div.innerHTML = `
          <a href="${link}" target="_blank" rel="noopener">${title}</a>
          <div class="news-meta">${timeStr} &nbsp;·&nbsp; ${
            sentiment === 'bullish' ? '🟢 Bullish signal' :
            sentiment === 'bearish' ? '🔴 Bearish signal' : '🟡 Neutral'}</div>
        `;
        feed.appendChild(div);
      });

      document.getElementById('news-time').textContent =
        'Updated ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const sentiments = data.items.slice(0, 15).map(i => sentimentTag(i.title || ''));
      updatePrediction(sentiments);
      return; // success — stop trying other feeds

    } catch { continue; }
  }

  // All feeds failed
  feed.innerHTML = `
    <div class="loading">⚠️ Could not load news.<br/>
    <a href="https://economictimes.indiatimes.com/markets" target="_blank" style="color:#58a6ff">Open ET Markets ↗</a></div>`;
  updatePrediction([]);
}

// ─── PATTERN-BASED PREDICTION ENGINE ─────────────────────────────────────────
function marketSessionBias() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const totalMin = ist.getHours() * 60 + ist.getMinutes();

  if (totalMin < 555)  return { label: 'Pre-Market',        bias: 0,    note: 'Market not open yet' };
  if (totalMin > 930)  return { label: 'After-Market',       bias: 0,    note: 'Market closed for today' };
  if (totalMin < 600)  return { label: 'Opening Bell',       bias: 0.6,  note: 'High volatility — opening 45 mins' };
  if (totalMin < 690)  return { label: 'Morning Session',    bias: 0.3,  note: 'Trend usually establishes here' };
  if (totalMin < 780)  return { label: 'Midday Lull',        bias: -0.1, note: 'Low volume, sideways likely' };
  if (totalMin < 870)  return { label: 'Afternoon Session',  bias: 0.2,  note: 'FII activity picks up' };
  return               { label: 'Power Hour',                bias: 0.5,  note: 'High volume close — watch for reversals' };
}

function dayOfWeekBias() {
  const day = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' });
  const biases = { Monday: -0.1, Tuesday: 0.1, Wednesday: 0.2, Thursday: 0.1, Friday: -0.2 };
  return { day, bias: biases[day] ?? 0 };
}

function updatePrediction(sentiments) {
  const panel = document.getElementById('prediction-panel');

  const bullCount = sentiments.filter(s => s === 'bullish').length;
  const bearCount = sentiments.filter(s => s === 'bearish').length;
  const total     = sentiments.length || 1;
  const newsScore = (bullCount - bearCount) / total;

  const session  = marketSessionBias();
  const dayBias  = dayOfWeekBias();
  const composite = (newsScore * 0.5) + (session.bias * 0.3) + (dayBias.bias * 0.2);

  let direction, dirClass, confidence;
  if (composite > 0.15)       { direction = '▲ BULLISH';  dirClass = 'up';      confidence = Math.min(95, 50 + composite * 80); }
  else if (composite < -0.15) { direction = '▼ BEARISH';  dirClass = 'down';    confidence = Math.min(95, 50 + Math.abs(composite) * 80); }
  else                        { direction = '◆ SIDEWAYS'; dirClass = 'neutral'; confidence = 50; }

  const indicators = [
    { label: 'News Sentiment', val: bullCount > bearCount ? 'Bullish' : bearCount > bullCount ? 'Bearish' : 'Neutral',
      cls: bullCount > bearCount ? 'green' : bearCount > bullCount ? 'red' : 'yellow' },
    { label: 'Session',        val: session.label, cls: 'yellow' },
    { label: 'Day Bias',       val: dayBias.day,   cls: dayBias.bias >= 0 ? 'green' : 'red' },
    { label: 'Bullish News',   val: bullCount,     cls: 'green' },
    { label: 'Bearish News',   val: bearCount,     cls: 'red' },
    { label: 'Composite Score',val: composite.toFixed(2), cls: composite > 0 ? 'green' : composite < 0 ? 'red' : 'yellow' },
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
        • 50% weight → News sentiment (ET Markets keywords)<br/>
        • 30% weight → Market session pattern (opening/midday/close)<br/>
        • 20% weight → Day-of-week historical bias<br/>
        <br/>⚠️ Pattern-based only. Not financial advice.
      </div>
    </div>
  `;
}

// ─── AUTO REFRESH ─────────────────────────────────────────────────────────────
fetchNews();
setInterval(fetchNews, 5 * 60 * 1000);
window.addEventListener('load', initCharts);
