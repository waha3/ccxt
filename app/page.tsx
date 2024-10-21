// import Image from "next/image";
"use client";

import ccxt, { version, exchanges } from "ccxt";
import { useEffect } from "react";

console.log(version, Object.keys(exchanges));

async function example_with_fetch_trades() {
  const exch = new ccxt.binance({});
  // exch.socksProxy = "socks5://127.0.0.1:1080";
  // await exch.loadProxyModules();
  const timeframe = "1m";
  const symbol = "OGN/USDT";
  const since = exch.milliseconds() - 1000 * 60 * 30; // last 30 mins
  const limit = 1000;
  const trades = await exch.fetchTrades(symbol, since, limit);
  const generatedBars = exch.buildOHLCVC(trades, timeframe, since, limit);
  // you can ignore 6th index ("count" field) from ohlcv entries, which is not part of OHLCV standard structure and is just added internally by `buildOHLCVC` method
  console.log(
    "[REST] Constructed",
    generatedBars.length,
    "bars from trades: ",
    generatedBars
  );
}

async function example_with_watch_trades() {
  const exch = new ccxt.pro.binance({});
  exch.socksProxy = "socks5://127.0.0.1:1080";
  const timeframe = "1m";
  const symbol = "DOGE/USDT";
  const limit = 1000;
  const since = exch.milliseconds() - 10 * 60 * 1000 * 1000; // last 10 hrs
  let collectedTrades = [];
  const collectedBars = [];
  while (true) {
    const wsTrades = await exch.watchTrades(symbol, since, limit, {});
    collectedTrades = collectedTrades.concat(wsTrades);
    const generatedBars = exch.buildOHLCVC(
      collectedTrades,
      timeframe,
      since,
      limit
    );
    // Note: first bar would be partially constructed bar and its 'open' & 'high' & 'low' prices (except 'close' price) would probably have different values compared to real bar on chart, because the first obtained trade timestamp might be somewhere in the middle of timeframe period, so the pre-period would be missing because we would not have trades data. To fix that, you can get older data with `fetchTrades` to fill up bars till start bar.
    for (let i = 0; i < generatedBars.length; i++) {
      const bar = generatedBars[i];
      const barTimestamp = bar[0];
      const collectedBarsLength = collectedBars.length;
      const lastCollectedBarTimestamp =
        collectedBarsLength > 0 ? collectedBars[collectedBarsLength - 1][0] : 0;
      if (barTimestamp === lastCollectedBarTimestamp) {
        // if timestamps are same, just updarte the last bar
        collectedBars[collectedBarsLength - 1] = bar;
      } else if (barTimestamp > lastCollectedBarTimestamp) {
        collectedBars.push(bar);
        // remove the trades from saved array, which were till last collected bar's open timestamp
        collectedTrades = exch.filterBySinceLimit(
          collectedTrades,
          barTimestamp
        );
      }
    }
    // Note: first bar would carry incomplete values, please read comment in "buildOHLCVCFromWatchTrades" method definition for further explanation
    console.log(
      "[WS] Constructed",
      collectedBars.length,
      "bars from",
      symbol,
      "trades: ",
      collectedBars
    );
  }
}

export default function Home() {
  useEffect(() => {
    example_with_fetch_trades();
  }, []);

  return <div>hello world</div>;
}
