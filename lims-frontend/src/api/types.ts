export interface SampleRegistrationRequest {
    clientId: number;
    projectId?: number;
    projectName?: string;
    poNumber?: string;
    priority?: string;
    notes?: string;
    samples: SampleItem[];
}

export interface SampleItem {
    productId: number;
    description?: string;
    samplingPoint?: string;
    sampledBy?: string;
    sampledAt?: string; // ISO Layout
}

export interface JobDTO {
    id: number;
    jobNumber: string;
    clientName: string;
    projectId?: number;
    projectNumber?: string;
    projectName?: string;
    priority: string;
    status: string;
    createdAt: string;
}

export interface SampleDTO {
    id: number;
    sampleNumber: string;
    productName: string;
    description?: string;
    status: string;
    conditionOnReceipt: string;
    receivedAt?: string;
    dueDate?: string;
    samplingPoint?: string;
    clientName?: string;
    jobNumber?: string;
    sampledAt?: string;
}

export interface ClientDTO {
    id: number;
    name: string;
    code: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    active: boolean;
}

export interface ProductDTO {
    id: number;
    name: string;
    code: string;
    category?: string;
    samplingInstructions?: string;
    active: boolean;
}

export interface TestMethodDTO {
    id: number;
    name: string;
    code: string;
    standardRef?: string;
    resultType: 'QUANTITATIVE' | 'PASS_FAIL' | 'TEXT';
    unit?: string;
    decimalPlaces: number;
    minLimit?: number;
    maxLimit?: number;
    tatHours: number;
    active: boolean;
}

export interface ProductTestDTO {
    testMethodId: number;
    testMethodName: string;
    testMethodCode: string;
    mandatory: boolean;
    sortOrder: number;
}

export interface DashboardStats {
    unreceivedCount: number;
    inProgressCount: number;
    awaitingAuthorizationCount: number;
    authorizedTodayCount: number;
}
export interface SampleTestDTO {
    id: number;
    testMethodId: number;
    testMethodName: string;
    testMethodCode: string;
    status: string;
    sortOrder: number;
    numericValue?: number;
    textValue?: string;
    isOutOfRange: boolean;
    flagColor?: string;
    unit?: string;
    minLimit?: number;
    maxLimit?: number;
    resultType: 'QUANTITATIVE' | 'PASS_FAIL' | 'TEXT';
    testResultId?: number;
    instrumentId?: number;
    reagentLot?: string;
}

export interface ResultEntryRequest {
    sampleTestId: number;
    numericValue?: number;
    textValue?: string;
    instrumentId?: number;
    reagentLot?: string;
}

export interface ResultReviewRequest {
    testResultId: number;
    action: 'AUTHORIZE' | 'REJECT';
    comment?: string;
}

// --- Batch 4: Admin, Inventory, Instruments ---

export interface UserDTO {
    id: number;
    username: string;
    displayName: string;
    email?: string;
    active: boolean;
    roles: string[];
    lastLoginAt?: string;
}

export interface CreateUserRequest {
    username: string;
    password: string;
    displayName: string;
    email?: string;
    roles?: string[];
}

export interface UpdateUserRequest {
    displayName?: string;
    email?: string;
    roles?: string[];
    active?: boolean;
}

export interface InventoryItemDTO {
    id: number;
    name: string;
    code: string;
    category: string;
    lotNumber?: string;
    supplier?: string;
    quantity: number;
    unit: string;
    reorderLevel: number;
    expiryDate?: string;
    storageLocation?: string;
    active: boolean;
    expiringSoon: boolean;
    lowStock: boolean;
}

export interface CreateInventoryItemRequest {
    name: string;
    code: string;
    category?: string;
    lotNumber?: string;
    supplier?: string;
    quantity?: number;
    unit?: string;
    reorderLevel?: number;
    expiryDate?: string;
    storageLocation?: string;
}

export interface InstrumentDTO {
    id: number;
    name: string;
    serialNumber: string;
    model?: string;
    manufacturer?: string;
    location?: string;
    status: string;
    calibrationDueDate?: string;
    lastCalibratedAt?: string;
    calibratedBy?: string;
    active: boolean;
    calibrationOverdue: boolean;
}

export interface CreateInstrumentRequest {
    name: string;
    serialNumber: string;
    model?: string;
    manufacturer?: string;
    location?: string;
    status?: string;
    calibrationDueDate?: string;
    lastCalibratedAt?: string;
    calibratedBy?: string;
}

export interface NotificationDTO {
    id: number;
    title: string;
    message: string;
    type: 'INFO' | 'ALERT' | 'OOS' | 'SUCCESS';
    read: boolean;
    createdAt: string;
}

export interface AuditHistoryDTO {
    revisionNumber: number;
    revisionTimestamp: string;
    username: string;
    action?: string;
    entityData: any;
}

export interface AttachmentDTO {
    id: number;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: string;
}
