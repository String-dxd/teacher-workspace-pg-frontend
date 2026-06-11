import * as React from 'react';

import { cn } from '~/lib/utils';

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => (
    <div ref={ref} role="radiogroup" className={cn('grid gap-2', className)} {...props}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<RadioGroupItemProps>, {
              _groupValue: value,
              _onGroupChange: onValueChange,
            })
          : child,
      )}
    </div>
  ),
);
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  _groupValue?: string;
  _onGroupChange?: (value: string) => void;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, _groupValue, _onGroupChange, ...props }, ref) => (
    <input
      type="radio"
      ref={ref}
      value={value}
      checked={_groupValue === value}
      onChange={() => _onGroupChange?.(value)}
      className={cn('h-4 w-4', className)}
      {...props}
    />
  ),
);
RadioGroupItem.displayName = 'RadioGroupItem';
export { RadioGroup, RadioGroupItem };
