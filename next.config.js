/** @type {import('next').NextConfig} */
module.exports = {
  distDir: process.env.NWTS_ISOLATED_TEST === '1' ? '.next-test' : '.next',
};
