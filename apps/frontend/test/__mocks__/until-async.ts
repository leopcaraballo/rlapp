export type UntilResult<RejectionReason, ResolveData> =
  | [reason: RejectionReason, data: null]
  | [reason: null, data: ResolveData];

export async function until<RejectionReason = Error, ResolveData = unknown>(
  callback: () => Promise<ResolveData>,
): Promise<UntilResult<RejectionReason, ResolveData>> {
  try {
    const data = await callback();
    return [null, data];
  } catch (error) {
    return [error as RejectionReason, null];
  }
}
