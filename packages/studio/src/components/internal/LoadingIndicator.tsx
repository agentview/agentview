export function LoadingIndicator({ children }: { children?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="size-3 border border-muted-foreground/40 border-t-transparent rounded-full animate-spin" />
            {children && <span>{children}</span>}
        </div>
    );
}
