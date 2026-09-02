import { useState, useEffect } from 'react';
import { Fruit } from '../types';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { subscribeFruits } from '../utils/fruitsApi';

export function useFruits(): Fruit[] {
  const [fruits, setFruits] = useState<Fruit[]>(BLOX_FRUITS_DATA);

  useEffect(() => {
    const unsub = subscribeFruits((updated) => {
      if (updated && updated.length > 0) {
        setFruits(updated);
      }
    });
    return () => unsub();
  }, []);

  return fruits;
}
