import Head from "next/head";

interface SeoHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
}

export function SeoHead({
  title = "Stitch - Premium Minimalist Fashion",
  description = "Discover a curated collection of premium, minimalist fashion. Shop ethically sourced, meticulously crafted garments that redefine modern elegance.",
  image = "https://stitch-shop.com/og-image.jpg",
  url = "https://stitch-shop.com",
  type = "website",
}: SeoHeadProps) {
  const fullTitle = title.includes("Stitch") ? title : `${title} | Stitch`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Canonical */}
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Stitch" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
