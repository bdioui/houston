declare const grist: {
    ready: (options?: { requiredAccess?: string }) => void
    onRecords: (callback: (records: unknown[]) => void) => void
    onRecord: (callback: (record: unknown) => void) => void
    getTable: (tableId: string) => unknown
    getAccessToken: (options?: { readOnly?: boolean }) => Promise<{ token: string; baseUrl: string; docId: string }>
    docApi: {
        fetchTable: (tableId: string) => Promise<Record<string, unknown[]>>
        applyUserActions: (actions: unknown[]) => Promise<unknown>
    }
}