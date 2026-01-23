import { Role } from "@/lib/role";

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