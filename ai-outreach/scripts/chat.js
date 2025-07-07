"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generateProspects_1 = require("./generateProspects");
console.log('Starting Daily Prospect Generator Chat...\n');
(0, generateProspects_1.chatWithUser)().catch(console.error);
