import { useEffect, useState } from 'react';
import { auth } from '@/lib/api';

/** Only the bursar changes fees. Others get the same screens to look at. The server enforces this. */
export function useCanEditFees() {
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    auth.me().then(u => setCanEdit(u.role === 'bursary')).catch(() => {});
  }, []);
  return canEdit;
}
