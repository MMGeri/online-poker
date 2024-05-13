
export function getErrorMessage(error: any): string {
    let err = error.error?.message?.[0]?.message ?? error.error.message ?? error.error ?? error;
    return err;
}