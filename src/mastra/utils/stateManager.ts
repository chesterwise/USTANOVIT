import { db } from '../../../shared/db';
import { userStates } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export interface UserState {
  userId: string;
  state: string | null;
  action: string | null;
  tempData: string | null;
}

export async function getUserState(userId: string): Promise<UserState | null> {
  const result = await db.select().from(userStates).where(eq(userStates.userId, userId));
  if (result.length > 0) {
    return {
      userId: result[0].userId!,
      state: result[0].state,
      action: result[0].action,
      tempData: result[0].tempData,
    };
  }
  return null;
}

export async function setUserState(
  userId: string,
  state: string | null,
  action: string | null = null,
  tempData: any = null
): Promise<void> {
  const existing = await getUserState(userId);
  const tempDataStr = tempData ? JSON.stringify(tempData) : null;

  if (existing) {
    await db
      .update(userStates)
      .set({
        state,
        action,
        tempData: tempDataStr,
        updatedAt: new Date(),
      })
      .where(eq(userStates.userId, userId));
  } else {
    await db.insert(userStates).values({
      userId,
      state,
      action,
      tempData: tempDataStr,
    });
  }
}

export async function clearUserState(userId: string): Promise<void> {
  await setUserState(userId, null, null, null);
}

export async function getTempData(userId: string): Promise<any> {
  const state = await getUserState(userId);
  if (state && state.tempData) {
    try {
      return JSON.parse(state.tempData);
    } catch {
      return null;
    }
  }
  return null;
}
