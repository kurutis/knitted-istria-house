export interface MasterClass {
    id: string
    title: string
    description: string
    type: 'online' | 'offline'
    price: number
    max_participants: number
    current_participants: number
    date_time: string
    duration_minutes: number
    location: string
    online_link: string
    materials: string
    image_url: string
    master_id: string
    master_name: string
    master_avatar: string
    status: string
    is_registered?: boolean
    registrations?: Array<{
        id: string;
        user_id: string;
        status: string;
        created_at: string;
        user?: {
            name: string;
            email: string;
        };
    }>
}