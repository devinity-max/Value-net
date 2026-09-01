import { useEffect, useState } from 'react';
import { Fruit } from '../types';
import { subscribeFruits } from '../utils/fruitsApi';

/** Live-updating fruit catalog. Drop-in replacement for the old `BLOX_FRUITS_DATA` static import:
 * `const fruits = useFruits();` gives you the same `Fruit[]`, but it now reflects real admin edits. */
export function useFruits(): Fruit[] {
  const [fruits, setFruits] = useState<Fruit[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeFruits(setFruits);
    return unsubscribe;
  }, []);

  return fruits;
}
