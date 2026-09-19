import { Role } from "@/lib/role";

export type LoginType = "guest" | "jira" | "user";

export interface LoginRequest {
    displayName: string;
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    id: string;
    email?: string;
    displayName: string;
    role: Role
}