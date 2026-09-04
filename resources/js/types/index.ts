export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
    school_id?: number | null;
    school?: { id: number; name: string; code?: string } | null;
    avatar?: string | null;
    avatar_url?: string | null;
    roles?: Role[];
    permissions?: string[];
}

export interface Role {
    id: number;
    name: string;
    guard_name?: string;
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
    academic_year_month?: number | null;
    academic_year_day?: number | null;
}

export interface Enrollment {
    id: number;
    user_id: number;
    school_id: number;
    catalog_node_id: number;
    academic_year: string;
    status: 'active' | 'passed' | 'failed';
    started_at?: string | null;
    ended_at?: string | null;
    user?: { id: number; name: string; email: string };
    school?: { id: number; name: string };
    grade?: { id: number; name: string };
}

export interface RegisterStudentResult {
    student: { id: number; name: string; email: string; grade?: string; academic_year?: string };
    user: { id: number; name: string; email: string; grade?: string; academic_year?: string };
    credentials: { username: string; password: string };
    username: string;
    password: string;
    school: { id: number; name: string };
    grade: { id: number; name: string };
    academic_year: string;
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

export interface ChapterExamProgress {
    id: number;
    title: string;
    percentage: number;
    passed: boolean;
    attempted: boolean;
}

export interface ChapterProgress {
    id: number;
    name: string;
    read_percent: number;
    listen_percent: number;
    activity_percent: number;
    exam: ChapterExamProgress | null;
}

export interface BookProgress {
    id: number;
    name: string;
    category?: string | null;
    grade?: string | null;
    read_percent: number;
    listen_percent: number;
    exam_percent: number | null;
    chapters: ChapterProgress[];
}

export interface MostReadChapter {
    chapter_name: string;
    book_name: string;
    percent: number;
}

export interface ProgressReport {
    overall_read: number;
    overall_understand: number;
    most_read_chapter: MostReadChapter | null;
    books: BookProgress[];
}

export interface ChildSummary {
    overall_read: number;
    overall_understand: number;
    most_read_chapter: MostReadChapter | null;
    books_count: number;
}

export interface Child {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
    parent_name?: string | null;
    linked_at?: string | null;
    summary: ChildSummary;
}
