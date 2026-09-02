export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
    roles?: Role[];
    permissions?: string[];
}

export interface Role {
    id: number;
    name: string;
    guard_name?: string;
    is_active?: boolean;
    permissions?: Permission[];
    pivot?: Record<string, unknown>;
}

export interface Permission {
    id: number;
    name: string;
    guard_name?: string;
}

export interface NodeType {
    id: number;
    name: string;
    slug: string;
    label?: string;
    parent_type_id?: number;
    sort_order?: number;
    is_active?: boolean;
    nodes_count?: number;
}

export interface CatalogNode {
    id: number;
    catalog_node_type_id: number;
    parent_id?: number;
    name: string;
    slug: string;
    description?: string;
    meta?: Record<string, unknown>;
    sort_order?: number;
    status: 'draft' | 'published' | 'archived';
    is_locked?: boolean;
    type?: NodeType;
    node_type?: NodeType;
    parent?: CatalogNode;
    children?: CatalogNode[];
    content_blocks_count?: number;
    exams_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ContentBlock {
    id: number;
    catalog_node_id: number;
    type: string;
    title?: string;
    content?: string;
    data?: Record<string, unknown>;
    media_id?: number;
    position?: number;
    is_active?: boolean;
}

export interface Media {
    id: number;
    collection?: string;
    name: string;
    file_name: string;
    mime_type: string;
    size?: number;
    url: string;
    created_at?: string;
}

export interface Exam {
    id: number;
    catalog_node_id: number;
    title: string;
    description?: string;
    pass_percentage?: number;
    duration_minutes?: number;
    max_attempts?: number;
    status: 'draft' | 'published' | 'archived';
    node?: CatalogNode;
    catalogNode?: { id: number; name: string };
    questions?: ExamQuestion[];
    questions_count?: number;
}

export interface ExamQuestion {
    id: number;
    exam_id: number;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
    options?: string[];
    correct_answer?: string;
    correct_answers?: string[];
    points?: number;
    position?: number;
}

export interface School {
    id: number;
    name: string;
    code: string;
    type: string;
    region?: string;
    zone?: string;
    woreda?: string;
    city?: string;
    address?: string;
    phone?: string;
    email?: string;
    principal_name?: string;
    is_active?: boolean;
}

export interface DashboardStats {
    users: number;
    schools: number;
    nodes: number;
    published_nodes: number;
    exams: number;
    content_blocks: number;
    media: number;
    audit_logs?: AuditLog[];
}

export interface AuditLog {
    id: number;
    user_id?: number;
    event: string;
    auditable_type?: string;
    auditable_id?: number;
    ip_address?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    created_at?: string;
    user?: { id: number; name: string };
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}
