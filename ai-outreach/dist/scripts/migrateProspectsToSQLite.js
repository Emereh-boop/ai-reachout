"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("csv-parse/sync");
const db = new better_sqlite3_1.default(path_1.default.join(__dirname, '../data.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    social TEXT,
    website TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    tags TEXT,
    companySize TEXT,
    inferredIntent TEXT,
    emailPrompt TEXT,
    reachedOut TEXT,
    enriched BOOLEAN
  );
`);
// Read JSON prospects
let jsonProspects = [];
const jsonPath = path_1.default.join(__dirname, 'prospects.json');
if (fs_1.default.existsSync(jsonPath)) {
    const jsonData = fs_1.default.readFileSync(jsonPath, 'utf-8');
    try {
        jsonProspects = JSON.parse(jsonData);
    }
    catch (e) {
        console.error('Failed to parse prospects.json:', e);
    }
}
// Read CSV prospects
let csvProspects = [];
const csvPath = path_1.default.join(__dirname, 'prospects.csv');
if (fs_1.default.existsSync(csvPath)) {
    const csvData = fs_1.default.readFileSync(csvPath, 'utf-8');
    try {
        csvProspects = (0, sync_1.parse)(csvData, { columns: true, skip_empty_lines: true });
    }
    catch (e) {
        console.error('Failed to parse prospects.csv:', e);
    }
}
// Combine and deduplicate by email
const allProspects = [...jsonProspects, ...csvProspects];
const uniqueProspects = {};
for (const p of allProspects) {
    if (p.email) {
        uniqueProspects[p.email] = Object.assign(Object.assign({}, uniqueProspects[p.email]), p);
    }
}
const insert = db.prepare(`
  INSERT OR REPLACE INTO prospects
  (name, email, phone, social, website, title, description, category, tags, companySize, inferredIntent, emailPrompt, reachedOut, enriched)
  VALUES (@name, @email, @phone, @social, @website, @title, @description, @category, @tags, @companySize, @inferredIntent, @emailPrompt, @reachedOut, @enriched)
`);
let inserted = 0;
for (const email in uniqueProspects) {
    const fields = [
        "name", "email", "phone", "social", "website", "title", "description",
        "category", "tags", "companySize", "inferredIntent", "emailPrompt", "reachedOut", "enriched"
    ];
    for (const field of fields) {
        let value = uniqueProspects[email][field];
        if (value === undefined)
            value = null;
        // Convert objects/arrays to JSON strings
        if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
        }
        // Convert booleans to 0/1
        if (typeof value === 'boolean') {
            value = value ? 1 : 0;
        }
        uniqueProspects[email][field] = value;
    }
    insert.run(uniqueProspects[email]);
    inserted++;
}
console.log(`Inserted/updated ${inserted} unique prospects into SQLite.`);
