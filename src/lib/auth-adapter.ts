import { Adapter } from "next-auth/adapters";
import { pool } from "./db";

export const pgAdapter: Adapter = {
    async createUser(user) {
        const client = await pool.connect()
        try{
            const result = await client.query(`INSERT INTO users (email, role, role_selected) VALUES ($1, $2, $3) RETURNING id, email, role, role_selected`, [user.email, user.role || 'buyer', user.role_selected || false])
            
            const createdUser = result.rows[0]

            await client.query(`INSERT INTO profiles (user_id, full_name, avatar_url) VALUES ($1, $2, $3)`, [createdUser.id, user.name, user.image])

            if (user.role === 'master'){
                await client.query(`INSERT INTO masters (user_id) VALUES ($1)`, [createdUser.id])
            }

            return {...createdUser, name: user.name, image: user.image, emailVerified: null}
        } finally {
            client.release()
        }
    },

    async getUser(id){
        const client = await pool.connect()
        try{
            const result = await client.query(`SELECT u.id, u.email, u.role, u.role_selected, p.full_name as name, p.avatar_url as image FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1`, [id])
            const user = result.rows[0]
            if (user) {
                user.emailVerified = null
            }
            return user || null
        } finally {
            client.release()
        }
    },

    async getUserByEmail(email){
        const client = await pool.connect()
        try{
            const result = await client.query(`SELECT u.id, u.email, u.role, u.role_selected, p.full_name as name, p.avatar_url as image FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.email = $1`, [email])
            const user = result.rows[0]
            if (user) {
                user.emailVerified = null
            }
            return user || null
        } finally {
            client.release()
        }
    },

    async getUserByAccount({provider, providerAccountId}) {
        const client = await pool.connect()
        try{
            const result = await client.query(`SELECT u.* FROM users u JOIN accounts a ON u.id = a.user_id WHERE a.provider = $1 AND a.provider_account_id = $2`, [provider, providerAccountId])
            return result.rows[0] || null
        }finally{
            client.release()
        }
    },

    async updateUser(user) {
        const client = await pool.connect()
        try{
            const updates: string[] = []
            const values: any[] = []
            let paramCount = 1

            if (user.name){
                updates.push(`name = $${paramCount++}`)
                values.push(user.name)

                await client.query(`UPDATE profiles SET full_name = $1 WHERE user_id = $2`, [user.name, user.id])
            }
            if (user.email){
                updates.push(`email = $${paramCount++}`)
                values.push(user.email)
            }
            if (user.image){
                updates.push(`image = ${paramCount++}`)
                values.push(user.image)
            }
            if (user.role !== undefined){
                updates.push(`role = $${paramCount++}`)
                values.push(user.role)
            }
            if (user.role_selected !== undefined){
                updates.push(`role_selected = $${paramCount++}`)
                values.push(user.role_selected)
            }

            values.push(user.id)
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ${paramCount} RETURNING *`

            const result = await client.query(query, values)
            return result.rows[0]
        }finally{
            client.release()
        }
    },

    async deleteUser(userId){
        const client = await pool.connect()
        try{
            await client.query('DELETE FROM users WHERE  id = $1', [userId])
        }finally{
            client.release()
        }
    },

    async linkAccount(account){
        const client = await pool.connect()
        try{
            const result = await client.query(`INSERT INTO accounts (user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, [account.userId, account.type, account.provider, account.providerAccountId, account.refresh_token, account.access_token, account.expires_at, account.token_type, account.scope, account.id_token, account.session_state])
            return result.rows[0]
        }finally{
            client.release()
        }
    },

    async unlinkAccount({provider, providerAccountId}){
        const client = await pool.connect()
        try{
            await client.query(`DELETE FROM accounts WHERE provider = $1 AND provider_account_id = $2`, [provider, providerAccountId])
        }finally{
            client.release()
        }
    },

    async createSession(session){
        const client = await pool.connect()
        try{
            const result = await client.query(`INSERT INTO sessions (session_token, user_id, expires) VALUES($1, $2, $3) RETURNING *`, [session.sessionToken, session.userId, session.expires])
            return result.rows[0]
        }finally{
            await client.release()
        }
    },

    async getSessionAndUser(sessionToken) {
        const client = await pool.connect()
        try{
            const sessionResult = await client.query(`SELECT * FROM sessions WHERE session_token = $1`, [sessionToken])

            if (!sessionResult.rows[0]) return null

            const userResult = await client.query(`SELECT * FROM users WHERE id = $1`, [sessionResult.rows[0].user_id])

            if (!userResult.rows[0]) return null

            return { session: sessionResult.rows[0], user: userResult.rows[0]}
        }finally{
            await client.release()
        }
    },

    async updateSession(session) {
        const client = await pool.connect()
        try{
            const result = await client.query(`UPDATE sessions SET expires = $1, updated_at = NOW() WHERE session_token = $2 RETURNING *`, [session.expires, session.sessionToken])
            return result.rows[0] || null
        }finally{
            client.release()
        }
    },

    async deleteSession(sessionToken) {
        const client = await pool.connect()
        try{
            await client.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken])
        }finally{
            client.release()
        }
    },

    async createVerificationToken(token) {
        const client = await pool.connect()
        try{
            const result = await client.query(`INSERT INTO verification_tokens (identifier, token, expires) VALUES ($1, $2, $3) RETURNING *`, [token.identifier, token.token, token.expires])
            return result.rows[0]
        }finally{
            client.release()
        }
    },

    async useVerificationToken({identifier, token}){
        const client = await pool.connect()
        try{
            const result = await client.query(`DELETE FROM verification_tokens WHERE identifier = $1 AND token = $2 RETURNING *`, [identifier, token])
            return result.rows[0] || null
        }finally{
            client.release()
        }
    }
}