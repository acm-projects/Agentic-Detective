import { useState } from "react";

interface CaesarCipherData {
  plain: string;
  shift: number;
  clues: string[];
}

interface Props {
  data: CaesarCipherData;
  onSuccess: () => void;
  onFailure: () => void;
}

export function CipherMinigame() {
  return (
    <div>
      <p></p>
    </div>
  );
}