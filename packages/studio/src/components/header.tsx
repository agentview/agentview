import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { SidebarTrigger } from "./ui/sidebar";

interface HeaderProps {
  children: ReactNode;
  className?: string;
}

export function Header({ children, className = "" }: HeaderProps) {
  return (
    <div className={cn('py-3 px-6 border-b flex items-center justify-between min-h-[56px]', className)}>
      <div>
        {children}
      </div>
      <SidebarTrigger className="-mr-3 block md:hidden"/>
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
