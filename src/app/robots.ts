export default function robots() {
  return {
    rules: [{ userAgent: '*', disallow: '/' }], // block all crawlers for now
    sitemap: 'https://knowrah.com/sitemap.xml',
  };
}
