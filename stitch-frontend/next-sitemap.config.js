/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  exclude: ['/admin/*', '/seller/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/seller', '/checkout', '/account'],
      },
    ],
  },
};
