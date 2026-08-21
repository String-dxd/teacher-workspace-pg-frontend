import * as React from 'react';

import { cn } from '~/lib/utils';

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div ref={ref} role="radiogroup" className={cn('grid gap-2', className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  ),
);
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    return (
      <input
        type="radio"
        ref={ref}
        value={value}
        checked={ctx.value === value}
        onChange={() => ctx.onValueChange?.(value)}
        className={cn('h-4 w-4', className)}
        {...props}
      />
    );
  },
);
RadioGroupItem.displayName = 'RadioGroupItem';
export { RadioGroup, RadioGroupItem };
