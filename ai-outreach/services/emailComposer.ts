import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function composeEmail({ name, website, title, description, category, tags, companySize, inferredIntent, confirmationUrl }: { name: string; website: string; title: string; description: string; category: string; tags: string; companySize: string; inferredIntent: string; confirmationUrl: string }) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  // Handle tags as string - convert to array if needed or use as is
  const tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
  const tagsText = Array.isArray(tagsArray) ? tagsArray.join(" & ") : tags;
  
  const prompt = `Write a highly persuasive and respectful 3-sentence cold email to ${name} (website: ${website}). Mention their role as "${title}" and highlight how their work in the ${category} space, especially their approach described as "${description}", is impressive. Show how our AI-powered solutions—designed for companies that are ${tagsText} with a team size of ${companySize}—can amplify their efforts without disrupting their vision. End with a humble but confident CTA to schedule a quick 10-minute call if they're open to discussing how we can help ${inferredIntent} together.Format:Subject: [High-performing subject line]Body: [3-sentence email body]`

  const result = await model.generateContent(prompt);
  const response = await result.response;
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
} 