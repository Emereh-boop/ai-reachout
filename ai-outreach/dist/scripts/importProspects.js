"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichProspects = enrichProspects;
const fs_1 = __importDefault(require("fs"));
const csv_parse_1 = require("csv-parse");
const csv_stringify_1 = require("csv-stringify");
const axios_1 = __importDefault(require("axios"));
// Helper to extract <title>, meta description, and other metadata from HTML
function extractAllMetadata(html) {
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
function enrichProspects() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const input = [];
            fs_1.default.createReadStream('scripts/prospects.csv')
                .pipe((0, csv_parse_1.parse)({ columns: true, trim: true }))
                .on('data', row => input.push(row))
                .on('end', () => __awaiter(this, void 0, void 0, function* () {
                const enriched = [];
                for (const prospect of input) {
                    let meta = {};
                    try {
                        if (prospect.website) {
                            const res = yield axios_1.default.get(prospect.website, { timeout: 5000 });
                            meta = extractAllMetadata(res.data);
                        }
                    }
                    catch (e) {
                        // Ignore fetch errors, leave fields blank
                    }
                    enriched.push(Object.assign(Object.assign({}, prospect), { title: meta.title || meta.ogTitle || meta.twitterTitle || prospect.title || '', description: meta.description || meta.ogDescription || meta.twitterDescription || prospect.description || '', category: meta.ogType || prospect.category || '', tags: prospect.tags || '', companySize: prospect.companySize || '', inferredIntent: prospect.inferredIntent || '', emailPrompt: prospect.emailPrompt || '', ogSiteName: meta.ogSiteName || '' }));
                }
                (0, csv_stringify_1.stringify)(enriched, {
                    header: true,
                    quoted: true,
                    quoted_empty: true,
                    escape: '"',
                    quoted_match: /.*/,
                    record_delimiter: 'auto',
                }, (err, output) => {
                    if (err)
                        return reject(err);
                    fs_1.default.writeFileSync('scripts/enrichedProspects.csv', output);
                    resolve();
                });
            }))
                .on('error', reject);
        });
    });
}
if (require.main === module) {
    enrichProspects().then(() => {
        console.log("Enrichment complete.");
    }).catch(err => {
        console.error("Enrichment failed:", err);
    });
}
