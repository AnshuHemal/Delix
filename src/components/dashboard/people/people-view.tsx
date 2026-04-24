"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Users, Clock, Settings, Search,
  MessageSquare, Phone, MoreHorizontal,
  UserPlus, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

type Contact = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatar?: string;
  status: "Available" | "Away" | "Busy" | "Offline";
  email?: string;
  phone?: string;
  isMe?: boolean;
};

const contacts: Contact[] = [
  { id: "1", name: "Abhishek Joshi", initials: "AJ", avatarColor: "bg-orange-200 text-orange-800", status: "Away", email: "abhishek.mohidev@gmail.com" },
  { id: "2", name: "Archi Solanki", initials: "AS", avatarColor: "bg-pink-200 text-pink-800", status: "Away", email: "mekanism.hr@gmail.com", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { id: "3", name: "Dharmajsinh Dabhi", initials: "DD", avatarColor: "bg-teal-200 text-teal-800", status: "Away" },
  { id: "4", name: "Hanee Gajjar", initials: "HG", avatarColor: "bg-purple-200 text-purple-800", status: "Away", email: "hr.mekanism@gmail.com", avatar: "https://randomuser.me/api/portraits/women/65.jpg" },
  { id: "5", name: "Jay U.", initials: "JU", avatarColor: "bg-blue-200 text-blue-800", status: "Away" },
  { id: "6", name: "Kunal Fauzdar", initials: "KF", avatarColor: "bg-violet-200 text-violet-800", status: "Away", email: "kunal.jsdev@gmail.com" },
  { id: "7", name: "Maulik Parmar", initials: "MP", avatarColor: "bg-green-200 text-green-800", status: "Away" },
  { id: "8", name: "Nandini Upadhyay", initials: "NU", avatarColor: "bg-yellow-200 text-yellow-800", status: "Away" },
  { id: "9", name: "Rakshit Tanti", initials: "RT", avatarColor: "bg-red-200 text-red-800", status: "Away", email: "rakshittanti@live.in", avatar: "https://randomuser.me/api/portraits/men/46.jpg" },
  { id: "10", name: "Shubhangee Patil", initials: "SP", avatarColor: "bg-indigo-200 text-indigo-800", status: "Away", email: "jobs.mekanism@gmail.com" },
];

const myProfile: Contact = {
  id: "me",
  name: "Hemal Katariya",
  initials: "HK",
  avatarColor: "bg-primary/20 text-primary",
  status: "Available",
  isMe: true,
};

const statusColor: Record<Contact["status"], string> = {
  Available: "bg-green-500",
  Away: "bg-yellow-400",
  Busy: "bg-red-500",
  Offline: "bg-zinc-400",
};

function Avatar({ contact, size = "md" }: { contact: Contact; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs";
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <div className="relative shrink-0">
      {contact.avatar ? (
        <Image src={contact.avatar} alt={contact.name} width={32} height={32} unoptimized
          className={cn("rounded-full object-cover", dim)} />
      ) : (
        <div className={cn("rounded-full flex items-center justify-center font-semibold", dim, contact.avatarColor)}>
          {contact.initials}
        </div>
      )}
      <span className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background",
        dotSize, statusColor[contact.status]
      )} />
    </div>
  );
}

type SortKey = "name" | "email" | "phone";

export function PeopleView() {
  const [activeTab, setActiveTab] = useState<"all" | "active">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = contacts
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = (a[sortKey] ?? "").toLowerCase();
      const bv = (b[sortKey] ?? "").toLowerCase();
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="opacity-0 group-hover:opacity-40" />;
    return sortAsc
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">

      {/* ── Left sidebar ── */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="w-64 shrink-0 border-r border-border flex flex-col bg-sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h1 className="text-base font-semibold text-foreground">People</h1>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Settings size={16} />
          </button>
        </div>

        {/* Nav */}
        <div className="px-2 py-2 space-y-0.5">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "all"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Users size={16} />
            All contacts
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "active"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Clock size={16} />
            Active now
          </button>
        </div>

        {/* My profile */}
        <div className="mt-4 px-2">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
            <Avatar contact={myProfile} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{myProfile.name}</p>
              <p className="text-xs text-muted-foreground">Your profile</p>
            </div>
            <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all text-muted-foreground">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Invite button */}
        <div className="p-3 border-t border-border">
          <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <UserPlus size={15} />
            Invite to Delix
          </button>
        </div>
      </motion.aside>

      {/* ── Main: contacts table ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Table header bar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: EASE }}
          className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0"
        >
          <h2 className="text-base font-semibold text-foreground">
            {activeTab === "all" ? "All contacts" : "Active now"}
          </h2>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background w-52 focus-within:border-primary transition-colors">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a contact"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </motion.div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-6 py-2 border-b border-border text-xs font-semibold text-muted-foreground shrink-0">
          <button onClick={() => handleSort("name")} className="flex items-center gap-1 text-left group">
            Name <SortIcon col="name" />
          </button>
          <button onClick={() => handleSort("email")} className="flex items-center gap-1 text-left group">
            Email <SortIcon col="email" />
          </button>
          <span>Phone</span>
          <span className="w-20" />
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {filtered.map((contact) => (
              <motion.div
                key={contact.id}
                variants={rowVariants}
                className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 items-center px-6 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors group cursor-pointer"
              >
                {/* Name + avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar contact={contact} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.status}</p>
                  </div>
                </div>

                {/* Email */}
                <span className="text-sm text-primary truncate">
                  {contact.email ?? ""}
                </span>

                {/* Phone */}
                <span className="text-sm text-muted-foreground">
                  {contact.phone ?? ""}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity w-20 justify-end">
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <MessageSquare size={15} />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Phone size={15} />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <MoreHorizontal size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
