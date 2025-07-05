import fs from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { composeEmail } from '../services/emailComposer';
import { sendEmail } from '../services/emailSender';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { io } from '../src/api/index';
dotenv.config();

function daysBetween(date1: Date, date2: Date) {
  return Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
}

export async function runOutreach(targetEmail?: string) {
  return new Promise<void>((resolve, reject) => {
    const input: any[] = [];
    let results: any[] = [];
    // Load previous results
    if (fs.existsSync('results.csv')) {
      const data = fs.readFileSync('results.csv', 'utf8');
      parse(data, { columns: true, trim: true }, (err, rows) => {
        if (!err) results = rows;
      });
    }
    console.log('[DEBUG] Loading prospects.csv...');
    // Pre-validation: check for malformed CSV before outreach
    try {
      const data = fs.readFileSync('scripts/prospects.csv', 'utf8');
      parse(data, { columns: true, trim: true }, (err, rows) => {
        if (err) throw new Error('Malformed prospects.csv: ' + err.message);
      });
    } catch (e) {
      console.error('[SEE MORE] CSV validation failed:', e);
      return reject(e);
    }
    fs.createReadStream('scripts/prospects.csv')
      .pipe(parse({ columns: true, trim: true }))
      .on('data', row => {
        input.push(row);
        console.log(`[SEE MORE] Prospect loaded:`, row);
      })
      .on('error', err => {
        console.error('[SEE MORE] Error reading CSV:', err);
        reject(err);
      })
      .on('end', async () => {
        console.log(`[DEBUG] Loaded ${input.length} prospects.`);
        const newResults = [];
        const now = new Date();
        // Filter prospects with valid email addresses and not recently emailed or confirmed
        let prospectsWithEmail = input.filter(prospect => {
          if (!prospect.email || prospect.email.trim() === '') return false;
          const prev = results.find(r => r.email === prospect.email);
          if (prev) {
            if (prev.confirmed === 'true') return false;
            if (prev.timestamp && daysBetween(new Date(prev.timestamp), now) < 2) return false;
          }
          return true;
        });

        // If targetEmail is provided, filter to only that prospect
        if (targetEmail) {
          prospectsWithEmail = prospectsWithEmail.filter(prospect => 
            prospect.email.toLowerCase() === targetEmail.toLowerCase()
          );
          console.log(`[SEE MORE] Single prospect outreach for: ${targetEmail}`);
        }

        console.log(`[SEE MORE] Prospects eligible for outreach: ${prospectsWithEmail.length} out of ${input.length}`);
        for (const [i, prospect] of prospectsWithEmail.slice(0, 20).entries()) {
          let subject = '', body = '', html = '', status = '', error = '';
          try {
            io.emit('outreach:prepare', { name: prospect.name, email: prospect.email, index: i });
            // Generate a unique confirmation token
            const token = crypto.randomBytes(16).toString('hex');
            const backendUrl = process.env.RENDER_BACKEND_URL || 'https://ai-reachout.onrender.com';
            const confirmationUrl = `${backendUrl}/api/confirm-interest?email=${encodeURIComponent(prospect.email)}&token=${token}`;
            ({ subject, body, html } = await composeEmail({ ...prospect, confirmationUrl }));

            // Interactive approval: emit preview and wait for approve/reject
            const previewData = { subject, body, html, email: prospect.email, name: prospect.name, index: i };
            const approval: any = await new Promise(resolve => {
              io.emit('outreach:preview', previewData);
              const approveHandler = (data: any) => {
                if (data.email === prospect.email && data.index === i) {
                  io.off('outreach:approve', approveHandler);
                  io.off('outreach:reject', rejectHandler);
                  resolve({ approved: true, ...data });
                }
              };
              const rejectHandler = (data: any) => {
                if (data.email === prospect.email && data.index === i) {
                  io.off('outreach:approve', approveHandler);
                  io.off('outreach:reject', rejectHandler);
                  resolve({ approved: false });
                }
              };
              io.on('outreach:approve', approveHandler);
              io.on('outreach:reject', rejectHandler);
            });
            if (!approval.approved) {
              io.emit('outreach:skipped', { name: prospect.name, email: prospect.email, index: i });
              continue;
            }
            // Use possibly edited content
            subject = approval.subject;
            body = approval.body;
            html = approval.html;

            const sendRes = await sendEmail({ to: prospect.email, subject, body, html });
            status = sendRes.status;
            if (sendRes.error) error = String(sendRes.error);
            io.emit('outreach:sent', { name: prospect.name, email: prospect.email, status, error, index: i });
            newResults.push({ email: prospect.email, status, timestamp: new Date().toISOString(), error, confirmed: 'false', token });
          } catch (e) {
            status = 'error';
            error = String(e);
            io.emit('outreach:failed', { name: prospect.name, email: prospect.email, error, index: i });
            newResults.push({ email: prospect.email, status, timestamp: new Date().toISOString(), error, confirmed: 'false', token: '' });
          }
        }
        // Merge new results with old, updating status and keeping confirmations
        const mergedResults = [...results];
        for (const newRes of newResults) {
          const idx = mergedResults.findIndex(r => r.email === newRes.email);
          if (idx !== -1) {
            mergedResults[idx] = { ...mergedResults[idx], ...newRes };
          } else {
            mergedResults.push(newRes);
          }
        }
        stringify(mergedResults, {
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
          fs.writeFileSync('results.csv', output);
          console.log('[SEE MORE] Results written to results.csv');
          console.log('[DEBUG] Results written to results.csv');
          console.log('Outreach complete.');
          resolve();
        });
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