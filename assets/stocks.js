/* =====================================================================
   Stock Master — Finnhub Integration + Stock Management
   ===================================================================== */

const FINNHUB_API_KEY = "db3fiihr01qr9lhq29egdb3fiihr01qr9lhq29f0";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

// Twelve Data API for Indian stocks (NSE/BSE)
const TWELVE_DATA_API_KEY = "901f8aefdbcb42b29d483469545c2199";
const TWELVE_DATA_BASE = "https://api.twelvedata.com";

// Cache for ticker search results
let tickerCache = {};
let searchCache = {};

/* ---------- Finnhub API Functions ---------- */

// Search tickers by symbol/company name
async function searchTickers(query) {
  if (!query || query.length < 1) return [];

  // Check cache
  if (searchCache[query]) return searchCache[query];

  try {
    const res = await fetch(`${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    const results = (data.result || []).map(r => ({
      ticker: r.symbol,
      name: r.description,
      exchange: r.exchange,
      type: r.type
    })).filter(r => r.ticker && r.type !== 'etf'); // Filter out ETFs

    searchCache[query] = results;
    return results;
  } catch (e) {
    console.error("Ticker search error:", e);
    return [];
  }
}

// Detect if ticker is Indian stock
function isIndianStock(ticker) {
  return ticker.includes('.NS') || ticker.includes('.BO') || ticker.includes('.BOM');
}

// Get price from Twelve Data (for Indian stocks)
async function getPriceFromTwelveData(ticker) {
  try {
    // Twelve Data requires format: SYMBOL.EXCHANGE (e.g., TCS.NSE, INFY.NSE)
    let apiTicker = ticker;
    if (ticker.endsWith('.NS')) {
      apiTicker = ticker.replace('.NS', '.NSE');
    } else if (ticker.endsWith('.BO')) {
      apiTicker = ticker.replace('.BO', '.BSE');
    }

    const res = await fetch(`${TWELVE_DATA_BASE}/quote?symbol=${encodeURIComponent(apiTicker)}&apikey=${TWELVE_DATA_API_KEY}`);

    if (res.status === 429) {
      console.warn(`Rate limit for ${ticker} on Twelve Data`);
      return null;
    }
    if (res.status === 403 || res.status === 401) {
      console.warn(`Twelve Data access denied for ${ticker}`);
      return null;
    }
    if (res.status === 404) {
      console.warn(`Ticker ${ticker} not found. Try: TCS.NSE, INFY.NSE, HDFC.NSE, SBIN.NSE`);
      return null;
    }
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();

    if (data.status === 'error' || !data.close) {
      console.warn(`No price data from Twelve Data for ${ticker}`);
      return null;
    }

    return {
      price: parseFloat(data.close),
      high: parseFloat(data.high || 0),
      low: parseFloat(data.low || 0),
      open: parseFloat(data.open || 0),
      prevClose: parseFloat(data.previous_close || 0),
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error(`Error from Twelve Data for ${ticker}:`, e.message);
    return null;
  }
}

// Get current price for a ticker (uses best provider)
async function getStockPrice(ticker) {
  try {
    // Route Indian stocks to Twelve Data, US stocks to Finnhub
    if (isIndianStock(ticker)) {
      return await getPriceFromTwelveData(ticker);
    }

    // Use Finnhub for US and other stocks
    const res = await fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`);

    if (res.status === 429) {
      console.warn(`Rate limit for ${ticker}: Try again in a minute`);
      return null;
    }
    if (res.status === 403 || res.status === 401) {
      console.warn(`Access denied for ${ticker}: Finnhub may not support this ticker`);
      return null;
    }
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();

    if (data.c === undefined || data.c === null || data.c === 0) {
      console.warn(`No price data for ${ticker}`);
      return null;
    }

    return {
      price: data.c,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error(`Error fetching price for ${ticker}:`, e.message);
    return null;
  }
}

// Get historical prices (OHLC data)
async function getStockHistory(ticker, from, to) {
  try {
    const fromTime = Math.floor(new Date(from).getTime() / 1000);
    const toTime = Math.floor(new Date(to).getTime() / 1000);

    const res = await fetch(`${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${fromTime}&to=${toTime}&token=${FINNHUB_API_KEY}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    if (!data.c || !data.t) throw new Error("No historical data");

    // Map timestamps to prices
    const prices = [];
    for (let i = 0; i < data.t.length; i++) {
      prices.push({
        date: new Date(data.t[i] * 1000).toISOString().split('T')[0],
        price: data.c[i],
        open: data.o?.[i],
        high: data.h?.[i],
        low: data.l?.[i]
      });
    }

    return prices;
  } catch (e) {
    console.error(`Error fetching history for ${ticker}:`, e);
    return [];
  }
}

/* ---------- Stock Management Functions ---------- */

// Load user's stocks from Supabase
async function loadStocks() {
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('stocks').select('*').order('buy_date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error loading stocks:", e);
    return [];
  }
}

// Add new stock
async function addStock(ticker, buyDate, buyPrice, quantity, currency, stockName = "", exchange = "", notes = "") {
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('stocks').insert([{
      ticker: ticker.toUpperCase(),
      stock_name: stockName,
      exchange: exchange,
      buy_date: buyDate,
      buy_price: parseFloat(buyPrice),
      quantity: parseFloat(quantity),
      currency: currency,
      notes: notes
    }]).select();

    if (error) throw error;
    return data?.[0];
  } catch (e) {
    console.error("Error adding stock:", e);
    toast(`Couldn't add stock: ${e.message}`);
    return null;
  }
}

// Update stock
async function updateStock(id, updates) {
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('stocks').update(updates).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  } catch (e) {
    console.error("Error updating stock:", e);
    toast(`Couldn't update stock: ${e.message}`);
    return null;
  }
}

// Delete stock
async function deleteStock(id) {
  if (!sb) return false;
  try {
    const { error } = await sb.from('stocks').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Error deleting stock:", e);
    toast(`Couldn't delete stock: ${e.message}`);
    return false;
  }
}

// Save historical prices
async function saveStockPrice(ticker, date, price, currency = "USD") {
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('stock_prices').upsert({
      ticker: ticker.toUpperCase(),
      price_date: date,
      price: parseFloat(price),
      currency: currency,
      source: 'finnhub'
    }, { onConflict: 'ticker,price_date' }).select();

    if (error) throw error;
    return data?.[0];
  } catch (e) {
    console.error("Error saving price:", e);
    return null;
  }
}

// Get historical prices from database
async function getStockPricesFromDB(ticker) {
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('stock_prices')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .order('price_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error loading prices:", e);
    return [];
  }
}

/* ---------- Calculation Functions ---------- */

// Calculate gain/loss for a stock
function calculateStockGain(buyPrice, currentPrice, quantity, currency1, currency2 = "USD") {
  const buy = parseFloat(buyPrice) * parseFloat(quantity);
  const current = parseFloat(currentPrice) * parseFloat(quantity);
  const gain = current - buy;
  const gainPercent = (gain / buy) * 100;

  return { buy, current, gain, gainPercent };
}

// Format stock data with current prices
async function enrichStockData(stocks) {
  const enriched = [];

  for (const stock of stocks) {
    const priceData = await getStockPrice(stock.ticker);
    if (priceData) {
      const { gain, gainPercent } = calculateStockGain(
        stock.buy_price,
        priceData.price,
        stock.quantity
      );

      enriched.push({
        ...stock,
        currentPrice: priceData.price,
        gain,
        gainPercent,
        priceData
      });
    }
  }

  return enriched;
}
