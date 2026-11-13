#!/usr/bin/env node
'use strict';

const REQUESTS = 10;
const TIMEOUT_MS = 120_000;

function parseUrl(raw) {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url;
  } catch {
    console.error('Usage: node speedtest.js <http(s)://url>');
    process.exit(1);
  }
}

async function measure(url) {
  const start = process.hrtime.bigint();
  const res = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    headers: { 'Accept-Encoding': 'identity' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  let bytes = 0;
  if (res.body) {
    for await (const chunk of res.body) bytes += chunk.byteLength;
  }

  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { bytes, ms };
}

async function main() {
  const url = parseUrl(process.argv[2]);
  console.log(`Target:   ${url.href}\nRequests: ${REQUESTS}\n`);

  const results = [];
  for (let i = 1; i <= REQUESTS; i++) {
    try {
      const r = await measure(url);
      results.push(r);
      console.log(`#${String(i).padStart(2)}  ${(r.bytes / 1e6).toFixed(2)} MB  ${r.ms.toFixed(0)} ms`);
    } catch (err) {
      console.error(`#${String(i).padStart(2)}  failed: ${err.message}`);
    }
  }

  if (!results.length) {
    console.error('\nAll requests failed.');
    process.exit(1);
  }

  const totalBytes = results.reduce((s, r) => s + r.bytes, 0);
  const totalMs = results.reduce((s, r) => s + r.ms, 0);
  const avgMs = totalMs / results.length;
  const mbps = (totalBytes * 8) / 1e6 / (totalMs / 1000);

  console.log('\n--- Result ---');
  console.log(`Successful:   ${results.length}/${REQUESTS}`);
  console.log(`Average time: ${avgMs.toFixed(0)} ms`);
  console.log(`Downloaded:   ${(totalBytes / 1e6).toFixed(2)} MB`);
  console.log(`Speed:        ${mbps.toFixed(2)} Mbit/s (${(mbps / 8).toFixed(2)} MB/s)`);
}

main();
