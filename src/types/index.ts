import { Request } from 'express'

// Extend express request to include authenticated user
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string
        shopId: string
        role: 'owner' | 'admin' | 'cashier'
    }
}

export type Role = 'owner' | 'admin' | 'cashier' 