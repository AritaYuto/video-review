import { signToken } from "@/server/lib/token";
import { Role } from "@/lib/role";
import { LoginRequest, LoginResponse } from "@/lib/auth-types"
import { v4 as uuidv4 } from 'uuid';

export async function loginAsGuest(c: LoginRequest): Promise<LoginResponse> {
    let role: Role = 'guest';
    let tokenPayload: Record<string, any> = {
        id: uuidv4(), displayName: c.displayName, role
    };

    let token: string | undefined = undefined;
    try{
        token = await signToken(tokenPayload);
    } catch(e){
        throw e;
    }

    return {
        token,
        role,
        displayName: c.displayName,
        id: tokenPayload.id,
    }
};