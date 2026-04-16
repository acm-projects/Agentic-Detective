import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type { Placement } from '@floating-ui/react';

interface TooltipRenderProps<T extends HTMLElement = HTMLElement> {
  ref: (node: T | null) => void;
  getReferenceProps: (userProps?: Record<string, unknown>) => Record<string, unknown>;
}

interface TooltipProps<T extends HTMLElement = HTMLElement> {
  content: ReactNode;
  children: (props: TooltipRenderProps<T>) => ReactNode;
  className?: string;
  placement?: Placement;
  offsetPx?: number;
}

export function Tooltip<T extends HTMLElement = HTMLElement>({
  content,
  children,
  className,
  placement = 'bottom',
  offsetPx = 0,
}: TooltipProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetPx),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 2 }),
    ],
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    role,
  ]);

  return (
    <>
      {children({
        ref: refs.setReference as (node: T | null) => void,
        getReferenceProps: (userProps?: Record<string, unknown>) => getReferenceProps(userProps),
      })}

      <FloatingPortal>
        {isOpen && (
          <div className={className} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}
