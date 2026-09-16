export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const DEMO_USERS: User[] = [
  {
    id: "usr_9982",
    name: "Alex Rivera",
    email: "alex@tunnelscope.io",
    role: "SecOps Lead",
  },
  {
    id: "usr_4410",
    name: "Devon Vance",
    email: "devon@tunnelscope.io",
    role: "Network Architect",
  },
];

export const DEFAULT_USER: User = DEMO_USERS[0];
