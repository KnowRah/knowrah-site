export default function robots() {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
    sitemap: 'https://knowrah.com/sitemap.xml'
  };
}
