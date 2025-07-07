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
exports.composeEmail = composeEmail;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
function composeEmail(_a) {
    return __awaiter(this, arguments, void 0, function* ({ name, website, title, description, category, tags, companySize, inferredIntent, confirmationUrl }) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        // Handle tags as string - convert to array if needed or use as is
        const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        const tagsText = Array.isArray(tagsArray) ? tagsArray.join(" & ") : tags;
        const prompt = `Write a highly persuasive and respectful 3-sentence cold email to ${name} (website: ${website}). Mention their role as "${title}" and highlight how their work in the ${category} space, especially their approach described as "${description}", is impressive. Show how our AI-powered solutions—designed for companies that are ${tagsText} with a team size of ${companySize}—can amplify their efforts without disrupting their vision. End with a humble but confident CTA to schedule a quick 10-minute call if they're open to discussing how we can help ${inferredIntent} together.Format:Subject: [High-performing subject line]Body: [3-sentence email body]`;
        const result = yield model.generateContent(prompt);
        const response = yield result.response;
        const text = response.text();
        const subjectMatch = text.match(/Subject: (.*)/);
        const bodyMatch = text.match(/Body: ([\s\S]*)/);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'Follow up';
        const body = bodyMatch ? bodyMatch[1].trim() : text;
        // Add confirmation link and CTA
        const confirmationText = `\n\n---\nIf you're interested, please confirm by clicking the link below:\n${confirmationUrl}\n`;
        const confirmationHtml = `<br><br><hr><p style='font-size:1.1em;'>If you're interested, please confirm by clicking the button below:</p><a href="${confirmationUrl}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:1.1em;">I'm Interested</a>`;
        return {
            subject,
            body: body + confirmationText,
            html: `<div style='font-family:sans-serif;line-height:1.6;'>${body.replace(/\n/g, '<br>')}${confirmationHtml}</div>`
        };
    });
}
