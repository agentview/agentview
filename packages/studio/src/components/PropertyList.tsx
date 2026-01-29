import React from 'react';
import { cn } from '../lib/utils';

interface PropertyListProps {
  children: React.ReactNode;
  className?: string;
}

interface PropertyListItemProps {
  children: React.ReactNode;
  className?: string;
}

interface PropertyListTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface PropertyListTextValueProps {
  children: React.ReactNode;
  className?: string;
  isMonospace?: boolean;
  isMuted?: boolean;
}

const PropertyList: React.FC<PropertyListProps> = ({ children, className }) => {
  return (
    <div className={cn("grid grid-cols-1 gap-2.5", className)}>
      {children}
    </div>
  );
};

const PropertyListItem: React.FC<PropertyListItemProps> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-row gap-2", className)}>
      {children}
    </div>
  );
};

const PropertyListTitle: React.FC<PropertyListTitleProps> = ({ 
  children, 
  className,
}) => {
  return (
    <span className={cn("text-sm text-neutral-600 w-[160px] flex-shrink-0 truncate", className)}>
      {children}
    </span>
  );
};

const PropertyListTextValue: React.FC<PropertyListTextValueProps> = ({ 
  children, 
  className,
  isMonospace = false,
  isMuted = false
}) => {
  return (
    <span className={cn(
      "text-sm",
      isMonospace && "font-mono",
      isMuted && "text-neutral-400",
      className
    )}>
      {children}
    </span>
  );
};

export { PropertyList, PropertyListItem, PropertyListTitle, PropertyListTextValue };
