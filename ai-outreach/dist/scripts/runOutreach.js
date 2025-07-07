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
exports.runOutreach = runOutreach;
const fs_1 = __importDefault(require("fs"));
const csv_parse_1 = require("csv-parse");
const csv_stringify_1 = require("csv-stringify");
const emailComposer_1 = require("../services/emailComposer");
const emailSender_1 = require("../services/emailSender");
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = require("../api/index");
dotenv_1.default.config();
function daysBetween(date1, date2) {
    return Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
}
function runOutreach(targetEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const input = [];
            let results = [];
            // Load previous results
            if (fs_1.default.existsSync('results.csv')) {
                const data = fs_1.default.readFileSync('results.csv', 'utf8');
                (0, csv_parse_1.parse)(data, { columns: true, trim: true }, (err, rows) => {
                    if (!err)
                        results = rows;
                });
            }
            console.log('[DEBUG] Loading prospects.csv...');
            // Pre-validation: check for malformed CSV before outreach
            try {
                const data = fs_1.default.readFileSync('scripts/prospects.csv', 'utf8');
                (0, csv_parse_1.parse)(data, { columns: true, trim: true }, (err, rows) => {
                    if (err)
                        throw new Error('Malformed prospects.csv: ' + err.message);
                });
            }
            catch (e) {
                console.error('[SEE MORE] CSV validation failed:', e);
                return reject(e);
            }
            fs_1.default.createReadStream('scripts/prospects.csv')
                .pipe((0, csv_parse_1.parse)({ columns: true, trim: true }))
                .on('data', row => {
                input.push(row);
                console.log(`[SEE MORE] Prospect loaded:`, row);
            })
                .on('error', err => {
                console.error('[SEE MORE] Error reading CSV:', err);
                reject(err);
            })
                .on('end', () => __awaiter(this, void 0, void 0, function* () {
                console.log(`[DEBUG] Loaded ${input.length} prospects.`);
                const newResults = [];
                const now = new Date();
                // Filter prospects with valid email addresses and not recently emailed or confirmed
                let prospectsWithEmail = input.filter(prospect => {
                    if (!prospect.email || prospect.email.trim() === '')
                        return false;
                    const prev = results.find(r => r.email === prospect.email);
                    if (prev) {
                        if (prev.confirmed === 'true')
                            return false;
                        if (prev.timestamp && daysBetween(new Date(prev.timestamp), now) < 2)
                            return false;
                    }
                    return true;
                });
                // If targetEmail is provided, filter to only that prospect
                if (targetEmail) {
                    prospectsWithEmail = prospectsWithEmail.filter(prospect => prospect.email.toLowerCase() === targetEmail.toLowerCase());
                    console.log(`[SEE MORE] Single prospect outreach for: ${targetEmail}`);
                }
                console.log(`[SEE MORE] Prospects eligible for outreach: ${prospectsWithEmail.length} out of ${input.length}`);
                for (const [i, prospect] of prospectsWithEmail.slice(0, 20).entries()) {
                    let subject = '', body = '', html = '', status = '', error = '';
                    try {
                        index_1.io.emit('outreach:prepare', { name: prospect.name, email: prospect.email, index: i });
                        // Generate a unique confirmation token
                        const token = crypto_1.default.randomBytes(16).toString('hex');
                        const backendUrl = process.env.RENDER_BACKEND_URL || 'https://ai-reachout.onrender.com';
                        const confirmationUrl = `${backendUrl}/api/confirm-interest?email=${encodeURIComponent(prospect.email)}&token=${token}`;
                        ({ subject, body, html } = yield (0, emailComposer_1.composeEmail)(Object.assign(Object.assign({}, prospect), { confirmationUrl })));
                        // Interactive approval: emit preview and wait for approve/reject
                        const previewData = { subject, body, html, email: prospect.email, name: prospect.name, index: i };
                        const approval = yield new Promise(resolve => {
                            index_1.io.emit('outreach:preview', previewData);
                            const approveHandler = (data) => {
                                if (data.email === prospect.email && data.index === i) {
                                    index_1.io.off('outreach:approve', approveHandler);
                                    index_1.io.off('outreach:reject', rejectHandler);
                                    resolve(Object.assign({ approved: true }, data));
                                }
                            };
                            const rejectHandler = (data) => {
                                if (data.email === prospect.email && data.index === i) {
                                    index_1.io.off('outreach:approve', approveHandler);
                                    index_1.io.off('outreach:reject', rejectHandler);
                                    resolve({ approved: false });
                                }
                            };
                            index_1.io.on('outreach:approve', approveHandler);
                            index_1.io.on('outreach:reject', rejectHandler);
                        });
                        if (!approval.approved) {
                            index_1.io.emit('outreach:skipped', { name: prospect.name, email: prospect.email, index: i });
                            continue;
                        }
                        // Use possibly edited content
                        subject = approval.subject;
                        body = approval.body;
                        html = approval.html;
                        const sendRes = yield (0, emailSender_1.sendEmail)({ to: prospect.email, subject, body, html });
                        status = sendRes.status;
                        if (sendRes.error)
                            error = String(sendRes.error);
                        index_1.io.emit('outreach:sent', { name: prospect.name, email: prospect.email, status, error, index: i });
                        newResults.push({ email: prospect.email, status, timestamp: new Date().toISOString(), error, confirmed: 'false', token });
                    }
                    catch (e) {
                        status = 'error';
                        error = String(e);
                        index_1.io.emit('outreach:failed', { name: prospect.name, email: prospect.email, error, index: i });
                        newResults.push({ email: prospect.email, status, timestamp: new Date().toISOString(), error, confirmed: 'false', token: '' });
                    }
                }
                // Merge new results with old, updating status and keeping confirmations
                const mergedResults = [...results];
                for (const newRes of newResults) {
                    const idx = mergedResults.findIndex(r => r.email === newRes.email);
                    if (idx !== -1) {
                        mergedResults[idx] = Object.assign(Object.assign({}, mergedResults[idx]), newRes);
                    }
                    else {
                        mergedResults.push(newRes);
                    }
                }
                (0, csv_stringify_1.stringify)(mergedResults, {
                    header: true,
                    quoted: true,
                    quoted_empty: true,
                    escape: '"',
                    quoted_match: /.*/,
                    record_delimiter: 'auto',
                }, (err, output) => {
                    if (err) {
                        console.error('[SEE MORE] Error writing results:', err);
                        return reject(err);
                    }
                    fs_1.default.writeFileSync('results.csv', output);
                    console.log('[SEE MORE] Results written to results.csv');
                    console.log('[DEBUG] Results written to results.csv');
                    console.log('Outreach complete.');
                    resolve();
                });
            }));
        });
    });
}
// Execute if run directly
if (require.main === module) {
    console.log('[SEE MORE] Starting outreach process...');
    runOutreach().then(() => {
        console.log('[SEE MORE] Outreach process completed successfully.');
    }).catch(err => {
        console.error('[SEE MORE] Outreach process failed:', err);
        process.exit(1);
    });
}
