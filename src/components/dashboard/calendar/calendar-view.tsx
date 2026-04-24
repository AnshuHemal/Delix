"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Hash,
  Video,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { JoinMeetingModal } from "@/components/dashboard/meet/join-meeting-modal";
import { CreateMeetingModal } from "@/components/dashboard/meet/create-meeting-modal";
import { MeetNowModal } from "@/components/dashboard/meet/meet-now-modal";
import { NewMeetingForm } from "./new-meeting-form";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Hours to display: 12 AM → 11 PM
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CELL_HEIGHT = 56; // px per hour

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function getWorkWeekDays(baseDate: Date): Date[] {
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [now, setNow] = useState(new Date());
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMeetNowModal, setShowMeetNowModal] = useState(false);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = getWorkWeekDays(currentDate);
  const monthLabel = format(currentDate, "MMMM yyyy");

  // Update current time every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const h = now.getHours();
    const scrollTo = Math.max(0, (h - 1) * CELL_HEIGHT);
    scrollRef.current.scrollTop = scrollTo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToToday() {
    setDirection(0);
    setCurrentDate(new Date());
  }

  function prevWeek() {
    setDirection(-1);
    setCurrentDate((d) => subWeeks(d, 1));
  }

  function nextWeek() {
    setDirection(1);
    setCurrentDate((d) => addWeeks(d, 1));
  }

  // Current time line position (fraction of day)
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMinutes / (24 * 60)) * (CELL_HEIGHT * 24);

  // Is today in the current week view?
  const todayInView = days.some((d) => isToday(d));

  return (
    <AnimatePresence mode="wait">
      {showNewMeeting ? (
        <NewMeetingForm key="new-meeting" onClose={() => setShowNewMeeting(false)} />
      ) : (
    <div key="calendar" className="flex flex-col h-full bg-background overflow-hidden">

      {/* ── Top bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0"
      >
        {/* Left: title */}
        <div className="flex items-center gap-2.5">
          <CalendarDays size={20} className="text-primary" />
          <h1 className="text-base font-semibold text-foreground">Calendar</h1>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Hash size={14} className="text-primary" />
            Join with an ID
          </button>
          <button
            onClick={() => setShowMeetNowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Video size={14} />
            Meet now
          </button>
          <button
            onClick={() => setShowNewMeeting(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={15} />
            New meeting
          </button>
        </div>
      </motion.div>

      {/* ── Sub-bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex items-center justify-between px-5 py-2 border-b border-border shrink-0"
      >
        {/* Left: nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors">
            {monthLabel}
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </div>

        {/* Right: view toggle */}
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors">
          <LayoutGrid size={14} />
          Work week
          <ChevronDown size={13} className="text-muted-foreground" />
        </button>
      </motion.div>

      {/* ── Calendar grid ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Time gutter + grid */}
        <div className="flex flex-1 overflow-hidden">

          {/* Scrollable area */}
          <div ref={scrollRef} className="flex flex-1 overflow-y-auto overflow-x-hidden">

            {/* Time labels column */}
            <div className="w-14 shrink-0 relative">
              {/* Header spacer */}
              <div className="h-12 border-b border-border" />
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="relative"
                  style={{ height: CELL_HEIGHT }}
                >
                  {h > 0 && (
                    <span className="absolute -top-2.5 right-2 text-[11px] text-muted-foreground select-none">
                      {formatHour(h)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={format(days[0], "yyyy-MM-dd")}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="flex flex-1 min-w-0"
              >
                {days.map((day, colIdx) => {
                  const isCurrentDay = isToday(day);
                  const isLast = colIdx === days.length - 1;

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex flex-col flex-1 min-w-0 border-r border-border",
                        isLast && "border-r-0",
                        isCurrentDay && "bg-primary/2"
                      )}
                    >
                      {/* Day header */}
                      <div className="h-12 flex flex-col items-center justify-center border-b border-border shrink-0 sticky top-0 bg-background z-10">
                        <span
                          className={cn(
                            "text-xl font-semibold leading-none",
                            isCurrentDay ? "text-primary" : "text-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] uppercase tracking-wide mt-0.5",
                            isCurrentDay ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {format(day, "EEEE")}
                        </span>
                      </div>

                      {/* Hour cells */}
                      <div className="relative flex-1">
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                            style={{ height: CELL_HEIGHT }}
                          >
                            {/* Half-hour divider */}
                            <div
                              className="border-b border-border/20 absolute w-full"
                              style={{ top: CELL_HEIGHT / 2 }}
                            />
                          </div>
                        ))}

                        {/* Current time indicator — only on today's column */}
                        {isCurrentDay && todayInView && (
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
                            className="absolute left-0 right-0 z-20 pointer-events-none"
                            style={{ top: nowTop }}
                          >
                            {/* Line */}
                            <div className="h-[2px] bg-destructive w-full" />
                            {/* Dot */}
                            <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-destructive" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <JoinMeetingModal open={showJoinModal} onClose={() => setShowJoinModal(false)} />
      <CreateMeetingModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <MeetNowModal open={showMeetNowModal} onClose={() => setShowMeetNowModal(false)} />
    </div>
      )}
    </AnimatePresence>
  );
}
