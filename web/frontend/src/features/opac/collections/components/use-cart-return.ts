import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface CartReturnState {
  cartFrom?: string;
  openCart?: boolean;
}

export function cartReturnState(state: unknown): CartReturnState | null {
  return (state as CartReturnState | null) ?? null;
}

export function useCartOverlay(): [boolean, (open: boolean) => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(
    Boolean(cartReturnState(location.state)?.openCart),
  );

  useEffect(() => {
    if (!cartReturnState(location.state)?.openCart) return;
    setOpen(true);
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [location, navigate]);

  return [open, setOpen];
}
