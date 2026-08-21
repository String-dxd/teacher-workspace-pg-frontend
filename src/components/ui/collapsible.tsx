import * as React from 'react';

import { cn } from '~/lib/utils';

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Collapsible({
  open: _open = false,
  onOpenChange: _onOpenChange,
  children,
  className,
  ...props
}: CollapsibleProps) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

interface CollapsiblePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  keepMounted?: boolean;
}

function CollapsiblePanel({
  children,
  className,
  keepMounted: _keepMounted,
  ...props
}: CollapsiblePanelProps) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export { Collapsible, CollapsiblePanel };
