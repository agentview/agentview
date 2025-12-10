import { useCallback, useState } from "react";

export function useRerender() {
  const [, setState] = useState({});
  return useCallback(() => setState({}), []);
}

