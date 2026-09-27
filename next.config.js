/** @type {import('next').NextConfig} */
module.exports = {
  // NWTS_DIST_DIR lets a second dev server run beside the first one.
  distDir: process.env.NWTS_DIST_DIR || (process.env.NWTS_ISOLATED_TEST === '1' ? '.next-test' : '.next'),
};
