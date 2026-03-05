import { pool } from "./db"

export interface User {
    id: string
    name: string
    email: string
    phone?: string
    city?: string
    role: 'buyer' | 'master' | 'admin'
    role_selected: boolean
    newsletter_agreement: boolean
    email_veirfied?: Date
    image?: string
    created_at: Date
    upload_at: Date 
}

export async function getUserById(id: string): Promise <User | null> {
    const client = await pool.connect()
    try{
        const result = await client.query(`SELECT * FROM users WHERE id = $1`, [id])
        return result.rows[0] || null
    }finally{
        client.release()
    }
}

export async function updateUserProfile(userId:string, updates: Partial<User>): Promise<User | null> {
    const client = await pool.connect()
    try{
        const updateFields = Object.keys(updates).map((key, index)=>`${key} = ${index + 1}`).join(', ')
        const values = Object.values(updates)
        values.push(userId)

        const query = `UPDATE users SET ${updateFields}, updated_at = NOW() WHERE id = $${values} RETURNING *`
        const result = await client.query(query, values)
        return result.rows[0] || null
    }finally{
        client.release()
    }
}