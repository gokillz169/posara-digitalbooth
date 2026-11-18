import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kendala saat memuat tampilan POSARA.'
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('POSARA ErrorBoundary caught an error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f9f9ff] text-[#001632] flex items-center justify-center p-6 font-body">
          <div className="max-w-md w-full bg-white rounded-3xl border border-[#e2e8f0] shadow-xl p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#fee2e2] text-red-700 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[28px]">error_outline</span>
            </div>
            <h1 className="font-headline text-[20px] font-black text-[#001632]">
              Ups! Halaman Perlu Dimuat Ulang
            </h1>
            <p className="text-[13px] text-[#516070] mt-2 leading-relaxed">
              Aplikasi mengalami gangguan sementara. Silakan muat ulang halaman untuk melanjutkan sesi photobooth kamu.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full py-3 rounded-2xl bg-[#142b4a] hover:bg-[#001632] text-white text-[13px] font-bold shadow-md cursor-pointer active:scale-95 transition-all"
            >
              Muat Ulang POSARA
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
