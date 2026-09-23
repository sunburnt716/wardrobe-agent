/**
 * SEAM. The Add flow: what the model read from the photo, the chips the user
 * can correct, the water-resistant toggle, and commit.
 *
 * The camera capture + detection service is not built (Feature 3, "work
 * together"). This serves the single post-detection state the mock shows.
 */
import { useCallback, useState } from 'react';
import { MOCK_DETECTED } from './mock';
import type { DetectedGarment } from './types';

export interface AddGarmentData {
  detected: DetectedGarment;
  waterResistant: boolean;
  setWaterResistant: (v: boolean) => void;
  commit: () => void;
  retake: () => void;
  status: 'capturing' | 'detected' | 'committing' | 'error';
}

export function useAddGarment(): AddGarmentData {
  // TODO(backend/native): expo-camera (or RN vision-camera) capture ->
  //   the classification service -> DetectedGarment.
  const [waterResistant, setWaterResistant] = useState(
    MOCK_DETECTED.waterResistant,
  );

  const commit = useCallback(() => {
    // TODO(backend): Mutation.createGarment({ input: { ...corrected chips,
    //   waterResistant, photoKey } })
    console.log('[stub] commit garment', { waterResistant });
  }, [waterResistant]);

  const retake = useCallback(() => {
    // TODO(native): reopen the camera viewfinder.
    console.log('[stub] retake');
  }, []);

  return {
    detected: MOCK_DETECTED,
    waterResistant,
    setWaterResistant,
    commit,
    retake,
    status: 'detected',
  };
}
