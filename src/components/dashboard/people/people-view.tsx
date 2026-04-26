"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus } from "lucide-react";
import { PeopleSidebar } from "./people-sidebar";
import { ContactsTable, type SortKey } from "./contacts-table";
import { contacts } from "./people-data";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function PeopleView() {
  const [activeTab, setActiveTab] = useState<"all" | "active">("all");
  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey>("name");
  const [sortAsc, setSortAsc]     = useState(true);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = useMemo(() => {
    const base =
      activeTab === "active"
        ? contacts.filter((c) => c.status === "Available")
        : contacts;

    return base
      .filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const av = (a[sortKey] ?? "").toLowerCase();
        const bv = (b[sortKey] ?? "").toLowerCase();
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [activeTab, search, sortKey, sortAsc]);

  const title = activeTab === "all" ? "All contacts" : "Active now";

  return (
    <div className="flex h-full bg-background overflow-hidden">

      {/* ── Left sidebar ── */}
      <PeopleSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar: title + search + sync button */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="flex items-center justify-between px-5 py-[13px] border-b border-border shrink-0 gap-4"
        >
          <h2 className="text-base font-semibold text-foreground shrink-0">{title}</h2>

          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background w-48 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a contact"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
              />
            </div>

            {/* Sync contacts */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0">
              <UserPlus size={13} />
              Sync contacts
            </button>
          </div>
        </motion.div>

        {/* Contacts table */}
        <ContactsTable
          contacts={filtered}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={handleSort}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
