"use client";

import React from "react";
import Link from "next/link";

const homeCards = [
  {
    label: "Contact List",
    description: "Manage your prospects",
    href: "/explorer",
  },
  {
    label: "Email Schedule",
    description: "Automate your campaigns",
    href: "/schedule",
  },
  {
    label: "Clients",
    description: "View your top connections",
    href: "/crm",
  },
  {
    label: "Composer",
    description: "Compose and send outreach",
    href: "/composer",
  },
  {
    label: "Settings",
    description: "Configure your preferences",
    href: "/settings",
  },
];

const recentContacts = [
  {
    name: "Kristin Watson",
    email: "kristin.watson@example.com",
    role: "Marketing Coordinator at ABC Inc",
    initial: "K",
  },
  {
    name: "Darrell Steward",
    email: "darrell.steward@example.com",
    role: "Product Manager at XYZ Corp",
    initial: "D",
  },
  {
    name: "Jacob Jones",
    email: "jacob.jones@example.com",
    role: "Sales Executive at 129 Ventures",
    initial: "J",
  },
  {
    name: "Ariene McCoy",
    email: "arlone.inccoy@example.com",
    role: "Lead Designer at Design-Studio",
    initial: "A",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFE6A7] py-6">
      <div className="w-full max-w-3xl bg-[#FFF6DC] rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center mb-3">
          <span className="text-2xl font-bold text-[#2D2A32] flex items-center gap-2">
            <span className="inline-block w-6 h-6 bg-gradient-to-tr from-blue-400 to-yellow-400 rounded-full mr-1" />
            Beam
          </span>
      </div>
        <h1 className="text-3xl font-bold text-[#2D2A32] mb-2">AI-Powered Outreach</h1>
        <div className="flex justify-center mb-8">
          <Link href="/composer">
            <button className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold py-1 px-6 rounded-full text-lg shadow transition">New Outreach</button>
          </Link>
                      </div>
        {/* Main Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {homeCards.slice(0, 3).map((card, i) => (
            <Link key={i} href={card.href} className="bg-[#FFF6DC] rounded-xl p-5 flex flex-col items-center shadow hover:scale-105 transition cursor-pointer">
              <span className="font-semibold text-[#2D2A32]">{card.label}</span>
              <span className="text-xs text-gray-500 mt-1">{card.description}</span>
            </Link>
          ))}
                        </div>
        {/* Extra Cards Row */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {homeCards.slice(3).map((card, i) => (
            <Link key={i} href={card.href} className="bg-[#FFF6DC] rounded-xl p-5 flex flex-col items-center shadow hover:scale-105 transition cursor-pointer">
              <span className="font-semibold text-[#2D2A32]">{card.label}</span>
              <span className="text-xs text-gray-500 mt-1">{card.description}</span>
            </Link>
                  ))}
                </div>
        {/* Recent Contacts */}
        <div>
          <h2 className="text-lg font-semibold text-[#2D2A32] mb-4">Recent Contacts</h2>
          <div className="bg-[#FFF6DC] rounded-xl p-4">
            {recentContacts.map((contact, idx) => (
              <div key={contact.email} className={`flex items-center justify-between py-2 ${idx !== recentContacts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFD1DC] flex items-center justify-center font-bold text-[#2D2A32] text-lg">
                    {contact.initial}
                  </div>
                  <div>
                    <div className="font-semibold text-[#2D2A32]">{contact.name}</div>
                    <div className="text-xs text-gray-500">{contact.email}</div>
                    <div className="text-xs text-gray-400">{contact.role}</div>
                  </div>
                </div>
                <button className="bg-[#FFD1DC] hover:bg-[#FFB6C1] text-[#2D2A32] font-semibold px-4 py-2 rounded-full text-sm shadow transition">View</button>
              </div>
            ))}
          </div>
            </div>
          </div>
        </div>
  );
}


