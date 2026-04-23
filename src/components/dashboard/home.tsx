"use client";

import { motion } from "framer-motion";
import { Video, MessageSquare, Calendar, Users, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const quickActions = [
  { icon: Video, label: "New meeting", description: "Start instantly" },
  { icon: MessageSquare, label: "New message", description: "Chat with team" },
  { icon: Calendar, label: "Schedule meeting", description: "Pick a time" },
  { icon: Users, label: "Invite people", description: "Grow your team" },
];

const upcomingMeetings = [
  { title: "Weekly standup", time: "10:00 AM", duration: "30 min", attendees: ["A", "B", "C"] },
  { title: "Product review", time: "2:00 PM", duration: "1 hour", attendees: ["D", "E"] },
  { title: "Design sync", time: "4:30 PM", duration: "45 min", attendees: ["F", "G", "H"] },
];

const recentActivity = [
  { user: "Sarah K.", action: "shared a file in", target: "#design", time: "2m ago" },
  { user: "Mike R.", action: "started a meeting in", target: "#engineering", time: "15m ago" },
  { user: "Lisa T.", action: "mentioned you in", target: "#general", time: "1h ago" },
  { user: "James W.", action: "scheduled a meeting:", target: "Product Review", time: "2h ago" },
];

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

export function DashboardHome() {
  const { data: session } = useSession();
  const name = session?.user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">

          {/* Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl font-semibold text-foreground">{greeting}, {name} 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your team today.</p>
          </motion.div>

          {/* Quick actions */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <button key={action.label}
                  className="group flex flex-col items-start gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all hover:-translate-y-0.5"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <action.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Upcoming meetings */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s meetings</h2>
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.title}
                    className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group cursor-pointer"
                  >
                    <div className="w-1 h-10 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{meeting.time} · {meeting.duration}</span>
                      </div>
                    </div>
                    <div className="flex -space-x-1.5">
                      {meeting.attendees.map((a) => (
                        <Avatar key={a} className="w-6 h-6 border-2 border-card">
                          <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">{a}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Button size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity">Join</Button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent activity */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent activity</h2>
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">{item.user[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{item.user}</span>{" "}
                        {item.action}{" "}
                        <span className="font-medium text-primary">{item.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
