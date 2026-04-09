import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl: {
    //     rejectUnauthorized: false
    // }
})

export const db = {
    async getUserById(id: string) {
        if (!id || typeof id !== 'string') return null;

        let client;
        try {
            client = await pool.connect();
            
            const result = await client.query(`SELECT u.id, u.email, u.password_hash as password, u.role, u.role_selected, u.is_banned, u.created_at, u.updated_at, p.full_name as name, p.phone, p.city, p.address, p.avatar_url, p.newsletter_agreement, p.sms_code, p.sms_code_expires,  m.description, m.is_verified, m.is_partner, m.rating, m.total_sales FROM users u LEFT JOIN profiles p ON u.id = p.user_id LEFT JOIN masters m ON u.id = m.user_id WHERE u.id = $1`,[id]);
            
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error in getUserById:', error);
            throw error;
        } finally {
            if (client) client.release();
        }
    },
    async getUserByEmail(email: string){
        const client = await pool.connect()
        try{
            const result = await client.query(`SELECT u.id, u.email, u.password_hash as password, u.role, u.role_selected, u.is_banned, u.created_at, u.updated_at, p.full_name as name, p.phone, p.city, p.sms_code, p.sms_code_expires, m.is_verified as master_verified, m.is_partner as master_partner FROM users u LEFT JOIN profiles p ON u.id = p.user_id LEFT JOIN masters m ON u.id = m.user_id WHERE u.email = $1`, [email])
            return result.rows[0] || null
        } finally {
            client.release()
        }
    },
    async createUser(userData: {fullName: string, email: string, password: string, phone: string, city: string, role: string, newsletterAgreement: boolean}) {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const userResult = await client.query(`INSERT INTO users (email, password_hash, role)  VALUES ($1, $2, $3) RETURNING id, email, role, created_at`, [userData.email, userData.password, userData.role])
        
            const user = userResult.rows[0]
            
            if (!user) {
                throw new Error('Не удалось создать пользователя')
            }

            console.log("User created in DB:", user.id)

            await client.query(`INSERT INTO profiles ( user_id, full_name, phone, city, newsletter_agreement, sms_code, sms_code_expires) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [user.id, userData.fullName, userData.phone, userData.city, userData.newsletterAgreement, '1111', new Date(Date.now() + 24 * 60 * 60 * 1000)])

            if (userData.role === 'master') {
                await client.query( `INSERT INTO masters (user_id) VALUES ($1)`, [user.id])
            }

            await client.query('COMMIT')
            
            return {...user, fullName: userData.fullName, phone: userData.phone, city: userData.city}
        } catch(error) {
            await client.query('ROLLBACK')
            console.error('Error in createUser:', error)
            throw error
        } finally {
            client.release()
        }
    },
    async updateUserRole(userId: string, roleData: {role: string, phone?: string, city?: string, newsletterAgreement?: boolean}){
        const client = await pool.connect()
        try{
            await client.query(`BEGIN`)

            const updates: string[] = ['role = $1', 'role_selected = true']
            const values: any[] = [roleData.role]
            let paramCount = 2

            if (roleData.phone){
                updates.push(`phone = $${paramCount++}`)
                values.push(roleData.phone)
            }
            if (roleData.city){
                updates.push(`city = $${paramCount++}`)
                values.push(roleData.city)
            }
            if (roleData.newsletterAgreement !== undefined){
                updates.push(`newsletterAgreement = $${paramCount++}`)
                values.push(roleData.newsletterAgreement)
            }

            values.push(userId)

            await client.query( `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`, values)

            if (roleData.phone){
                await client.query(`UPDATE profiles SET phone = $1 WHERE user_id = $2`, [roleData.phone, userId])
            }

            if (roleData.role === 'master'){
                await client.query(`INSERT INTO masters (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId])
            }

            await client.query('COMMIT')
        }catch(error){
            await client.query('ROLLBACK')
        }finally{
            client.release()
        }
    },

    async getDashBoardStats() {
        const client = await pool.connect()
        try{
            const usersCount = await client.query(`SELECT COUNT(*) as count FROM users WHERE role != 'admin'`)
            const mastersCount = await client.query(`SELECT COUNT(*) as count FROM masters WHERE is_verified = true`)
            const productsCount = await client.query(`SELECT COUNT(*) as count FROM products WHERE status = 'active'`)
            const ordersCount = await client.query(`SELECT COUNT(*) as count FROM orders`)
            const pendingMasters = await client.query(`SELECT COUNT(*) as count FROM masters WHERE is_verified = false`)
            const pendingProducts = await client.query(`SELECT COUNT(*) as count FROM products WHERE status = 'moderation'`)

            const recentUsers = await client.query(`SELECT u.id, u.role, u.created_at, p.full_name as name FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.role != 'admin' ORDER BY u.created_at DESC LIMIT 5`)
            const recentOrders = await client.query(`SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, COALESCE(p.full_name, u.email) as buyer_name FROM orders o JOIN users u ON o.buyer_id = u.id LEFT JOIN profiles p ON u.id = p.user_id ORDER BY o.created_at DESC LIMIT 5`)
            
            return {totalUsers: parseInt(usersCount.rows[0]?.count || '0'), totalMasters: parseInt(mastersCount.rows[0]?.count || '0'), totalProducts: parseInt(productsCount.rows[0]?.count || '0'), totalOrders: parseInt(ordersCount.rows[0]?.count || '0'),  pendingModeration: {masters: parseInt(pendingMasters.rows[0]?.count || '0'), products: parseInt(pendingProducts.rows[0]?.count || '0')}, recentUsers: recentUsers.rows || [], recentOrders: recentOrders.rows || []}
        }catch(error){
            throw error
        }finally{
            client.release()
        }
    },

    async getUsers(page = 1, limit = 10, filters: any = {}) {
        const client = await pool.connect()
        try {
            let query = `SELECT u.id, u.email, u.role, u.created_at, u.is_banned, p.full_name as name, p.phone, p.city, p.avatar_url,  COALESCE(m.is_verified, false) as master_verified, COALESCE(m.is_partner, false) as master_partner FROM users u LEFT JOIN profiles p ON u.id = p.user_id LEFT JOIN masters m ON u.id = m.user_id WHERE 1=1`

            const values: any[] = []
            let paramCount = 1

            if (filters.role && filters.role !== 'all') {
                query += ` AND u.role = $${paramCount++}`
                values.push(filters.role)
            }

            if (filters.search && filters.search.trim()) {
                query += ` AND (p.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR p.phone ILIKE $${paramCount})`
                values.push(`%${filters.search}%`)
                paramCount++
            }
            let countQuery = `SELECT COUNT(*) as total FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE 1=1`
            
            const countValues: any[] = []
            let countParamCount = 1

            if (filters.role && filters.role !== 'all') {
                countQuery += ` AND u.role = $${countParamCount++}`
                countValues.push(filters.role)
            }

            if (filters.search && filters.search.trim()) {
                countQuery += ` AND (p.full_name ILIKE $${countParamCount} OR u.email ILIKE $${countParamCount} OR p.phone ILIKE $${countParamCount})`
                countValues.push(`%${filters.search}%`)
                countParamCount++
            }

            const countResult = await client.query(countQuery, countValues)
            const total = parseInt(countResult.rows[0]?.total || '0')

            query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
            values.push(limit, (page - 1) * limit)

            const result = await client.query(query, values)

            return {users: result.rows, total: total, page: page, totalPages: Math.ceil(total / limit)}
        } catch (error) {
            console.error('Error in getUsers:', error)
            throw error
        } finally {
            client.release()
        }
    },

    async updateUserStatus (userId: string, updates: {is_verified?: boolean, is_partner?: boolean, is_banned?: boolean, ban_reason?: string}){
        const client = await pool.connect()

        try{
            await client.query(`BEGIN`)

            const userUpdates: string[] = []
            const values: any[] = []
            let paramCount = 1

            if(updates.is_verified !== undefined){
                userUpdates.push(`is_verified = $${paramCount++}`)
                values.push(updates.is_verified)
            }

            if (updates.is_partner !== undefined){
                userUpdates.push(`is_partner = $${paramCount++}`)
                values.push(updates.is_partner)
            }

            if (updates.is_banned !== undefined){
                userUpdates.push(`is_banned = $${paramCount++}`)
                values.push(updates.is_banned)
            }

            if (updates.is_banned){
                userUpdates.push(`banned_at = NOW()`)
                if (updates.ban_reason){
                    userUpdates.push(`ban_reason = $${paramCount++}`)
                    values.push(updates.ban_reason)
                }
            }else{
                userUpdates.push(`banned_at = NULL, ban_reason = NULL`)
            }

            values.push(userId)

            if (userUpdates.length > 0){
                await client.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramCount}`, values)
            }

            if (updates.is_verified !== undefined || updates.is_partner !== undefined){
                const masterUpdates: string[] = []
                const masterValues: any[] = []
                let masterParamCount = 1

                if(updates.is_verified !== undefined){
                    masterUpdates.push(`is_verified = $${masterParamCount++}`)
                    masterValues.push(updates.is_verified)
                }

                if (updates.is_partner !== undefined){
                    masterUpdates.push(`is_partner = $${masterParamCount++}`)
                    masterValues.push(updates.is_partner)
                }

                masterValues.push(userId)

                await client.query(`UPDATE masters SET ${masterUpdates.join(', ')} WHERE user_id = $${masterParamCount}`, masterValues)
            }

            await client.query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)`, [userId, 'USER_STATUS_UPDATE', 'user', userId, JSON.stringify(updates)])

            await client.query('COMMIT')
        }catch (error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    },

    async getYarnCatalog(){
        const client = await pool.connect()

        try{
            const result = await client.query(`SELECT * FROM yarn_catalog ORDER BY created_at DESC`)
            return result.rows
        }finally{
            client.release()
        }
    },

    async addYarn(yarnData: {name: string, article: string, brand?: string, color?: string, composition?: string, weight?: number, length?: number, price?: number, in_stock?: boolean, stock_quantity?: number, image_url?:number, description?: string}){
        const client = await pool.connect()

        try{
            const result = await client.query(`INSERT INTO yarn_catalog (name, article, brand, color, composition, weight, length, price, in_stock, stock_quantity, image_url, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`, [yarnData.name, yarnData.article, yarnData.brand, yarnData.color, yarnData.composition, yarnData.weight, yarnData.length, yarnData.price, yarnData.in_stock ?? true, yarnData.stock_quantity ?? 0, yarnData.image_url, yarnData.description])
            return result.rows[0]
        }finally{
            client.release()
        }
    },

    async updateYarn(id: string, yarnData: any){
        const client = await pool.connect()
        try{
            const updates: string[] = []
            const values: any[] = []
            let paramCount = 1

            Object.entries(yarnData).forEach(([key, value])=>{
                if (value !== undefined){
                    updates.push(`${key} = $${paramCount++}`)
                    values.push(value)
                }
            })

            values.push(id)

            const result = await client.query(`UPDATE yarn_catalog SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`, values)

            return result.rows[0]
        }finally{
            client.release()
        }
    },

    async deleteYarn (id: string){
        const client = await pool.connect()
        try{
            await client.query(`DELETE FROM yarn_catalog WHERE id = $1`, [id])
        }finally{
            client.release()
        }
    },

    async updateUserProfile(userId: string, data: {fullname?: string,phone?: string,city?: string,address?: string,newsletterAgreement?: boolean,avatarUrl?: string}) {
        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');

            console.log("Updating user profile:", { userId, data });

            const profileCheck = await client.query(`SELECT * FROM profiles WHERE user_id = $1`,[userId]);

            const profileUpdates: string[] = [];
            const profileValues: any[] = [];
            let paramCount = 1;

            if (data.fullname !== undefined) {
                profileUpdates.push(`full_name = $${paramCount++}`);
                profileValues.push(data.fullname);
            }
            if (data.phone !== undefined) {
                profileUpdates.push(`phone = $${paramCount++}`);
                profileValues.push(data.phone);
            }
            if (data.city !== undefined) {
                profileUpdates.push(`city = $${paramCount++}`);
                profileValues.push(data.city);
            }
            if (data.address !== undefined) {
                profileUpdates.push(`address = $${paramCount++}`);
                profileValues.push(data.address);
            }
            if (data.newsletterAgreement !== undefined) {
                profileUpdates.push(`newsletter_agreement = $${paramCount++}`);
                profileValues.push(data.newsletterAgreement);
            }
            if (data.avatarUrl !== undefined) {
                profileUpdates.push(`avatar_url = $${paramCount++}`);
                profileValues.push(data.avatarUrl);
            }

            if (profileUpdates.length > 0) {
                profileValues.push(userId);
                
                if (profileCheck.rows.length === 0) {
                    await client.query(`INSERT INTO profiles (user_id, full_name, phone, city, address, newsletter_agreement, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [ userId, data.fullname || '', data.phone || '', data.city || '', data.address || '', data.avatarUrl || null]);
                } else {
                    await client.query(`UPDATE profiles SET ${profileUpdates.join(', ')} WHERE user_id = $${paramCount}`,profileValues);
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            if (client) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
    },
    async getPendingMasters() {
        const client = await pool.connect()
        try {
            const result = await client.query(`SELECT u.id, u.email, u.role, u.created_at, p.full_name as name, p.phone, p.city, p.avatar_url, m.description, m.is_verified, m.is_partner, m.rating, COALESCE(m.total_sales, 0) as products_count FROM users u LEFT JOIN profiles p ON u.id = p.user_id LEFT JOIN masters m ON u.id = m.user_id WHERE u.role = 'master' ORDER BY u.created_at DESC`)
            const masters = result.rows.map(row => ({id: row.id, user_id: row.id, name: row.name || row.email, email: row.email,  phone: row.phone || '', city: row.city || '', description: row.description || '', is_verified: row.is_verified || false, is_partner: row.is_partner || false, created_at: row.created_at, products_count: parseInt(row.products_count) || 0, rating: parseFloat(row.rating) || 0, full_name: row.name || '', avatar_url: row.avatar_url || ''}))
            
            return masters
        } catch (error) {
            console.error('DB: Error in getPendingMasters:', error)
            throw error
        } finally {
            client.release()
        }
    },
    async updateMasterVerification(userId: string, isVerified: boolean, banReason?: string | null) {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            await client.query(`UPDATE masters SET is_verified = $1, updated_at = NOW() WHERE user_id = $2`, [isVerified, userId])
            
            if (banReason) {await client.query(`UPDATE users SET ban_reason = $1 WHERE id = $2`, [banReason, userId])}
            
            await client.query('COMMIT')
            
            return true
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    },
}

export {pool}