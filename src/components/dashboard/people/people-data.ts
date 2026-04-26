export type ContactStatus = "Available" | "Away" | "Busy" | "Offline";

export type Contact = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatar?: string;
  status: ContactStatus;
  email?: string;
  phone?: string;
  isMe?: boolean;
};

export const myProfile: Contact = {
  id: "me",
  name: "Hemal Katariya",
  initials: "HK",
  avatarColor: "bg-primary/20 text-primary",
  status: "Available",
  isMe: true,
};

export const contacts: Contact[] = [
  {
    id: "1",
    name: "Abhishek Joshi",
    initials: "AJ",
    avatarColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    status: "Away",
    email: "abhishek.mohidev@gmail.com",
  },
  {
    id: "2",
    name: "Archi Solanki",
    initials: "AS",
    avatarColor: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    status: "Available",
    email: "mekanism.hr@gmail.com",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    id: "3",
    name: "Dharmajsinh Dabhi",
    initials: "DD",
    avatarColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    status: "Away",
  },
  {
    id: "4",
    name: "Hanee Gajjar",
    initials: "HG",
    avatarColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    status: "Available",
    email: "hr.mekanism@gmail.com",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
  },
  {
    id: "5",
    name: "Jay U.",
    initials: "JU",
    avatarColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    status: "Busy",
  },
  {
    id: "6",
    name: "Kunal Fauzdar",
    initials: "KF",
    avatarColor: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    status: "Away",
    email: "kunal.jsdev@gmail.com",
  },
  {
    id: "7",
    name: "Maulik Parmar",
    initials: "MP",
    avatarColor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    status: "Away",
  },
  {
    id: "8",
    name: "Nandini Upadhyay",
    initials: "NU",
    avatarColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    status: "Offline",
  },
  {
    id: "9",
    name: "Rakshit Tanti",
    initials: "RT",
    avatarColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    status: "Available",
    email: "rakshittanti@live.in",
    avatar: "https://randomuser.me/api/portraits/men/46.jpg",
  },
  {
    id: "10",
    name: "Shubhangee Patil",
    initials: "SP",
    avatarColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    status: "Away",
    email: "jobs.mekanism@gmail.com",
  },
];

export const statusConfig: Record<
  ContactStatus,
  { label: string; dotClass: string }
> = {
  Available: { label: "Available", dotClass: "bg-green-500" },
  Away:      { label: "Away",      dotClass: "bg-yellow-400" },
  Busy:      { label: "Busy",      dotClass: "bg-red-500" },
  Offline:   { label: "Offline",   dotClass: "bg-zinc-400" },
};

/** Tailwind class for the status dot — used by PeopleAvatar */
export const statusColor: Record<ContactStatus, string> = {
  Available: "bg-green-500",
  Away:      "bg-yellow-400",
  Busy:      "bg-red-500",
  Offline:   "bg-zinc-400",
};
