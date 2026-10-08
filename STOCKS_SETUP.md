# Stock Master Setup Guide

Your Stock Master feature is now installed! Follow these steps to activate it:

## 1. Apply Database Migration

The stocks module requires new tables in Supabase. Apply the migration:

1. Open your Supabase project dashboard
2. Go to **SQL Editor** → **New query**
3. Open file: `supabase/migrations/20261007120000_add_stocks.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**
7. Confirm the tables are created (stocks & stock_prices tables)

## 2. Restart the Server

```bash
# Kill current server
pkill -f "python -m http.server"

# Start new server
cd "/Users/prathi/Reactprojects/Portfolio Manager/Vault-Vine"
python3 -m http.server 8000
```

Then refresh your browser: `http://localhost:8000`

## 3. Add Your First Stock

1. Log in to your vault
2. Click **Stocks** in the sidebar
3. Click **+ Add stock**
4. Enter a ticker symbol (e.g., `AAPL`, `MSFT`, `TCS.NS`)
5. System will search and show matching companies
6. Enter purchase date, price, quantity, and currency
7. Click **Save**

## Features Now Available

✅ **Ticker Search** - Type to search US and Indian stocks (powered by Finnhub)
✅ **Price Tracking** - Automatically fetch current prices
✅ **Gain/Loss** - See your profit or loss percentage
✅ **Historical Charts** - View price movement from purchase to today
✅ **Multi-Currency** - Support for USD and INR
✅ **Notes** - Add custom notes to each position

## Finnhub API Key

The system uses: `db3fiihr01qr9lhq29egdb3fiihr01qr9lhq29f0` (free tier)

Free tier limits:
- 60 API calls/minute
- US stocks + major international stocks
- 2-week delayed data on some plans

## Supported Ticker Formats

- **US stocks**: `AAPL`, `MSFT`, `GOOGL`
- **Indian stocks**: `TCS.NS`, `INFY.NS`, `HDFC.NS`
- **Other exchanges**: Check Finnhub docs for your exchange code

## Next Steps

Once stocks are added:
- View current prices (updates in real-time)
- Click chart icon to see historical performance
- Edit or delete stocks as needed
- Prices are cached locally in the database

## Troubleshooting

**No results when searching?**
- Check internet connection
- Finnhub API rate limit (60/min) may be exceeded
- Try exact ticker symbol without spaces

**Current price showing as "—"?**
- System is fetching prices in background
- Refresh page if needed
- Check browser console for API errors

**Need to update existing stocks?**
- Click the pencil icon next to any stock
- Edit any field and save

## API Rate Limits

Finnhub free tier: 60 requests/minute
- Each stock search uses 1 request
- Each price fetch uses 1 request
- Each history chart uses 1 request

If you hit limits, wait 1 minute and try again.
