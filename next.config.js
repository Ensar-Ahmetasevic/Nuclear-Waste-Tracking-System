/** @type {import('next').NextConfig} */
module.exports = {
  // NWTS_DIST_DIR lets a second dev server run beside the first one.
  distDir: process.env.NWTS_DIST_DIR || (process.env.NWTS_ISOLATED_TEST === '1' ? '.next-test' : '.next'),
  // The local demo (npm run dev) simulates measuring devices; real deployments never do.
  env: { NWTS_DEVICE_SIMULATION: process.env.NWTS_ALLOW_DEMO_SEED === '1' ? '1' : '' },
};
