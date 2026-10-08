# 🇮🇳 Indian Stocks API Setup - Twelve Data

Your app now supports **both US & Indian stocks** with dual API setup!

## 🚀 Current Status

| Provider | Stocks | Free Tier | Status |
|----------|--------|-----------|--------|
| **Finnhub** | US & Global | ✅ 60/min | Working |
| **Twelve Data** | NSE/BSE (India) | ✅ Demo free | Demo mode (limited) |

## 📊 How It Works

- **US Stocks** (AAPL, MSFT, VOO): → Finnhub API ✅
- **Indian Stocks** (TCS.NS, INFY.NS): → Twelve Data API 🆕

## 🔑 Setup Twelve Data (5 minutes)

### Step 1: Get Free API Key
1. Visit: https://twelvedata.com
2. Click **Sign Up** (top right)
3. Create free account
4. Verify email
5. Go to **Dashboard** → **API Keys**
6. Copy your **API Key**

### Step 2: Update Your App
1. Open: `assets/stocks.js`
2. Find line ~7:
   ```javascript
   const TWELVE_DATA_API_KEY = "demo";
   ```
3. Replace `"demo"` with your key:
   ```javascript
   const TWELVE_DATA_API_KEY = "your_actual_key_here";
   ```
4. Save file
5. Refresh browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)

### Step 3: Test Indian Stocks
1. Add stock: `TCS.NS` (Tata Consultancy)
2. Or: `INFY.NS` (Infosys)
3. Or: `HDFC.NS` (HDFC Bank)
4. Should see current price now! ✅

---

## 📈 Twelve Data Free Tier

**Includes:**
- ✅ 800 API calls per month
- ✅ Full NSE/BSE support
- ✅ Real-time quotes
- ✅ Historical data
- ✅ 2-week delayed on some data types

**Limits:**
- 800 calls/month (≈ 27 per day)
- If you add 10 Indian stocks, that's 10 calls per day

**Upgrade When:**
- You hit 800 calls/month
- You want real-time (0-delay) data
- Paid tier: $9.99/month for 100k calls

---

## 🆓 Alternative Free Options

If Twelve Data doesn't work:

### Option 1: yfinance (Python Wrapper)
- Free, unlimited
- But requires backend API
- More complex setup

### Option 2: EOD Historical Data
- Free tier: 100 calls/month
- Global coverage including NSE
- Website: eodhistoricaldata.com

### Option 3: Alpha Vantage
- Free tier: 5 calls/min
- Supports Indian stocks
- Limited data

---

## ✅ Testing

After updating your API key:

```javascript
// Test in browser console (F12):
await getStockPrice("TCS.NS")
// Should return: { price: 3500.25, high: 3510, low: 3490, ... }
```

---

## 🐛 Troubleshooting

**"No price data for TCS.NS"?**
- Check API key is correct (copy-paste from Twelve Data dashboard)
- Check browser console for errors (F12)
- Try another Indian stock like INFY.NS
- Wait 1 minute (rate limit may be exceeded)

**Demo key not working?**
- Use the demo key for testing only
- Get your own free key at twelvedata.com (takes 2 min)

**Rate limit exceeded?**
- Free tier: 800 calls/month
- If you have 10+ stocks, you'll hit it
- Upgrade plan or reduce Indian stocks

**Still not working?**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check internet connection

---

## 💡 Pro Tips

1. **Mix both APIs smartly:**
   - Add critical US stocks (VTI, VOO, QQQ)
   - Add important Indian stocks (TCS, INFY, HDFC)
   - Total should be < 27 stocks on free tier

2. **Use Holdings for extras:**
   - Holdings tab doesn't use API (no limit)
   - Good for backup holdings

3. **Upgrade when ready:**
   - $9.99/month = 100k calls/month
   - That's unlimited for normal use

4. **Monitor your usage:**
   - Twelve Data dashboard shows API calls
   - Check monthly to avoid hitting limit

---

## 🎯 Quick Start

**Right now:**
1. Get Twelve Data key (2 minutes)
2. Update `assets/stocks.js` line 7
3. Refresh browser
4. Add TCS.NS → See live price! ✅

---

## 📞 Support

**Issues?**
- Check browser console: F12 → Console tab
- Look for error messages
- Google the error + "Twelve Data" or "Finnhub"
- Both APIs have good documentation

**Ready?** Go get your Twelve Data key! 🚀

---

**Current Setup:** Finnhub (US) + Twelve Data (India) ✅
