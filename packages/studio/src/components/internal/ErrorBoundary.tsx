import React from "react";

export class ErrorBoundary extends React.Component<
  { fallback?: React.ReactNode; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="text-sm text-red-500 font-mono whitespace-pre-wrap">
          <div>Error: {this.state.error?.message}</div>
          <div>{this.state.error?.stack}</div>
        </div>
      );
    }
    // No try/catch needed here—React will route render errors to this boundary.
    return this.props.children;
  }
}