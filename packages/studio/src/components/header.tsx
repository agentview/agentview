import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { SidebarTrigger } from "./ui/sidebar";

interface HeaderProps {
  children: ReactNode;
  className?: string;
  trigger?: boolean;
}

export function Header({ children, className = "", trigger = true }: HeaderProps) {
const triggerEl = trigger ? <SidebarTrigger className="-mr-3 block md:hidden"/> : null;

  return (
    <div className={cn('py-3 px-6 border-b flex items-center justify-between min-h-[56px]', className)}>

      { triggerEl && <div>
        {
          children
        }
        { triggerEl }
      </div>}

      { !triggerEl && children }
    </div>
  );
}

interface HeaderTitleProps {
  title: string;
  subtitle?: string;
}

export function HeaderTitle({ title, subtitle }: HeaderTitleProps) {
  return (
    <>
      <div className="flex items-center gap-1 justify-between">
        <div>
        <h1 className="text-lg font-medium leading-none">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}

        </div>

      </div>
    </>
  );
}
