"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X, Save, Info, Pencil, Users, Clock, RefreshCw,
  MapPin, AlignLeft, ChevronDown, Bold, Italic,
  Underline, Strikethrough, List, ListOrdered,
  Quote, Link2, AlignCenter, Undo2, Redo2,
} from "lucide-react";
import { format, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface NewMeetingFormProps {
  onClose: () => void;
}

export function NewMeetingForm({ onClose }: NewMeetingFormProps) {
  const now = new Date();
  const roundedNow = new Date(Math.ceil(now.getTime() / (30 * 60000)) * (30 * 60000));
  const defaultEnd = addMinutes(roundedNow, 30);

  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState("");
  const [startDate] = useState(format(roundedNow, "dd-MM-yyyy"));
  const [startTime] = useState(format(roundedNow, "hh:mm aa"));
  const [endDate] = useState(format(defaultEnd, "dd-MM-yyyy"));
  const [endTime] = useState(format(defaultEnd, "hh:mm aa"));
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [lobby, setLobby] = useState("People who were invited");
  const [presenter, setPresenter] = useState("Everyone");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="flex flex-col h-full bg-background"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground">New meeting</h1>
          <button className="px-3 py-1 text-sm font-medium text-primary border-b-2 border-primary">
            Details
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Save size={14} className="inline mr-1.5" />
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">

          {/* Timezone */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span>Time zone: (UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi</span>
            <ChevronDown size={12} />
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-muted/30 mb-4">
            <Info size={15} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              With your current Delix plan, you get up to 60 minutes per meeting with up to 100 participants.{" "}
              <button className="text-primary hover:underline">Learn more</button>
            </p>
          </div>

          {/* Title */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent hover:border-border focus-within:border-primary transition-colors bg-muted/20 hover:bg-muted/40">
            <Pencil size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Attendees */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent hover:border-border focus-within:border-primary transition-colors bg-muted/20 hover:bg-muted/40">
            <Users size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Enter name or e-mail"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Date/time row */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-transparent hover:border-border transition-colors bg-muted/20 hover:bg-muted/40">
            <Clock size={15} className="text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {/* Start */}
              <button className="px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors text-foreground">
                {startDate}
              </button>
              <button className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors text-foreground">
                {startTime} <ChevronDown size={12} />
              </button>
              <span className="text-muted-foreground">→</span>
              {/* End */}
              <button className="px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors text-foreground">
                {endDate}
              </button>
              <button className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors text-foreground">
                {endTime} <ChevronDown size={12} />
              </button>
              <span className="text-xs text-muted-foreground">30m</span>

              {/* All day toggle */}
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => setAllDay((v) => !v)}
                  className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    allDay ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                    allDay ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
                <span className="text-xs text-muted-foreground">All day</span>
              </div>
            </div>
          </div>

          {/* Repeat */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent hover:border-border transition-colors bg-muted/20 hover:bg-muted/40">
            <RefreshCw size={15} className="text-muted-foreground shrink-0" />
            <button className="flex items-center gap-1 text-sm text-foreground">
              Does not repeat <ChevronDown size={13} className="text-muted-foreground" />
            </button>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent hover:border-border focus-within:border-primary transition-colors bg-muted/20 hover:bg-muted/40">
            <MapPin size={15} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Details / rich text area */}
          <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <AlignLeft size={13} />
              </span>
              {[
                { icon: Bold, label: "Bold" },
                { icon: Italic, label: "Italic" },
                { icon: Underline, label: "Underline" },
                { icon: Strikethrough, label: "Strikethrough" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} title={label}
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Icon size={13} />
                </button>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              {[
                { icon: List, label: "Bullet list" },
                { icon: ListOrdered, label: "Numbered list" },
                { icon: Quote, label: "Quote" },
                { icon: Link2, label: "Link" },
                { icon: AlignCenter, label: "Align" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} title={label}
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Icon size={13} />
                </button>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Undo2 size={13} />
              </button>
              <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Redo2 size={13} />
              </button>
            </div>

            {/* Text area */}
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Type details for this new meeting"
              rows={5}
              className="w-full bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
            />
          </div>
        </div>

        {/* Right: settings panel */}
        <div className="w-64 shrink-0 border-l border-border px-5 py-5 space-y-5 overflow-y-auto">

          {/* Who can bypass the lobby */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              Who can bypass the lobby?
            </label>
            <div className="relative">
              <select
                value={lobby}
                onChange={(e) => setLobby(e.target.value)}
                className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors pr-8"
              >
                <option>People who were invited</option>
                <option>Everyone</option>
                <option>Only me</option>
                <option>People in my org</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Who can present */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              Who can present
            </label>
            <div className="relative">
              <select
                value={presenter}
                onChange={(e) => setPresenter(e.target.value)}
                className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors pr-8"
              >
                <option>Everyone</option>
                <option>People in my org</option>
                <option>Specific people</option>
                <option>Only me</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
