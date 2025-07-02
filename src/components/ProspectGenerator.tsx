'use client';
import { useState } from 'react';
import { Card, Button } from './ui';
import { MapPin, Building2, Users, Target, Plus, Mail, Phone, Globe, User, Tag, Share2, FileText, Loader2 } from 'lucide-react';

interface Prospect {
  name: string;
  email: string;
  phone?: string;
  socialMedia?: string;
  website: string;
  title: string;
  description: string;
  category: string;
  tags: string;
  companySize: string;
  inferredIntent: string;
  emailPrompt: string;
}

export function ProspectGenerator() {
  const [formData, setFormData] = useState({
    location: 'Lagos',
    industry: 'Technology',
    companySize: '1-10',
    intent: 'growth',
    additional: '',
    count: 10,
  });
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const generateProspects = async () => {
    setLoading(true);
    setMessage('');
    setProspects([]);

    try {
      const response = await fetch('https://ai-reachout.onrender.com/generate-prospects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setProspects(data.prospects);
        setMessage(data.message);
      } else {
        setMessage(data.message || 'Failed to Find prospects');
      }
    } catch (error) {
      setMessage('Error connecting to server');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl bg-transparent shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
       Daily Prospect Generator
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-indigo-700 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-indigo-600" /> Location
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-xl text-black bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., Lagos, Abuja, Enugu"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-indigo-700 flex items-center gap-1">
            <Building2 className="w-4 h-4 text-indigo-600" /> Industry
          </label>
          <select
            name="industry"
            value={formData.industry}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-xl text-black bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="Technology">Technology</option>
            <option value="Education">Education</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Retail">Retail</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Finance">Finance</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Food & Beverage">Food & Beverage</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-indigo-700 flex items-center gap-1">
            <Users className="w-4 h-4 text-indigo-600" /> Company Size
          </label>
          <select
            name="companySize"
            value={formData.companySize}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-xl text-black bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="1-10">1-10 employees</option>
            <option value="10-49">10-49 employees</option>
            <option value="50-249">50-249 employees</option>
            <option value="250+">250+ employees</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-indigo-700 flex items-center gap-1">
            <Target className="w-4 h-4 text-indigo-600" /> Business Intent
          </label>
          <select
            name="intent"
            value={formData.intent}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-xl text-black bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="growth">Growth</option>
            <option value="optimization">Optimization</option>
            <option value="efficiency">Efficiency</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-indigo-700 flex items-center gap-1">
            <Plus className="w-4 h-4 text-indigo-600" /> Number of Prospects
          </label>
          <input
            type="number"
            name="count"
            min={1}
            max={20}
            value={formData.count}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-xl text-black bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Number to generate"
          />
        </div>

        <div className="md:col-span-2 lg:col-span-2">
          <label className="block text-sm font-medium mb-2 text-indigo-700 flex items-center gap-1">
            <Plus className="w-4 h-4 text-indigo-600" /> Additional Instructions
          </label>
          <input
            type="text"
            name="additional"
            value={formData.additional}
            onChange={handleInputChange}
            className="w-full p-3 border border-gray-300 rounded-xl text-black bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Optional: instructions for the AI (e.g., only schools with STEM focus)"
          />
        </div>
      </div>

      <Button 
        onClick={generateProspects} 
        disabled={loading}
        className="w-1/4 mb- 6 bg-indigo-600 hover:bg-indigo-700 text-white font-normal py-3 rounded-xl"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin w-5 h-5" /> Pinging Prospects...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Share2 className="w-5 h-5" /> Find Prospects
          </span>
        )}
      </Button>

      {message && (
        <div className={`p-4 rounded-md mb-6 ${
          message.includes('success') || message.includes('Generated') 
            ? 'bg-indigo-100 text-indigo-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {prospects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-indigo-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Generated Prospects
          </h3>
          {prospects.map((prospect, index) => (
            <div key={index} className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-red-600 text-xl font-bold focus:outline-none"
                title="Remove prospect"
                onClick={() => setProspects(prospects => prospects.filter((_, i) => i !== index))}
              >
                &times;
              </button>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg text-black flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />{prospect.name}
                </h4>
                <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">
                  {prospect.companySize}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="font-medium text-black flex items-center gap-1">
                    <Mail className="w-4 h-4 text-indigo-600" /> Email:
                  </span> 
                  <span className="text-gray-700">{prospect.email || 'No email'}</span>
                </div>
                <div>
                  <span className="font-medium text-black flex items-center gap-1">
                    <Phone className="w-4 h-4 text-indigo-600" /> Phone:
                  </span> 
                  <span className="text-gray-700">{prospect.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-black flex items-center gap-1">
                    <Globe className="w-4 h-4 text-indigo-600" /> Website:
                  </span> 
                  <span className="text-gray-700">{prospect.website || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-black flex items-center gap-1">
                    <User className="w-4 h-4 text-indigo-600" /> Title:
                  </span> 
                  <span className="text-gray-700">{prospect.title}</span>
                </div>
              </div>
              
              <div className="text-sm mb-2">
                <span className="font-medium text-black flex items-center gap-1">
                  <FileText className="w-4 h-4 text-indigo-600" /> Description:
                </span> 
                <span className="text-gray-700">{prospect.description}</span>
              </div>
              
              <div className="text-sm mb-2">
                <span className="font-medium text-black flex items-center gap-1">
                  <Tag className="w-4 h-4 text-indigo-600" /> Tags:
                </span> 
                <span className="text-gray-700">{prospect.tags}</span>
              </div>
              
              {prospect.socialMedia && (
                <div className="text-sm mb-2">
                  <span className="font-medium text-black flex items-center gap-1">
                    <Share2 className="w-4 h-4 text-indigo-600" /> Social:
                  </span> 
                  <span className="text-gray-700">{prospect.socialMedia}</span>
                </div>
              )}
              
              <div className="text-sm">
                <span className="font-medium text-black flex items-center gap-1">
                  <Mail className="w-4 h-4 text-indigo-600" /> Email Prompt:
                </span>
                <div className="mt-1 p-3 bg-gray-50 rounded-xl text-xs text-gray-700 border">
                  {prospect.emailPrompt}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
} 