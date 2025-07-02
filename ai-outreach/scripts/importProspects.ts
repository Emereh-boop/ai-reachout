import fs from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import axios from 'axios';

// Helper to extract <title>, meta description, and other metadata from HTML
function extractAllMetadata(html: string): any {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogTypeMatch = html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const twitterDescMatch = html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  return {
    title: titleMatch ? titleMatch[1] : '',
    description: descMatch ? descMatch[1] : '',
    ogTitle: ogTitleMatch ? ogTitleMatch[1] : '',
    ogDescription: ogDescMatch ? ogDescMatch[1] : '',
    ogType: ogTypeMatch ? ogTypeMatch[1] : '',
    ogSiteName: ogSiteNameMatch ? ogSiteNameMatch[1] : '',
    twitterTitle: twitterTitleMatch ? twitterTitleMatch[1] : '',
    twitterDescription: twitterDescMatch ? twitterDescMatch[1] : ''
  };
}

export async function enrichProspects() {
  return new Promise<void>((resolve, reject) => {
    const input: any[] = [];
    fs.createReadStream('scripts/prospects.csv')
      .pipe(parse({ columns: true, trim: true }))
      .on('data', row => input.push(row))
      .on('end', async () => {
        const enriched = [];
        for (const prospect of input) {
          let meta: any = {};
          try {
            if (prospect.website) {
              const res = await axios.get(prospect.website, { timeout: 5000 });
              meta = extractAllMetadata(res.data);
            }
          } catch (e) {
            // Ignore fetch errors, leave fields blank
          }
          enriched.push({
            ...prospect,
            title: meta.title || meta.ogTitle || meta.twitterTitle || prospect.title || '',
            description: meta.description || meta.ogDescription || meta.twitterDescription || prospect.description || '',
            category: meta.ogType || prospect.category || '',
            tags: prospect.tags || '',
            companySize: prospect.companySize || '',
            inferredIntent: prospect.inferredIntent || '',
            emailPrompt: prospect.emailPrompt || '',
            ogSiteName: meta.ogSiteName || '',
            // Add more fields as needed
          });
        }
        stringify(enriched, {
          header: true,
          quoted: true,
          quoted_empty: true,
          escape: '"',
          quoted_match: /.*/,
          record_delimiter: 'auto',
        }, (err, output) => {
          if (err) return reject(err);
          fs.writeFileSync('scripts/enrichedProspects.csv', output);
          resolve();
        });
      })
      .on('error', reject);
  });
}

if (require.main === module) {
  enrichProspects().then(() => {
    console.log("Enrichment complete.");
  }).catch(err => {
    console.error("Enrichment failed:", err);
  });
} 