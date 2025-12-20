export type Role = "guest" | "viewer" | "admin";

export function isGuest(role: Role): boolean {
    return role === "guest";
}   

export function isViewer(role: Role): boolean {
    return role === "viewer";
}   

export function isAdmin(role: Role): boolean {
    return role === "admin";
}   